---
description: "Task list for feature 001-todo-backend-api"
---

# Tasks: Todo Backend API

**Input**: Design documents from `/specs/001-todo-backend-api/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml),
[quickstart.md](./quickstart.md)

**Tests**: None. The constitution says automated tests are not required and MUST NOT be added
unless requested. Each story ends with a manual check from [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story so each story can be built and checked on its
own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: User story from spec.md (US1–US6)
- Paths are relative to the repository root. The API lives in `apps/api/` (Turborepo monorepo,
  [research.md R1](./research.md)).

## Rules that apply to every task

- **Layers (Principle I)**: files in `domain/` and `application/` MUST NOT import `@nestjs/*`,
  `@prisma/client` / the generated Prisma client, or `redis`. Prisma and Redis types MUST NOT
  leave `infrastructure/`. Controllers only map DTO ↔ use case.
- **Naming (Principle III)**: `<kebab-name>.<role>.ts`, using only the roles in the constitution
  (after the v2.2.0 amendment in T001).
- **Dependencies (Principle IV)**: install nothing that is not in
  [research.md R10](./research.md) and approved in T002.
- **Commits**: never commit or push; leave changes unstaged for the user (CLAUDE.md).

---

## Phase 1: Setup (gates + monorepo)

**Purpose**: Get the required approvals, then create the Turborepo workspace and the empty API
app.

- [ ] T001 GATE: Confirm `.specify/memory/constitution.md` is at v2.2.0 or later and allows every item in [research.md R11](./research.md): roles `.error.ts`, `.filter.ts`, `.validator.ts`; `.service.ts` for infrastructure client wrappers (`prisma.service.ts`, `redis.service.ts`); the `cached-` prefix for caching repository decorators; Redis as an allowed infrastructure component. If not, STOP and ask the user to run `/speckit-constitution` first
- [ ] T002 GATE: Show the user the package list in [research.md R10](./research.md) (root `turbo`; `apps/api` runtime and dev packages; `@prisma/adapter-pg` + `pg` only if the Prisma major needs them) and get explicit approval before installing anything. STOP if not approved
- [ ] T003 Create root `package.json` (`"private": true`, `"packageManager": "pnpm@<installed version>"`, scripts `build`, `dev`, `typecheck` that call `turbo run …`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), and an empty `packages/.gitkeep`
- [ ] T004 Create root `turbo.json` with tasks `build` (dependsOn `^build`, `db:generate`; outputs `dist/**`), `dev` (persistent, no cache), `typecheck`, `db:generate` (outputs the generated Prisma client folder), and `db:migrate` (no cache)
- [ ] T005 [P] Create root `docker-compose.yml` with `postgres:17` (user/password/db `todo`, port 5432, named volume) and `redis` 7 or 8 (port 6379), for local development only
- [ ] T006 [P] Extend root `.gitignore` with `node_modules/`, `dist/`, `.turbo/`, `.env`, and the generated Prisma client folder under `apps/api/`
- [ ] T007 Create `apps/api/package.json` (`"name": "api"`, scripts: `build` = `tsc -p tsconfig.json`, `dev` = `tsc -p tsconfig.json && (tsc --watch --preserveWatchOutput & node --watch --env-file=.env dist/main.js)` (plain shell `&`, no extra package), `start` = `node --env-file=.env dist/main.js`, `typecheck` = `tsc --noEmit`, `db:generate` = `prisma generate`, `db:migrate` = `prisma migrate dev`) and `apps/api/tsconfig.json` (strict, `experimentalDecorators`, `emitDecoratorMetadata`, `outDir: dist`, `rootDir: src`)
- [ ] T008 Install the approved packages from T002: `turbo` at the root (dev); NestJS, `reflect-metadata`, `rxjs`, `class-validator`, `class-transformer`, `@prisma/client`, `redis` in `apps/api` (runtime); `prisma`, `typescript`, `@types/node`, `@types/express` in `apps/api` (dev). Check the installed Prisma major against Prisma's docs and record in `apps/api/package.json` notes or the plan whether the driver adapter (`@prisma/adapter-pg` + `pg`) is required ([research.md R5](./research.md)); install it only if it was approved
- [ ] T009 [P] Create `apps/api/.env.example` with `DATABASE_URL=postgresql://todo:todo@localhost:5432/todo`, `REDIS_URL=redis://localhost:6379`, `PORT=4000`, `CORS_ORIGIN=http://localhost:3000`

**Checkpoint**: `pnpm install` succeeds at the root and `docker compose up -d` starts PostgreSQL
and Redis.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Database schema, shared infrastructure, error format, domain model, and an empty
`todo` module wired end to end. No endpoint works yet.

**⚠️ CRITICAL**: No user story can start until this phase is complete.

### Database

- [ ] T010 Write `apps/api/prisma/schema.prisma`: PostgreSQL datasource; generator per the Prisma major found in T008 with output inside `apps/api`; enum `TodoStatus { todo in_progress done }` declared in exactly this order (PostgreSQL sorts enums by declaration order, which `sort=position` relies on); model `Todo` with `id String @id @default(uuid()) @db.Uuid`, `title String` (PostgreSQL `text`; the 1–200 grapheme limit is enforced by the application, not the column), `description String?` (text), `dueDate DateTime? @db.Date`, `status TodoStatus @default(todo)`, `position Int`, `createdAt DateTime @default(now()) @db.Timestamptz`, `updatedAt DateTime @updatedAt @db.Timestamptz`; indexes `@@index([status, position])`, `@@index([createdAt])`, `@@index([dueDate])`; NO unique index on `(status, position)` ([data-model.md](./data-model.md), [research.md R7](./research.md))
- [ ] T011 Run `pnpm --filter api db:migrate --name init` against the Docker database to create `apps/api/prisma/migrations/`, then `pnpm --filter api db:generate`

### Shared module

- [ ] T012 [P] Create `apps/api/src/shared/infrastructure/prisma.service.ts`: `PrismaService` extends the generated client (with the PG adapter if T008 found it required), connects on module init, disconnects on module destroy
- [ ] T013 [P] Create `apps/api/src/shared/infrastructure/redis.service.ts`: `RedisService` using `redis` (node-redis) and `REDIS_URL`; methods `get(key): Promise<string | null>`, `set(key, value, ttlSeconds)`, `incr(key): Promise<number | null>`; every call has a short timeout (about 200 ms) and on any error or while disconnected logs a warning and returns `null` / does nothing, never throwing to callers; reconnects automatically ([research.md R12](./research.md))
- [ ] T014 [P] Create `apps/api/src/shared/presentation/grapheme-length.validator.ts`: a `class-validator` constraint + decorator `GraphemeLength(min, max)` that counts grapheme clusters with `new Intl.Segmenter(undefined, { granularity: 'grapheme' })`, so Vietnamese and other non-Latin text count as a person reads them
- [ ] T015 Create shared base errors `apps/api/src/shared/domain/not-found.error.ts` (`NotFoundError`) and `apps/api/src/shared/domain/validation.error.ts` (`ValidationError` with `details: { field: string; reason: string }[]`), then `apps/api/src/todo/domain/todo-not-found.error.ts` (`TodoNotFoundError extends NotFoundError`, carries the id) and `apps/api/src/todo/domain/todo-validation.error.ts` (`TodoValidationError extends ValidationError`); plain classes, no framework imports. The shared module MUST NOT import from `todo/`
- [ ] T016 Create `apps/api/src/shared/presentation/http-exception.filter.ts`: global filter that returns `{ "error": { "code", "message", "details"? } }` for every error ([contracts/openapi.yaml](./contracts/openapi.yaml) `Error`): `ValidationError` (shared base class) and the ValidationPipe's error → 400 `VALIDATION_ERROR` with all `details`; unparsable JSON body → 400 `MALFORMED_REQUEST`; `NotFoundError` (shared base class) and unknown routes → 404 `NOT_FOUND`; anything else → 500 `INTERNAL_ERROR` with a generic message and no stack, SQL, or internal text (log the real error server-side) (FR-019, FR-020, FR-022). It imports only the shared base errors from `apps/api/src/shared/domain/`, never feature errors (depends on T015)
- [ ] T017 Create `apps/api/src/shared/shared.module.ts` that provides and exports `PrismaService` and `RedisService` (depends on T012, T013)

### Domain model

- [ ] T018 Create `apps/api/src/todo/domain/todo.entity.ts` with no framework imports: types `TodoStatus = 'todo' | 'in_progress' | 'done'`, `TodoStatusFilter = 'all' | 'active' | TodoStatus`, `TodoSortField = 'createdAt' | 'dueDate' | 'position'`, `TodoListQuery = { status, sort, order, page, pageSize }`, `Page<T> = { items, total, page, pageSize, totalPages }` with `totalPages = ceil(total / pageSize)` and 0 when total is 0; class `Todo` with fields `id`, `title`, `description: string | null`, `dueDate: string | null` (`YYYY-MM-DD`), `status`, `position`, `createdAt: Date`, `updatedAt: Date`; static `Todo.isValidId(id)` (UUID format check, used to answer malformed ids with not found, FR-021); static invariant checks that throw `TodoValidationError` listing every failing field: title "Trimmed; 1–200 grapheme clusters after trimming", description "Up to 2,000 characters" (grapheme clusters, `Intl.Segmenter`), dueDate "Valid calendar date; past dates allowed; no time of day", status one of the three values (depends on T015)
- [ ] T019 Create `apps/api/src/todo/domain/todo.repository.ts`: `export abstract class TodoRepository {}` with a doc comment stating the contract rules from [data-model.md](./data-model.md) (methods take and return domain types only; `null`/`false` means not found; position rules). Methods are added by each user story (depends on T018)

### Infrastructure and wiring

- [ ] T020 Create `apps/api/src/todo/infrastructure/todo.mapper.ts`: `toDomain(prismaTodo): Todo` and `toPersistence(...)` converting `dueDate` between Prisma's UTC `Date` and the domain `YYYY-MM-DD` string in UTC (never local time) ([research.md R9](./research.md)) (depends on T011, T018)
- [ ] T021 Create `apps/api/src/todo/infrastructure/prisma-todo.repository.ts`: `PrismaTodoRepository extends TodoRepository`, constructor takes `PrismaService`; no methods yet (depends on T012, T019, T020)
- [ ] T022 Create `apps/api/src/todo/infrastructure/cached-todo.repository.ts`: `CachedTodoRepository extends TodoRepository`, constructor takes the inner `PrismaTodoRepository` and `RedisService`; private helpers `currentVersion()` (reads `todos:version`, 0 if missing), `bumpVersion()` (`INCR todos:version` after a successful write), and JSON (de)serialisation of `Todo` / `Page<Todo>` with dates as ISO strings; key formats `todo:v{n}:{id}` and `todos:v{n}:{status}:{sort}:{order}:{page}:{pageSize}`, TTL 60 s; not-found results are never cached; any Redis failure falls through to the inner repository. Stale-read guard (constitution Principle I: a cache failure MUST NOT change a result): keep an in-process flag `cacheUntrusted`; if `bumpVersion()` fails after a write, set it; while it is set, every read skips the cache (no get, no set) and first retries `INCR todos:version`, clearing the flag only when the `INCR` succeeds; the flag starts as `true` at boot until the first successful `INCR`/version read, so a restart never trusts keys written before a missed bump ([research.md R12](./research.md)) (depends on T013, T021)
- [ ] T023 [P] Create `apps/api/src/todo/presentation/todo-response.dto.ts`: maps a domain `Todo` to the contract `Todo` (`id`, `title`, `description`, `dueDate`, `status`, `position`, `createdAt`/`updatedAt` as ISO 8601 UTC strings) and a `Page<Todo>` to `TodoPage` (depends on T018)
- [ ] T024 Create `apps/api/src/todo/presentation/todo.controller.ts` with `@Controller('todos')` and no routes yet (depends on T023)
- [ ] T025 Create `apps/api/src/todo/todo.module.ts`: imports `SharedModule`; provides `PrismaTodoRepository` via `useFactory` (inject `PrismaService`) and binds `{ provide: TodoRepository, useFactory: (inner, redis) => new CachedTodoRepository(inner, redis), inject: [PrismaTodoRepository, RedisService] }`; registers `TodoController`. Use cases are added by each story (depends on T017, T022, T024)
- [ ] T026 Create `apps/api/src/app.module.ts` (imports `SharedModule`, `TodoModule`) and `apps/api/src/main.ts`: create the app, enable CORS for `CORS_ORIGIN` only, register a global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, `exceptionFactory` that collects every failing property, including unknown fields, into one `VALIDATION_ERROR` with `details`), register the global `HttpExceptionFilter`, listen on `PORT` (default 4000) (depends on T016, T025)

**Checkpoint**: `pnpm turbo run build --filter=api` passes, `pnpm --filter api start` boots, and
`GET http://localhost:4000/todos/x` returns 404 `NOT_FOUND` in the contract error format.

---

## Phase 3: User Story 1 - Create and view todos (Priority: P1) 🎯 MVP

**Goal**: The client creates a todo (optionally with description, due date, and status) and
fetches it by id.

**Independent Test**: [quickstart.md](./quickstart.md) "US1" rows 1–7: create, fetch, every
field matches, status `todo`, position 0, timestamps set; invalid titles and ids give the right
errors.

- [ ] T027 [US1] Add `abstract create(input: { title: string; description: string | null; dueDate: string | null; status: TodoStatus }): Promise<Todo>` and `abstract findById(id: string): Promise<Todo | null>` to `apps/api/src/todo/domain/todo.repository.ts`
- [ ] T028 [US1] Implement `create` and `findById` in `apps/api/src/todo/infrastructure/prisma-todo.repository.ts`: `create` runs in one interactive transaction that first takes the position lock `SELECT pg_advisory_xact_lock(<POSITION_LOCK_KEY>)` (a constant defined in this file, run with `$executeRaw`), then `UPDATE … SET position = position + 1 WHERE status = $status`, then insert with `position = 0` ("Inserted at 0 of `todo`; others in `todo` shift down by 1"); map results with `todo.mapper.ts`
- [ ] T029 [US1] Implement `create` (delegate, then `bumpVersion()`) and `findById` (cache-aside on `todo:v{n}:{id}`, TTL 60 s, skip caching `null`) in `apps/api/src/todo/infrastructure/cached-todo.repository.ts`
- [ ] T030 [P] [US1] Create `apps/api/src/todo/application/create-todo.use-case.ts`: `CreateTodoUseCase` takes `TodoRepository`; trims the title, turns an empty or `null` description into `null`, defaults status to `todo`, runs the entity invariants, calls `create` (FR-005, FR-007, FR-008)
- [ ] T031 [P] [US1] Create `apps/api/src/todo/application/get-todo.use-case.ts`: `GetTodoUseCase` throws `TodoNotFoundError` when `Todo.isValidId(id)` is false (without calling the repository) or `findById` returns `null` (FR-009, FR-021)
- [ ] T032 [P] [US1] Create `apps/api/src/todo/presentation/create-todo.dto.ts`: `title` string, trimmed by `@Transform`, `@GraphemeLength(1, 200)` ("Trimmed; 1–200 grapheme clusters after trimming"); `description` optional, string or `null`, `@GraphemeLength(0, 2000)` ("Up to 2,000 characters", counted as grapheme clusters like the title); `dueDate` optional, string or `null`, matches `^\d{4}-\d{2}-\d{2}$` and `IsISO8601({ strict: true })` ("Valid calendar date; past dates allowed; no time of day"); `status` optional, one of `todo`, `in_progress`, `done`; no other fields (unknown fields rejected by the pipe)
- [ ] T033 [US1] Add `POST /todos` (201, body `CreateTodoDto`) and `GET /todos/:id` (200) to `apps/api/src/todo/presentation/todo.controller.ts`, returning `todo-response.dto.ts` shapes; the `:id` param is a plain string (no `ParseUUIDPipe`, so malformed ids reach the use case and become 404)
- [ ] T034 [US1] Provide `CreateTodoUseCase` and `GetTodoUseCase` in `apps/api/src/todo/todo.module.ts` with `useFactory` + `inject: [TodoRepository]`, and inject them into the controller
- [ ] T035 [US1] Run [quickstart.md](./quickstart.md) "US1" rows 1–7 and fix any mismatch

**Checkpoint**: MVP: todos can be created and read; validation and not-found errors use the
single error format.

---

## Phase 4: User Story 2 - List, filter, sort, and page (Priority: P2)

**Goal**: The client lists todos filtered by status, sorted by creation date, due date, or
position, one page at a time.

**Independent Test**: [quickstart.md](./quickstart.md) "US2" rows 1–7.

- [ ] T036 [US2] Add `abstract findPage(query: TodoListQuery): Promise<Page<Todo>>` to `apps/api/src/todo/domain/todo.repository.ts`
- [ ] T037 [US2] Implement `findPage` in `apps/api/src/todo/infrastructure/prisma-todo.repository.ts`: filter `all` = no filter, `active` = `todo` + `in_progress`, otherwise the single status; ORDER BY per [data-model.md](./data-model.md): `createdAt` → `createdAt {order}`, then `id`; `dueDate` → `dueDate {order} NULLS LAST`, then `createdAt DESC`, then `id`; `position` → `status ASC` (enum order `todo`, `in_progress`, `done`), then `position ASC` (order ignored); `skip = (page - 1) * pageSize`, `take = pageSize`; run the count and the page query in one transaction; a page beyond the last returns empty `items` with the correct `total` (FR-013–FR-018, SC-004)
- [ ] T038 [US2] Implement `findPage` in `apps/api/src/todo/infrastructure/cached-todo.repository.ts` with cache-aside on `todos:v{n}:{status}:{sort}:{order}:{page}:{pageSize}`, TTL 60 s
- [ ] T039 [P] [US2] Create `apps/api/src/todo/application/list-todos.use-case.ts`: `ListTodosUseCase` applies defaults (`status` `all`, `sort` `createdAt`, `order` `desc`, `page` 1, `pageSize` 20) and calls `findPage`
- [ ] T040 [P] [US2] Create `apps/api/src/todo/presentation/list-todos-query.dto.ts`: `status` optional, one of `all`, `active`, `todo`, `in_progress`, `done`; `sort` optional, one of `createdAt`, `dueDate`, `position`; `order` optional, `asc` or `desc`; `page` optional integer ≥ 1 (transformed from the query string); `pageSize` optional integer 1–100
- [ ] T041 [US2] Add `GET /todos` (200, query `ListTodosQueryDto`, returns `TodoPage`) to `apps/api/src/todo/presentation/todo.controller.ts` and provide `ListTodosUseCase` in `apps/api/src/todo/todo.module.ts`
- [ ] T042 [US2] Run [quickstart.md](./quickstart.md) "US2" rows 1–7 and fix any mismatch

**Checkpoint**: US1 and US2 both work on their own.

---

## Phase 5: User Story 3 - Change a todo's status (Priority: P2)

**Goal**: The client sets any of the three statuses; a new status puts the todo at the top of
that status, the same status changes nothing.

**Independent Test**: [quickstart.md](./quickstart.md) "US3" rows 1–3.

- [ ] T043 [US3] Add `abstract moveTo(id: string, status: TodoStatus, index: number): Promise<Todo | null>` to `apps/api/src/todo/domain/todo.repository.ts` (shared with US6)
- [ ] T044 [US3] Implement `moveTo` in `apps/api/src/todo/infrastructure/prisma-todo.repository.ts` in one interactive transaction: take the position lock `pg_advisory_xact_lock(<POSITION_LOCK_KEY>)` first (same constant as `create`), then read the row (return `null` if missing); close the gap in the source status (`position = position - 1 WHERE status = old AND position > old position`); clamp the index to `count(target status after removal)` ("inserted at `min(i, count(S))` of S"); open a gap (`position = position + 1 WHERE status = target AND position >= index`); write `status` and `position` together (FR-025, FR-026, FR-027). Works for moves within the same status
- [ ] T045 [US3] Implement `moveTo` in `apps/api/src/todo/infrastructure/cached-todo.repository.ts`: delegate, then `bumpVersion()` when a todo was returned
- [ ] T046 [P] [US3] Create `apps/api/src/todo/application/change-todo-status.use-case.ts`: `ChangeTodoStatusUseCase` checks the id format, loads the todo (`TodoNotFoundError` if missing); if the status is unchanged returns it as is (no write, `updatedAt` unchanged); otherwise calls `moveTo(id, status, 0)` (FR-011)
- [ ] T047 [P] [US3] Create `apps/api/src/todo/presentation/change-todo-status.dto.ts`: `status` required, one of `todo`, `in_progress`, `done`
- [ ] T048 [US3] Add `PUT /todos/:id/status` (200) to `apps/api/src/todo/presentation/todo.controller.ts` and provide `ChangeTodoStatusUseCase` in `apps/api/src/todo/todo.module.ts`
- [ ] T049 [US3] Run [quickstart.md](./quickstart.md) "US3" rows 1–3 and fix any mismatch

**Checkpoint**: Status changes work and are reflected in US2 lists at once (cache version bumped).

---

## Phase 6: User Story 4 - Update a todo's details (Priority: P3)

**Goal**: The client changes any of title, description, due date; only sent fields change; `null`
clears description or due date.

**Independent Test**: [quickstart.md](./quickstart.md) "US4" rows 1–3.

- [ ] T050 [US4] Add `abstract updateDetails(id: string, changes: { title?: string; description?: string | null; dueDate?: string | null }): Promise<Todo | null>` to `apps/api/src/todo/domain/todo.repository.ts`
- [ ] T051 [US4] Implement `updateDetails` in `apps/api/src/todo/infrastructure/prisma-todo.repository.ts` (update only the given keys; return `null` when the row does not exist instead of throwing) and in `apps/api/src/todo/infrastructure/cached-todo.repository.ts` (delegate, then `bumpVersion()` when a todo was returned)
- [ ] T052 [P] [US4] Create `apps/api/src/todo/application/update-todo.use-case.ts`: `UpdateTodoUseCase` checks the id format; rejects an update with no fields with `TodoValidationError` ("at least one field is required"); trims the title; treats `""` or `null` description as `null` and `null` due date as cleared; runs entity invariants on the sent fields; throws `TodoNotFoundError` on `null` (FR-010)
- [ ] T053 [P] [US4] Create `apps/api/src/todo/presentation/update-todo.dto.ts`: same field rules as `create-todo.dto.ts` but every field optional, `description` and `dueDate` also accept `null`, no `status` field. Only `null` clears `dueDate`; `"dueDate": ""` fails the date rule with `VALIDATION_ERROR` (FR-010)
- [ ] T054 [US4] Add `PATCH /todos/:id` (200) to `apps/api/src/todo/presentation/todo.controller.ts` and provide `UpdateTodoUseCase` in `apps/api/src/todo/todo.module.ts`
- [ ] T055 [US4] Run [quickstart.md](./quickstart.md) "US4" rows 1–3 and fix any mismatch

---

## Phase 7: User Story 5 - Delete a todo (Priority: P3)

**Goal**: The client deletes a todo permanently; the rest of its status closes the gap.

**Independent Test**: [quickstart.md](./quickstart.md) "US5" rows 1–2.

- [ ] T056 [US5] Add `abstract delete(id: string): Promise<boolean>` to `apps/api/src/todo/domain/todo.repository.ts`
- [ ] T057 [US5] Implement `delete` in `apps/api/src/todo/infrastructure/prisma-todo.repository.ts` in one transaction (take the position lock `pg_advisory_xact_lock(<POSITION_LOCK_KEY>)` first, then read the row, return `false` if missing; delete; `position = position - 1 WHERE status = its status AND position > its position`) and in `apps/api/src/todo/infrastructure/cached-todo.repository.ts` (delegate, then `bumpVersion()` on `true`)
- [ ] T058 [P] [US5] Create `apps/api/src/todo/application/delete-todo.use-case.ts`: `DeleteTodoUseCase` checks the id format and throws `TodoNotFoundError` when `delete` returns `false` (FR-012)
- [ ] T059 [US5] Add `DELETE /todos/:id` (204, empty body) to `apps/api/src/todo/presentation/todo.controller.ts` and provide `DeleteTodoUseCase` in `apps/api/src/todo/todo.module.ts`
- [ ] T060 [US5] Run [quickstart.md](./quickstart.md) "US5" rows 1–2 and fix any mismatch

---

## Phase 8: User Story 6 - Move a todo to a position (Priority: P3)

**Goal**: The client moves a todo to a status and position in one request (used by the kanban
board in feature 002).

**Independent Test**: [quickstart.md](./quickstart.md) "US6" rows 1–4.

**Depends on**: T043–T045 (`moveTo`, built in US3).

- [ ] T061 [P] [US6] Create `apps/api/src/todo/application/move-todo.use-case.ts`: `MoveTodoUseCase` checks the id format, calls `moveTo(id, status, position)`, throws `TodoNotFoundError` on `null` (FR-025)
- [ ] T062 [P] [US6] Create `apps/api/src/todo/presentation/move-todo.dto.ts`: `status` required, one of `todo`, `in_progress`, `done`; `position` required integer ≥ 0
- [ ] T063 [US6] Add `POST /todos/:id/move` (200) to `apps/api/src/todo/presentation/todo.controller.ts` and provide `MoveTodoUseCase` in `apps/api/src/todo/todo.module.ts`
- [ ] T064 [US6] Run [quickstart.md](./quickstart.md) "US6" rows 1–4 and fix any mismatch

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T065 [P] Update `README.md`: tech stack table (Turborepo + pnpm, NestJS, Prisma, PostgreSQL, Redis; frontend Next.js + Tailwind CSS + shadcn/ui + Motion for feature 002), "Planned folder layout" under `apps/api/`, and how to run (`docker compose up -d`, `pnpm install`, `pnpm --filter api db:migrate`, `pnpm turbo run dev --filter=api`)
- [ ] T066 Run [quickstart.md](./quickstart.md) "Cross-cutting", "Redis cache", and "CORS" sections (seed 10,000 todos with the SQL in "Seed data" for the SC-003 timing; run the "Concurrent moves" check for FR-027), including stopping Redis (API keeps working) and stopping PostgreSQL (500 `INTERNAL_ERROR` without internals)
- [ ] T067 Review against the constitution: grep `apps/api/src/todo/domain` and `apps/api/src/todo/application` for `@nestjs`, `prisma`, `redis` imports (must be none); confirm every file name uses an allowed role; confirm no package outside the approved list was added; record the result in a short note at the end of this file
- [ ] T068 Run `pnpm turbo run typecheck build --filter=api` and fix all errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 and T002 are gates and MUST pass first. Then T003–T009.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories.
- **User stories (Phases 3–8)**: All depend on Foundational.
- **Polish (Phase 9)**: After the stories you want to ship.

### User Story Dependencies

| Story    | Depends on      | Notes                                                      |
| -------- | --------------- | ---------------------------------------------------------- |
| US1 (P1) | Foundational    | MVP                                                        |
| US2 (P2) | Foundational    | Checking it needs some todos, so run US1 first in practice |
| US3 (P2) | Foundational    | Adds `moveTo`                                              |
| US4 (P3) | Foundational    | —                                                          |
| US5 (P3) | Foundational    | —                                                          |
| US6 (P3) | US3 (T043–T045) | Reuses `moveTo`                                            |

All stories edit the same five shared files (`todo.repository.ts`, `prisma-todo.repository.ts`,
`cached-todo.repository.ts`, `todo.controller.ts`, plus `todo.module.ts`), so stories run one
after another, in priority order: US1 → US2 → US3 → US4 → US5 → US6.

### Within Each Story

Repository contract → Prisma implementation → cache decorator → use case and DTO (in parallel) →
controller route + module provider → manual check.

### Parallel Opportunities

- Phase 1: T005, T006, T009 in parallel after T003.
- Phase 2: T012, T013, T014 in parallel; T023 in parallel with T020–T022.
- Each story: the use-case task and the DTO task are `[P]` (different new files).

---

## Parallel Example: User Story 1

```text
# After T027–T029 (contract, Prisma, cache) are done:
Task: "T030 Create CreateTodoUseCase in apps/api/src/todo/application/create-todo.use-case.ts"
Task: "T031 Create GetTodoUseCase in apps/api/src/todo/application/get-todo.use-case.ts"
Task: "T032 Create CreateTodoDto in apps/api/src/todo/presentation/create-todo.dto.ts"
# Then T033 (controller) and T034 (module), then T035 (manual check)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (with both gates) → Phase 2.
2. Phase 3 (US1).
3. **STOP and validate** with quickstart "US1". Review `git diff`; the user commits.

### Incremental Delivery

1. Setup + Foundational → API boots, error format works.
2. - US1 → create and read (MVP).
3. - US2 → lists; + US3 → statuses (what the board needs to display columns).
4. - US4, US5 → edit and delete.
5. - US6 → move (what the board needs for drag and drop).
6. Polish → README, cross-cutting checks, constitution review.

Pause after each phase for the user to review and commit.

---

## Notes

- `[P]` = different files, no dependency on an unfinished task.
- Constraint text in quotes comes from [data-model.md](./data-model.md) verbatim.
- If the Prisma major found in T008 changes how the client is generated or imported, follow
  Prisma's docs and keep the generated client inside `apps/api` and imported only from
  `infrastructure/`.
- Never commit or push; never run `speckit-git-commit`.
