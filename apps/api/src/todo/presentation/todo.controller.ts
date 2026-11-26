import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ChangeTodoStatusUseCase } from '../application/change-todo-status.use-case.js';
import { CreateTodoUseCase } from '../application/create-todo.use-case.js';
import { DeleteTodoUseCase } from '../application/delete-todo.use-case.js';
import { GetTodoUseCase } from '../application/get-todo.use-case.js';
import { ListTodosUseCase } from '../application/list-todos.use-case.js';
import { MoveTodoUseCase } from '../application/move-todo.use-case.js';
import { UpdateTodoUseCase } from '../application/update-todo.use-case.js';
import { ChangeTodoStatusDto } from './change-todo-status.dto.js';
import { CreateTodoDto } from './create-todo.dto.js';
import { ListTodosQueryDto } from './list-todos-query.dto.js';
import { MoveTodoDto } from './move-todo.dto.js';
import {
  toTodoPageResponse,
  toTodoResponse,
  type TodoPageResponseDto,
  type TodoResponseDto,
} from './todo-response.dto.js';
import { UpdateTodoDto } from './update-todo.dto.js';

/**
 * Maps HTTP ↔ use cases only (Principle I). `:id` is a plain string so malformed ids reach the
 * use case and become 404, not 400 (FR-021).
 */
@Controller('todos')
export class TodoController {
  constructor(
    private readonly createTodo: CreateTodoUseCase,
    private readonly getTodo: GetTodoUseCase,
    private readonly listTodos: ListTodosUseCase,
    private readonly updateTodo: UpdateTodoUseCase,
    private readonly changeTodoStatus: ChangeTodoStatusUseCase,
    private readonly moveTodo: MoveTodoUseCase,
    private readonly deleteTodo: DeleteTodoUseCase,
  ) {}

  @Post()
  async create(@Body() body: CreateTodoDto): Promise<TodoResponseDto> {
    return toTodoResponse(await this.createTodo.execute(body));
  }

  @Get()
  async list(@Query() query: ListTodosQueryDto): Promise<TodoPageResponseDto> {
    return toTodoPageResponse(await this.listTodos.execute(query));
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<TodoResponseDto> {
    return toTodoResponse(await this.getTodo.execute(id));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateTodoDto): Promise<TodoResponseDto> {
    return toTodoResponse(await this.updateTodo.execute(id, body));
  }

  @Put(':id/status')
  async changeStatus(@Param('id') id: string, @Body() body: ChangeTodoStatusDto): Promise<TodoResponseDto> {
    return toTodoResponse(await this.changeTodoStatus.execute(id, body.status));
  }

  @Post(':id/move')
  @HttpCode(200)
  async move(@Param('id') id: string, @Body() body: MoveTodoDto): Promise<TodoResponseDto> {
    return toTodoResponse(await this.moveTodo.execute(id, body.status, body.position));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteTodo.execute(id);
  }
}
