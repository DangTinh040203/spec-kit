import type { Page, Todo, TodoListQuery, TodoStatus } from './todo.entity.js';

export interface CreateTodoData {
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TodoStatus;
}

/** Only the keys present are changed; `null` clears description or due date. */
export interface TodoDetailsChanges {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
}

/**
 * Persistence contract for todos (data-model.md). Methods take and return domain types only;
 * `null` / `false` means "not found".
 *
 * Position rules every implementation MUST keep (FR-024 to FR-027):
 * - positions in a status are dense, 0 = top: 0, 1, 2, ... with no gaps or duplicates;
 * - `create` inserts at 0 of its status and shifts the others down;
 * - `moveTo` takes the todo out of its place, then inserts it at `min(index, count)` of the
 *   target status; the other todos keep their relative order;
 * - `delete` closes the gap it leaves;
 * - all of the above are atomic, and overlapping calls must not break these rules.
 */
export abstract class TodoRepository {
  abstract create(data: CreateTodoData): Promise<Todo>;
  abstract findById(id: string): Promise<Todo | null>;
  abstract findPage(query: TodoListQuery): Promise<Page<Todo>>;
  abstract updateDetails(id: string, changes: TodoDetailsChanges): Promise<Todo | null>;
  abstract moveTo(id: string, status: TodoStatus, index: number): Promise<Todo | null>;
  abstract delete(id: string): Promise<boolean>;
}
