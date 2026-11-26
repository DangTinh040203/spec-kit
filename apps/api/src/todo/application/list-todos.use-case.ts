import type { Page, Todo, TodoListQuery } from '../domain/todo.entity.js';
import type { TodoRepository } from '../domain/todo.repository.js';

export type ListTodosInput = Partial<TodoListQuery>;

/** FR-013 to FR-018, with the spec's defaults. */
export class ListTodosUseCase {
  constructor(private readonly todos: TodoRepository) {}

  async execute(input: ListTodosInput): Promise<Page<Todo>> {
    return this.todos.findPage({
      status: input.status ?? 'all',
      sort: input.sort ?? 'createdAt',
      order: input.order ?? 'desc',
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });
  }
}
