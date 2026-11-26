import { Todo, type TodoStatus } from '../domain/todo.entity.js';
import { TodoNotFoundError } from '../domain/todo-not-found.error.js';
import type { TodoRepository } from '../domain/todo.repository.js';
import { TodoValidationError } from '../domain/todo-validation.error.js';

/** FR-025: status and position saved together; a position past the end goes to the bottom. */
export class MoveTodoUseCase {
  constructor(private readonly todos: TodoRepository) {}

  async execute(id: string, status: TodoStatus, position: number): Promise<Todo> {
    Todo.assertValid({ status });
    if (!Number.isInteger(position) || position < 0) {
      throw new TodoValidationError([{ field: 'position', reason: 'must be a whole number of 0 or more' }]);
    }
    const todo = Todo.isValidId(id) ? await this.todos.moveTo(id, status, position) : null;
    if (!todo) {
      throw new TodoNotFoundError(id);
    }
    return todo;
  }
}
