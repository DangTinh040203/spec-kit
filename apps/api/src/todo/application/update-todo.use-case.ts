import { Todo } from '../domain/todo.entity.js';
import { TodoNotFoundError } from '../domain/todo-not-found.error.js';
import type { TodoDetailsChanges, TodoRepository } from '../domain/todo.repository.js';
import { TodoValidationError } from '../domain/todo-validation.error.js';

export type UpdateTodoInput = TodoDetailsChanges;

/** FR-010: only the fields sent change; null (or "" for description) clears a field. */
export class UpdateTodoUseCase {
  constructor(private readonly todos: TodoRepository) {}

  async execute(id: string, input: UpdateTodoInput): Promise<Todo> {
    if (!Todo.isValidId(id)) {
      throw new TodoNotFoundError(id);
    }
    const changes: TodoDetailsChanges = {};
    if (input.title !== undefined) {
      changes.title = input.title.trim();
    }
    if (input.description !== undefined) {
      changes.description = input.description ? input.description : null;
    }
    if (input.dueDate !== undefined) {
      changes.dueDate = input.dueDate;
    }
    if (Object.keys(changes).length === 0) {
      throw new TodoValidationError([
        { field: 'body', reason: 'at least one of title, description, or dueDate is required' },
      ]);
    }
    Todo.assertValid(changes);
    const todo = await this.todos.updateDetails(id, changes);
    if (!todo) {
      throw new TodoNotFoundError(id);
    }
    return todo;
  }
}
