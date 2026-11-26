import { Module } from '@nestjs/common';
import { PrismaService } from './infrastructure/prisma.service.js';
import { RedisService } from './infrastructure/redis.service.js';

@Module({
  providers: [PrismaService, RedisService],
  exports: [PrismaService, RedisService],
})
export class SharedModule {}
