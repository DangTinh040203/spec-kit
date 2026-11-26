import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { GraphemeLength } from '../../shared/presentation/grapheme-length.validator.js';
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from '../domain/todo.entity.js';
import { DUE_DATE_FORMAT, DUE_DATE_MESSAGE, trim } from './create-todo.dto.js';

/** Every field optional; null clears description or dueDate; "" for dueDate is rejected. */
export class UpdateTodoDto {
  // Not @IsOptional: that would also let `null` through for the required title.
  @ValidateIf((dto: UpdateTodoDto) => dto.title !== undefined)
  @Transform(trim)
  @IsString({ message: 'must be a string' })
  @GraphemeLength(1, TITLE_MAX_LENGTH, { message: `must be 1–${TITLE_MAX_LENGTH} characters after trimming` })
  title?: string;

  @IsOptional()
  @IsString({ message: 'must be a string or null' })
  @GraphemeLength(0, DESCRIPTION_MAX_LENGTH, { message: `must be at most ${DESCRIPTION_MAX_LENGTH} characters` })
  description?: string | null;

  @IsOptional()
  @Matches(DUE_DATE_FORMAT, { message: DUE_DATE_MESSAGE })
  @IsISO8601({ strict: true }, { message: DUE_DATE_MESSAGE })
  dueDate?: string | null;
}
