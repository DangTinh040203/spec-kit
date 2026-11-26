import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module.js';
import { TodoModule } from './todo/todo.module.js';

@Module({
  imports: [SharedModule, TodoModule],
})
export class AppModule {}
