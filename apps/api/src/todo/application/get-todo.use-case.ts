import { Todo } from '../domain/todo.entity.js';
import { TodoNotFoundError } from '../domain/todo-not-found.error.js';
import type { TodoRepository } from '../domain/todo.repository.js';

/** FR-009, FR-021: a malformed id is "not found" without touching storage. */
export class GetTodoUseCase {
  constructor(private readonly todos: TodoRepository) {}

  async execute(id: string): Promise<Todo> {
    const todo = Todo.isValidId(id) ? await this.todos.findById(id) : null;
    if (!todo) {
      throw new TodoNotFoundError(id);
    }
    return todo;
  }
}
