import { NotFoundError } from '../../shared/domain/not-found.error.js';

export class TodoNotFoundError extends NotFoundError {
  readonly todoId: string;

  constructor(todoId: string) {
    super('Todo not found.');
    this.todoId = todoId;
  }
}
