import type { ValidationIssue } from '../../shared/domain/validation.error.js';
import { TodoValidationError } from './todo-validation.error.js';

export const TODO_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export const TODO_STATUS_FILTERS = ['all', 'active', ...TODO_STATUSES] as const;
export type TodoStatusFilter = (typeof TODO_STATUS_FILTERS)[number];

export const TODO_SORT_FIELDS = ['createdAt', 'dueDate', 'position'] as const;
export type TodoSortField = (typeof TODO_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const PAGE_SIZE_MAX = 100;

export interface TodoListQuery {
  status: TodoStatusFilter;
  sort: TodoSortField;
  order: SortOrder;
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function makePage<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  return { items, total, page, pageSize, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) };
}

export interface TodoProps {
  id: string;
  title: string;
  description: string | null;
  /** Calendar date `YYYY-MM-DD`, no time of day. */
  dueDate: string | null;
  status: TodoStatus;
  /** 0 = top of its status. */
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Fields a caller may set; each one present is checked by `Todo.assertValid`. */
export interface TodoFields {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: TodoStatus;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export class Todo implements TodoProps {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly dueDate: string | null;
  readonly status: TodoStatus;
  readonly position: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: TodoProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.dueDate = props.dueDate;
    this.status = props.status;
    this.position = props.position;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** Malformed ids are answered with "not found" (FR-021). */
  static isValidId(id: string): boolean {
    return UUID_PATTERN.test(id);
  }

  static isValidDueDate(value: string): boolean {
    const match = DATE_PATTERN.exec(value);
    if (!match) {
      return false;
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  /** Characters as a person reads them (grapheme clusters). */
  static characterCount(value: string): number {
    let count = 0;
    for (const _ of segmenter.segment(value)) {
      count += 1;
    }
    return count;
  }

  /** Throws `TodoValidationError` listing every failing field. Expects an already trimmed title. */
  static assertValid(fields: TodoFields): void {
    const issues: ValidationIssue[] = [];
    if (fields.title !== undefined) {
      const length = Todo.characterCount(fields.title);
      if (length < 1 || length > TITLE_MAX_LENGTH) {
        issues.push({ field: 'title', reason: `must be 1–${TITLE_MAX_LENGTH} characters after trimming` });
      }
    }
    if (fields.description !== undefined && fields.description !== null) {
      if (Todo.characterCount(fields.description) > DESCRIPTION_MAX_LENGTH) {
        issues.push({ field: 'description', reason: `must be at most ${DESCRIPTION_MAX_LENGTH} characters` });
      }
    }
    if (fields.dueDate !== undefined && fields.dueDate !== null && !Todo.isValidDueDate(fields.dueDate)) {
      issues.push({ field: 'dueDate', reason: 'must be a valid calendar date in the format YYYY-MM-DD' });
    }
    if (fields.status !== undefined && !(TODO_STATUSES as readonly string[]).includes(fields.status)) {
      issues.push({ field: 'status', reason: `must be one of: ${TODO_STATUSES.join(', ')}` });
    }
    if (issues.length > 0) {
      throw new TodoValidationError(issues);
    }
  }
}
