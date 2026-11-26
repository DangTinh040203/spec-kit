import type { Page, Todo, TodoStatus } from '../domain/todo.entity.js';

/** Contract `Todo` (contracts/openapi.yaml). */
export interface TodoResponseDto {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TodoStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/** Contract `TodoPage`. */
export interface TodoPageResponseDto {
  items: TodoResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function toTodoResponse(todo: Todo): TodoResponseDto {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    dueDate: todo.dueDate,
    status: todo.status,
    position: todo.position,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

export function toTodoPageResponse(page: Page<Todo>): TodoPageResponseDto {
  return { ...page, items: page.items.map(toTodoResponse) };
}
