import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';

/** Result of a cache read: `ok: false` means Redis failed, which is different from a missing key. */
export type CacheRead = { ok: true; value: string | null } | { ok: false };

const COMMAND_TIMEOUT_MS = 200;

/**
 * Thin Redis wrapper for the read cache (research.md R12). It never throws to callers:
 * every failure is logged and reported as `{ ok: false }`, `false`, or `null`.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    // Fail fast while disconnected instead of queueing commands.
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 1000,
      reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
    },
  });

  onModuleInit(): void {
    this.client.on('error', (error: Error) => this.logger.warn(`Redis error: ${error.message}`));
    // Do not block startup: the API works without Redis.
    this.client.connect().catch((error: Error) => {
      this.logger.warn(`Redis not connected yet: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.close().catch(() => undefined);
    }
  }

  async get(key: string): Promise<CacheRead> {
    const value = await this.run(() => this.client.get(key));
    return value === FAILED ? { ok: false } : { ok: true, value };
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.run(() =>
      this.client.set(key, value, { expiration: { type: 'EX', value: ttlSeconds } }),
    );
    return result !== FAILED;
  }

  /** Returns the new value, or `null` if the command failed. */
  async incr(key: string): Promise<number | null> {
    const result = await this.run(() => this.client.incr(key));
    return result === FAILED ? null : result;
  }

  private async run<T>(command: () => Promise<T>): Promise<T | typeof FAILED> {
    if (!this.client.isReady) {
      return FAILED;
    }
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<typeof FAILED>((resolve) => {
        timer = setTimeout(() => resolve(FAILED), COMMAND_TIMEOUT_MS);
      });
      const result = await Promise.race([command(), timeout]);
      if (result === FAILED) {
        this.logger.warn('Redis command timed out');
      }
      return result;
    } catch (error) {
      this.logger.warn(`Redis command failed: ${(error as Error).message}`);
      return FAILED;
    } finally {
      clearTimeout(timer);
    }
  }
}

const FAILED = Symbol('redis-failed');
