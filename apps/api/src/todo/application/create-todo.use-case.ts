import { Todo, type TodoStatus } from '../domain/todo.entity.js';
import type { TodoRepository } from '../domain/todo.repository.js';

export interface CreateTodoInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status?: TodoStatus;
}

/** FR-005, FR-007, FR-008: new todos go to the top of their status ("to do" by default). */
export class CreateTodoUseCase {
  constructor(private readonly todos: TodoRepository) {}

  async execute(input: CreateTodoInput): Promise<Todo> {
    const data = {
      title: input.title.trim(),
      description: input.description ? input.description : null,
      dueDate: input.dueDate ?? null,
      status: input.status ?? 'todo',
    } satisfies Parameters<TodoRepository['create']>[0];
    Todo.assertValid(data);
    return this.todos.create(data);
  }
}
