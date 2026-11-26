import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { ValidationError as ClassValidatorError } from 'class-validator';
import { AppModule } from './app.module.js';
import { ValidationError, type ValidationIssue } from './shared/domain/validation.error.js';
import { HttpExceptionFilter } from './shared/presentation/http-exception.filter.js';

/** Flattens class-validator errors (including unknown fields) into one list (FR-020). */
function toIssues(errors: ClassValidatorError[], parent = ''): ValidationIssue[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      reason: message.startsWith(`property ${error.property} should not exist`) ? 'is not a known field' : message,
    }));
    return [...own, ...toIssues(error.children ?? [], field)];
  });
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new ValidationError(toIssues(errors)),
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 4000));
}

void bootstrap();
