import { Module, type Provider } from '@nestjs/common';
import { PrismaService } from '../shared/infrastructure/prisma.service.js';
import { RedisService } from '../shared/infrastructure/redis.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { ChangeTodoStatusUseCase } from './application/change-todo-status.use-case.js';
import { CreateTodoUseCase } from './application/create-todo.use-case.js';
import { DeleteTodoUseCase } from './application/delete-todo.use-case.js';
import { GetTodoUseCase } from './application/get-todo.use-case.js';
import { ListTodosUseCase } from './application/list-todos.use-case.js';
import { MoveTodoUseCase } from './application/move-todo.use-case.js';
import { UpdateTodoUseCase } from './application/update-todo.use-case.js';
import { TodoRepository } from './domain/todo.repository.js';
import { CachedTodoRepository } from './infrastructure/cached-todo.repository.js';
import { PrismaTodoRepository } from './infrastructure/prisma-todo.repository.js';
import { TodoController } from './presentation/todo.controller.js';

/** Use cases carry no NestJS decorators, so each is built by a factory (Principle I). */
function useCase<T>(UseCase: new (todos: TodoRepository) => T): Provider {
  return { provide: UseCase, useFactory: (todos: TodoRepository) => new UseCase(todos), inject: [TodoRepository] };
}

/** Composition root of the todo feature. */
@Module({
  imports: [SharedModule],
  controllers: [TodoController],
  providers: [
    {
      provide: PrismaTodoRepository,
      useFactory: (prisma: PrismaService) => new PrismaTodoRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: TodoRepository,
      useFactory: (inner: PrismaTodoRepository, redis: RedisService) => new CachedTodoRepository(inner, redis),
      inject: [PrismaTodoRepository, RedisService],
    },
    useCase(CreateTodoUseCase),
    useCase(GetTodoUseCase),
    useCase(ListTodosUseCase),
    useCase(UpdateTodoUseCase),
    useCase(ChangeTodoStatusUseCase),
    useCase(MoveTodoUseCase),
    useCase(DeleteTodoUseCase),
  ],
})
export class TodoModule {}
