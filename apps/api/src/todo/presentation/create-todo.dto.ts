import { Transform } from 'class-transformer';
import { IsIn, IsISO8601, IsOptional, IsString, Matches } from 'class-validator';
import { GraphemeLength } from '../../shared/presentation/grapheme-length.validator.js';
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  TODO_STATUSES,
  type TodoStatus,
} from '../domain/todo.entity.js';

export const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const DUE_DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
export const DUE_DATE_MESSAGE = 'must be a valid calendar date in the format YYYY-MM-DD';

export class CreateTodoDto {
  @Transform(trim)
  @IsString({ message: 'must be a string' })
  @GraphemeLength(1, TITLE_MAX_LENGTH, { message: `must be 1–${TITLE_MAX_LENGTH} characters after trimming` })
  title!: string;

  @IsOptional()
  @IsString({ message: 'must be a string or null' })
  @GraphemeLength(0, DESCRIPTION_MAX_LENGTH, { message: `must be at most ${DESCRIPTION_MAX_LENGTH} characters` })
  description?: string | null;

  @IsOptional()
  @Matches(DUE_DATE_FORMAT, { message: DUE_DATE_MESSAGE })
  @IsISO8601({ strict: true }, { message: DUE_DATE_MESSAGE })
  dueDate?: string | null;

  @IsOptional()
  @IsIn(TODO_STATUSES, { message: `must be one of: ${TODO_STATUSES.join(', ')}` })
  status?: TodoStatus;
}
