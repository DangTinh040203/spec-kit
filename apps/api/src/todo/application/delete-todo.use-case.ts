import { Todo } from '../domain/todo.entity.js';
import { TodoNotFoundError } from '../domain/todo-not-found.error.js';
import type { TodoRepository } from '../domain/todo.repository.js';

/** FR-012: permanent delete; the todos below it close the gap. */
export class DeleteTodoUseCase {
  constructor(private readonly todos: TodoRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = Todo.isValidId(id) ? await this.todos.delete(id) : false;
    if (!deleted) {
      throw new TodoNotFoundError(id);
    }
  }
}
