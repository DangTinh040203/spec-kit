import { IsIn } from 'class-validator';
import { TODO_STATUSES, type TodoStatus } from '../domain/todo.entity.js';

export class ChangeTodoStatusDto {
  @IsIn(TODO_STATUSES, { message: `must be one of: ${TODO_STATUSES.join(', ')}` })
  status!: TodoStatus;
}
