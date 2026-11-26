import { Todo, type TodoStatus } from '../domain/todo.entity.js';
import { TodoNotFoundError } from '../domain/todo-not-found.error.js';
import type { TodoRepository } from '../domain/todo.repository.js';

/**
 * FR-011: a new status places the todo at the top of that status; the same status changes
 * nothing (no write, update timestamp unchanged).
 */
export class ChangeTodoStatusUseCase {
  constructor(private readonly todos: TodoRepository) {}

  async execute(id: string, status: TodoStatus): Promise<Todo> {
    Todo.assertValid({ status });
    const current = Todo.isValidId(id) ? await this.todos.findById(id) : null;
    if (!current) {
      throw new TodoNotFoundError(id);
    }
    if (current.status === status) {
      return current;
    }
    const moved = await this.todos.moveTo(id, status, 0);
    if (!moved) {
      throw new TodoNotFoundError(id);
    }
    return moved;
  }
}
