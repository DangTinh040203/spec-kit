import type { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { makePage, type Page, type Todo, type TodoListQuery, type TodoStatus } from '../domain/todo.entity.js';
import {
  type CreateTodoData,
  type TodoDetailsChanges,
  TodoRepository,
} from '../domain/todo.repository.js';
import { TodoMapper } from './todo.mapper.js';

type Tx = Prisma.TransactionClient;

/**
 * Serialises every transaction that changes positions, so overlapping requests cannot leave
 * duplicate or missing positions (FR-027, research.md R7). Released automatically at commit.
 */
const POSITION_LOCK_KEY = 1_001_001;

export class PrismaTodoRepository extends TodoRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateTodoData): Promise<Todo> {
    return this.prisma.$transaction(async (tx) => {
      await lockPositions(tx);
      await shiftDown(tx, data.status, 0);
      const row = await tx.todo.create({
        data: {
          title: data.title,
          description: data.description,
          dueDate: TodoMapper.dueDateToPersistence(data.dueDate),
          status: data.status,
          position: 0,
        },
      });
      return TodoMapper.toDomain(row);
    });
  }

  async findById(id: string): Promise<Todo | null> {
    const row = await this.prisma.todo.findUnique({ where: { id } });
    return row ? TodoMapper.toDomain(row) : null;
  }

  async findPage(query: TodoListQuery): Promise<Page<Todo>> {
    const where = statusWhere(query.status);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.todo.count({ where }),
      this.prisma.todo.findMany({
        where,
        orderBy: orderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return makePage(rows.map(TodoMapper.toDomain), total, query.page, query.pageSize);
  }

  async updateDetails(id: string, changes: TodoDetailsChanges): Promise<Todo | null> {
    const data: Prisma.TodoUpdateManyMutationInput = {};
    if (changes.title !== undefined) data.title = changes.title;
    if (changes.description !== undefined) data.description = changes.description;
    if (changes.dueDate !== undefined) data.dueDate = TodoMapper.dueDateToPersistence(changes.dueDate);

    const { count } = await this.prisma.todo.updateMany({ where: { id }, data });
    return count === 0 ? null : this.findById(id);
  }

  async moveTo(id: string, status: TodoStatus, index: number): Promise<Todo | null> {
    return this.prisma.$transaction(async (tx) => {
      await lockPositions(tx);
      const current = await tx.todo.findUnique({ where: { id } });
      if (!current) {
        return null;
      }
      // Take it out of its place, then open a gap at the (clamped) target index.
      await shiftUp(tx, current.status, current.position, id);
      const others = await tx.todo.count({ where: { status, id: { not: id } } });
      const target = Math.min(index, others);
      await shiftDown(tx, status, target, id);
      const row = await tx.todo.update({ where: { id }, data: { status, position: target } });
      return TodoMapper.toDomain(row);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await lockPositions(tx);
      const current = await tx.todo.findUnique({ where: { id } });
      if (!current) {
        return false;
      }
      await tx.todo.delete({ where: { id } });
      await shiftUp(tx, current.status, current.position, id);
      return true;
    });
  }
}

async function lockPositions(tx: Tx): Promise<void> {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(${POSITION_LOCK_KEY}::bigint)`;
}

/**
 * Raw SQL on purpose: shifting neighbours is not a change to those todos, so it must not touch
 * their `updatedAt` (Prisma's @updatedAt would).
 */
async function shiftDown(tx: Tx, status: TodoStatus, fromPosition: number, exceptId?: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE "Todo" SET "position" = "position" + 1
    WHERE "status" = ${status}::"TodoStatus" AND "position" >= ${fromPosition}
      AND "id" <> ${exceptId ?? '00000000-0000-0000-0000-000000000000'}::uuid`;
}

async function shiftUp(tx: Tx, status: TodoStatus, abovePosition: number, exceptId: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE "Todo" SET "position" = "position" - 1
    WHERE "status" = ${status}::"TodoStatus" AND "position" > ${abovePosition}
      AND "id" <> ${exceptId}::uuid`;
}

function statusWhere(status: TodoListQuery['status']): Prisma.TodoWhereInput {
  if (status === 'all') return {};
  if (status === 'active') return { status: { in: ['todo', 'in_progress'] } };
  return { status };
}

function orderBy(query: TodoListQuery): Prisma.TodoOrderByWithRelationInput[] {
  switch (query.sort) {
    case 'position':
      // Enum order in PostgreSQL is todo, in_progress, done.
      return [{ status: 'asc' }, { position: 'asc' }];
    case 'dueDate':
      return [
        { dueDate: { sort: query.order, nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'asc' },
      ];
    case 'createdAt':
      return [{ createdAt: query.order }, { id: 'asc' }];
  }
}
