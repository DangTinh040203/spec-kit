import type { Todo as PrismaTodo } from '../../generated/prisma/client.js';
import { Todo } from '../domain/todo.entity.js';

/** Prisma model ↔ domain entity. Due dates are converted in UTC to avoid off-by-one-day shifts. */
export const TodoMapper = {
  toDomain(row: PrismaTodo): Todo {
    return new Todo({
      id: row.id,
      title: row.title,
      description: row.description,
      dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
      status: row.status,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  dueDateToPersistence(dueDate: string | null): Date | null {
    return dueDate === null ? null : new Date(`${dueDate}T00:00:00.000Z`);
  },
};
