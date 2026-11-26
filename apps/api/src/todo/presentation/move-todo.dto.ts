import { IsIn, IsInt, Min } from 'class-validator';
import { TODO_STATUSES, type TodoStatus } from '../domain/todo.entity.js';

export class MoveTodoDto {
  @IsIn(TODO_STATUSES, { message: `must be one of: ${TODO_STATUSES.join(', ')}` })
  status!: TodoStatus;

  @IsInt({ message: 'must be a whole number' })
  @Min(0, { message: 'must be 0 or more' })
  position!: number;
}
