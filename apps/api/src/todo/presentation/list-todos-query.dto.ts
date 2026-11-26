import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  PAGE_SIZE_MAX,
  SORT_ORDERS,
  type SortOrder,
  TODO_SORT_FIELDS,
  TODO_STATUS_FILTERS,
  type TodoSortField,
  type TodoStatusFilter,
} from '../domain/todo.entity.js';

export class ListTodosQueryDto {
  @IsOptional()
  @IsIn(TODO_STATUS_FILTERS, { message: `must be one of: ${TODO_STATUS_FILTERS.join(', ')}` })
  status?: TodoStatusFilter;

  @IsOptional()
  @IsIn(TODO_SORT_FIELDS, { message: `must be one of: ${TODO_SORT_FIELDS.join(', ')}` })
  sort?: TodoSortField;

  @IsOptional()
  @IsIn(SORT_ORDERS, { message: `must be one of: ${SORT_ORDERS.join(', ')}` })
  order?: SortOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'must be a whole number' })
  @Min(1, { message: 'must be 1 or more' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'must be a whole number' })
  @Min(1, { message: `must be between 1 and ${PAGE_SIZE_MAX}` })
  @Max(PAGE_SIZE_MAX, { message: `must be between 1 and ${PAGE_SIZE_MAX}` })
  pageSize?: number;
}
