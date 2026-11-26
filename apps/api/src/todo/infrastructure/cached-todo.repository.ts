import { Logger } from '@nestjs/common';
import type { RedisService } from '../../shared/infrastructure/redis.service.js';
import { type Page, Todo, type TodoListQuery, type TodoProps, type TodoStatus } from '../domain/todo.entity.js';
import {
  type CreateTodoData,
  type TodoDetailsChanges,
  TodoRepository,
} from '../domain/todo.repository.js';

const VERSION_KEY = 'todos:version';
const TTL_SECONDS = 60;

type SerializedTodo = Omit<TodoProps, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string };

/**
 * Decorator that caches reads in Redis and delegates everything to the wrapped repository
 * (research.md R12). Every successful write increments `todos:version`, so older keys are never
 * read again.
 *
 * Stale-read guard (constitution Principle I: a cache failure MUST NOT change a result): if a
 * version bump fails, or the version cannot be read, the cache is skipped. The cache becomes
 * trusted again only after an `INCR` succeeds; it also starts untrusted at boot, so keys left
 * from before a missed bump are never served after a restart. Single API instance assumed.
 */
export class CachedTodoRepository extends TodoRepository {
  private readonly logger = new Logger(CachedTodoRepository.name);
  private untrusted = true;

  constructor(
    private readonly inner: TodoRepository,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async create(data: CreateTodoData): Promise<Todo> {
    const todo = await this.inner.create(data);
    await this.bumpVersion();
    return todo;
  }

  async findById(id: string): Promise<Todo | null> {
    const version = await this.currentVersion();
    if (version === null) {
      return this.inner.findById(id);
    }
    const key = `todo:v${version}:${id}`;
    const cached = await this.redis.get(key);
    if (cached.ok && cached.value !== null) {
      return deserializeTodo(JSON.parse(cached.value) as SerializedTodo);
    }
    const todo = await this.inner.findById(id);
    if (todo && cached.ok) {
      await this.redis.set(key, JSON.stringify(todo), TTL_SECONDS);
    }
    return todo;
  }

  async findPage(query: TodoListQuery): Promise<Page<Todo>> {
    const version = await this.currentVersion();
    if (version === null) {
      return this.inner.findPage(query);
    }
    const key = `todos:v${version}:${query.status}:${query.sort}:${query.order}:${query.page}:${query.pageSize}`;
    const cached = await this.redis.get(key);
    if (cached.ok && cached.value !== null) {
      const page = JSON.parse(cached.value) as Page<SerializedTodo>;
      return { ...page, items: page.items.map(deserializeTodo) };
    }
    const page = await this.inner.findPage(query);
    if (cached.ok) {
      await this.redis.set(key, JSON.stringify(page), TTL_SECONDS);
    }
    return page;
  }

  async updateDetails(id: string, changes: TodoDetailsChanges): Promise<Todo | null> {
    const todo = await this.inner.updateDetails(id, changes);
    if (todo) await this.bumpVersion();
    return todo;
  }

  async moveTo(id: string, status: TodoStatus, index: number): Promise<Todo | null> {
    const todo = await this.inner.moveTo(id, status, index);
    if (todo) await this.bumpVersion();
    return todo;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.inner.delete(id);
    if (deleted) await this.bumpVersion();
    return deleted;
  }

  /** The version to read with, or `null` to skip the cache for this read. */
  private async currentVersion(): Promise<number | null> {
    if (this.untrusted) {
      // Only a successful INCR proves no older key can be read again.
      const bumped = await this.redis.incr(VERSION_KEY);
      if (bumped === null) {
        return null;
      }
      this.untrusted = false;
      this.logger.log('Redis cache trusted again');
      return bumped;
    }
    const read = await this.redis.get(VERSION_KEY);
    if (!read.ok) {
      return null; // A failed read is not "version 0".
    }
    const version = read.value === null ? 0 : Number(read.value);
    return Number.isInteger(version) ? version : null;
  }

  private async bumpVersion(): Promise<void> {
    const bumped = await this.redis.incr(VERSION_KEY);
    if (bumped === null && !this.untrusted) {
      this.untrusted = true;
      this.logger.warn('Cache version bump failed; skipping the cache until Redis recovers');
    }
  }
}

function deserializeTodo(value: SerializedTodo): Todo {
  return new Todo({ ...value, createdAt: new Date(value.createdAt), updatedAt: new Date(value.updatedAt) });
}
