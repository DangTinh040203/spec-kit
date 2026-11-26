# Implementation Plan: Todo Backend API

**Branch**: `001-todo-backend-api` | **Date**: 2026-11-26 (re-planned) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-todo-backend-api/spec.md`, plus the user's
stack: Turborepo monorepo with a frontend and a backend app; frontend Next.js + Tailwind CSS +
shadcn/ui + Framer Motion; backend NestJS + Prisma + PostgreSQL + Redis.

## Summary

A REST API for a single person's todos: create, get, list (filter / sort / page), update details,
change status, move to a position, and delete. Todos have three statuses (`todo`,
`in_progress`, `done`) and a dense position within each status, so the kanban board in feature
002 can use this API without backend changes.

Technical approach: a Turborepo + pnpm monorepo; this feature builds `apps/api` (NestJS, Clean
Architecture with four layers), stores data in PostgreSQL through Prisma, caches reads in Redis
through a repository decorator, validates requests with `class-validator`, and returns one error
format from a global exception filter. `apps/web` (Next.js) is created by feature 002; its stack
is recorded so the monorepo fits it. Decisions are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (strict mode) on Node.js 22 LTS or later

**Primary Dependencies**: Turborepo (root); `apps/api`: NestJS, Prisma ORM, `class-validator`,
`class-transformer`, `redis` (node-redis). Full list awaiting approval in
[research.md R10](./research.md). Frontend (feature 002): Next.js, Tailwind CSS, shadcn/ui,
Framer Motion (`motion`).

**Storage**: PostgreSQL 17 (source of truth, `apps/api/prisma/schema.prisma`); Redis as a read
cache only ([R12](./research.md)). Both run locally with the root `docker-compose.yml`.

**Testing**: None. The constitution says automated tests are not required and plans MUST NOT add
testing work unless requested. Manual validation follows [quickstart.md](./quickstart.md).

**Target Platform**: Linux server / local development machine

**Project Type**: Monorepo with a web service (`apps/api`, this feature) and a web app
(`apps/web`, feature 002)

**Performance Goals**: Single-todo operations and list pages under 1 second with up to 10,000
todos stored (SC-003); PostgreSQL alone meets this, Redis lowers repeated-read latency

**Constraints**: Single user, no authentication; positions dense per status (FR-027); every error
in one format (FR-019); no Prisma or Redis types outside infrastructure (Principle I); the API
keeps working when Redis is unavailable

**Scale/Scope**: One person, up to about 10,000 todos, 7 endpoints, 1 entity, 1 app built in this
feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
| --- | --- | --- |
| I. Clean Architecture | Four layers per module; domain + application import no `@nestjs/*`, Prisma, or Redis; `TodoRepository` is an abstract class used as the DI token; `todo.module.ts` binds it with a factory that builds `CachedTodoRepository(PrismaTodoRepository, RedisService)`, and provides each use case with `useFactory` + `inject`; controllers only map DTO ↔ use case; Prisma types stay in infrastructure via `todo.mapper.ts` | ✅ Pass |
| I. "Infrastructure is Prisma-based" | Redis cache adds a non-Prisma infrastructure component | ⚠️ Needs amendment wording ([R11](./research.md)) |
| I. Design patterns named | See [Design Patterns](#design-patterns) | ✅ Pass |
| II. Impact Analysis | See [Impact Analysis](#impact-analysis); no existing source code | ✅ Pass |
| III. File Naming | New roles `.error.ts`, `.filter.ts`, `.validator.ts`; `redis.service.ts` while `.service.ts` is reserved for Prisma; `cached-todo.repository.ts` while implementations need the `prisma-` prefix ([R11](./research.md)) | ⚠️ Needs constitution amendment before implementation |
| III. Scope | Applies to backend only; frontend rules are added in feature 002 | ✅ Pass (no frontend code in 001) |
| IV. Dependency Approval | Root + `apps/api` packages listed with reasons and alternatives in [R10](./research.md); nothing installed | ⚠️ Needs user approval before install |
| Workflow: no tests | No test tasks planned | ✅ Pass |

**Gate result**: Pass for planning. Before `/speckit-implement`:
(1) amend the constitution as listed in [R11](./research.md) (MINOR → v2.2.0) with
`/speckit-constitution`; (2) the user approves the dependency list in [R10](./research.md).
These are approvals the constitution requires, not unjustified violations.

**Post-design re-check (after Phase 1)**: Unchanged. The data model, cache keys, contract, and
file layout below add no roles, packages, or layer crossings beyond those listed.

## Design Patterns

| Pattern | Where | Why |
| --- | --- | --- |
| Repository | `TodoRepository` (domain, abstract) ↔ `PrismaTodoRepository` | Business logic does not know about Prisma |
| Decorator | `CachedTodoRepository` wraps `PrismaTodoRepository`, same contract | Adds caching without changing use cases (Open/Closed) |
| Cache-Aside | `CachedTodoRepository` reads, version-key invalidation on writes | Simple, never stale after this API's own writes |
| Use Case (Interactor) | One class per operation in `application/` | One reason to change each (SRP) |
| Data Mapper | `todo.mapper.ts` | Prisma models ↔ `Todo`, including `date` ↔ `YYYY-MM-DD` |
| Dependency Injection | NestJS container, abstract-class tokens | Inversion of control without framework code in inner layers (DIP) |
| Factory Provider | `useFactory` in `todo.module.ts` | Use cases and the decorator cannot carry `@Injectable()` |
| DTO | `presentation/*.dto.ts` | Validates HTTP input separately from the domain |
| Exception Filter (Adapter) | `http-exception.filter.ts` | One HTTP error format for domain and framework errors |

Position shifting lives in `PrismaTodoRepository` because it is bulk SQL that must run in one
transaction; the rules are stated on the domain contract, and use cases decide when each applies.

## Impact Analysis

No application source code exists yet (only Spec Kit files, README, CLAUDE.md), so no existing
function, caller, or test is affected.

| Item | Impact |
| --- | --- |
| Repository root | Becomes a Turborepo workspace: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `docker-compose.yml` |
| `README.md` | Tech stack table gains Turborepo, PostgreSQL, Redis, and the frontend stack; "Planned folder layout" moves under `apps/api/` |
| `.gitignore` (root) | Add `node_modules/`, `dist/`, `.turbo/`, `.env`, generated Prisma client |
| `.specify/memory/constitution.md` | Amendment per [R11](./research.md) |
| `specs/002-kanban-board/spec.md` | FR-001–FR-005, FR-003 (data conversion), and SC-007 are covered or made unnecessary by 001; 002 should rely on 001's status, position, and move operation |
| `specs/002-kanban-board` plan (future) | Must use `apps/web`, the stack in [R13](./research.md), port 3000, and the API on port 4000 |

## Project Structure

### Documentation (this feature)

```text
specs/001-todo-backend-api/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R13
├── data-model.md        # Phase 1: entity, positions, repository contract, cache keys
├── quickstart.md        # Phase 1: manual validation guide
├── contracts/
│   └── openapi.yaml     # Phase 1: HTTP contract
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
package.json                                 # private root, packageManager: pnpm, turbo scripts
pnpm-workspace.yaml                          # apps/*, packages/*
turbo.json                                   # build, dev, typecheck, db:generate, db:migrate
docker-compose.yml                           # PostgreSQL 17 + Redis
apps/
├── api/                                     # ← this feature
│   ├── package.json                         # name: "api"
│   ├── tsconfig.json
│   ├── .env.example                         # DATABASE_URL, REDIS_URL, PORT=4000, CORS_ORIGIN
│   ├── prisma/
│   │   └── schema.prisma                    # Todo model, TodoStatus enum, indexes
│   └── src/
│       ├── main.ts                          # bootstrap: CORS, ValidationPipe, exception filter
│       ├── app.module.ts                    # imports SharedModule, TodoModule
│       ├── shared/
│       │   ├── shared.module.ts             # provides + exports PrismaService, RedisService
│       │   ├── infrastructure/
│       │   │   ├── prisma.service.ts
│       │   │   └── redis.service.ts         # connect, get/set with timeout, incr; never throws to callers
│       │   └── presentation/
│       │       ├── http-exception.filter.ts # single error format (FR-019, FR-022)
│       │       └── grapheme-length.validator.ts
│       └── todo/
│           ├── todo.module.ts               # composition root
│           ├── domain/
│           │   ├── todo.entity.ts           # Todo, TodoStatus, invariants
│           │   ├── todo.repository.ts       # abstract class TodoRepository
│           │   ├── todo-not-found.error.ts
│           │   └── todo-validation.error.ts
│           ├── application/
│           │   ├── create-todo.use-case.ts
│           │   ├── get-todo.use-case.ts
│           │   ├── list-todos.use-case.ts
│           │   ├── update-todo.use-case.ts
│           │   ├── change-todo-status.use-case.ts
│           │   ├── move-todo.use-case.ts
│           │   └── delete-todo.use-case.ts
│           ├── infrastructure/
│           │   ├── prisma-todo.repository.ts
│           │   ├── cached-todo.repository.ts
│           │   └── todo.mapper.ts
│           └── presentation/
│               ├── todo.controller.ts
│               ├── create-todo.dto.ts
│               ├── update-todo.dto.ts
│               ├── change-todo-status.dto.ts
│               ├── move-todo.dto.ts
│               ├── list-todos-query.dto.ts
│               └── todo-response.dto.ts
└── web/                                     # feature 002: Next.js + Tailwind + shadcn/ui + Motion
packages/                                    # empty; shared packages added when needed (R1)
```

**Structure Decision**: Turborepo with `apps/api` (built here) and `apps/web` (feature 002).
Inside `apps/api/src`, one feature module (`todo`) and one shared module, each with the four
constitution layers. `main.ts` is the standard NestJS entry point with no role suffix.

## Endpoints (summary of [contracts/openapi.yaml](./contracts/openapi.yaml))

| Method | Path | Use case | Spec |
| --- | --- | --- | --- |
| `POST` | `/todos` | `CreateTodoUseCase` | US1, FR-008 |
| `GET` | `/todos` | `ListTodosUseCase` | US2, FR-013–FR-018 |
| `GET` | `/todos/:id` | `GetTodoUseCase` | US1, FR-009 |
| `PATCH` | `/todos/:id` | `UpdateTodoUseCase` | US4, FR-010 |
| `PUT` | `/todos/:id/status` | `ChangeTodoStatusUseCase` | US3, FR-011 |
| `POST` | `/todos/:id/move` | `MoveTodoUseCase` | US6, FR-025 |
| `DELETE` | `/todos/:id` | `DeleteTodoUseCase` | US5, FR-012 |

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Redis read cache (`CachedTodoRepository`, `RedisService`) | User chose Redis for the backend stack | Skipping Redis ignores the chosen stack; caching in controllers breaks layering and list invalidation ([R12](./research.md)) |
| Turborepo monorepo | User chose it; frontend app follows in 002 | Plain folders lose the shared task pipeline ([R1](./research.md)) |

No constitution violation is left unjustified; the required amendment and approvals are listed in
the Constitution Check.
