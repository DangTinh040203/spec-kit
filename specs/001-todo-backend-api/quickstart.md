# Quickstart: Todo Backend API

**Feature**: `001-todo-backend-api` | **Plan**: [plan.md](./plan.md) |
**Contract**: [contracts/openapi.yaml](./contracts/openapi.yaml)

A manual guide to run the API and check that it meets the spec. Automated tests are not part of
this feature (constitution).

## Prerequisites

- Node.js 22 LTS or later, pnpm, Docker
- Dependencies approved and installed (see [research.md R10](./research.md))

## Setup

From the repository root (Turborepo monorepo):

```bash
docker compose up -d                          # PostgreSQL 17 + Redis
cp apps/api/.env.example apps/api/.env        # DATABASE_URL, REDIS_URL, PORT=4000, CORS_ORIGIN
pnpm install                                  # installs all workspaces
pnpm --filter api db:migrate                  # prisma migrate dev: Todo table and indexes
pnpm turbo run build --filter=api
pnpm --filter api start                       # http://localhost:4000
```

During development, `pnpm turbo run dev --filter=api` rebuilds and restarts on change.

## Validation scenarios

Run these with `curl` (or any HTTP client) against `http://localhost:4000`. `$ID` is an id from
an earlier response.

### US1: Create and view (P1)

| #   | Request                                                                              | Expected                                                                              |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | `POST /todos` `{"title":"Buy milk"}`                                                 | 201; status `todo`, position 0, `description` and `dueDate` null, both timestamps set |
| 2   | `POST /todos` `{"title":"  Mua sữa  ","description":"2 hộp","dueDate":"2026-12-31"}` | 201; title saved as `Mua sữa`                                                         |
| 3   | `POST /todos` `{"title":"Report","status":"in_progress"}`                            | 201; status `in_progress`, position 0                                                 |
| 4   | `GET /todos/$ID`                                                                     | 200; same todo                                                                        |
| 5   | `POST /todos` `{"title":"   "}`, then a 201-character title                          | 400 `VALIDATION_ERROR`, `details[0].field = "title"`                                  |
| 6   | `POST /todos` `{"title":"","dueDate":"2026-02-30","extra":1}`                        | 400; `details` lists `title`, `dueDate`, and `extra` together                         |
| 7   | `GET /todos/00000000-0000-4000-8000-000000000000` and `GET /todos/abc`               | 404 `NOT_FOUND` for both                                                              |

### US2: List, filter, sort, page (P2)

Create 3 `todo`, 2 `in_progress`, 3 `done` todos, some without due dates.

| #   | Request                                                              | Expected                                                          |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | `GET /todos?status=all` / `active` / `todo` / `in_progress` / `done` | `total` = 8 / 5 / 3 / 2 / 3                                       |
| 2   | `GET /todos`                                                         | newest created first; `page` 1, `pageSize` 20                     |
| 3   | `GET /todos?sort=dueDate&order=asc`                                  | earliest due first; todos without a due date last                 |
| 4   | `GET /todos?sort=position`                                           | grouped `todo`, `in_progress`, `done`; positions 0, 1, 2… in each |
| 5   | 45 todos, `GET /todos?page=3&pageSize=20`                            | 5 items, `total` 45, `totalPages` 3                               |
| 6   | `GET /todos?page=99`                                                 | 200, empty `items`, correct `total`                               |
| 7   | `GET /todos?status=x&pageSize=0`                                     | 400; `details` names `status` and `pageSize`                      |

### US3: Change status (P2)

| #   | Request                                            | Expected                                            |
| --- | -------------------------------------------------- | --------------------------------------------------- |
| 1   | `PUT /todos/$ID/status` `{"status":"in_progress"}` | 200; position 0 of `in_progress`; `updatedAt` later |
| 2   | Same request again                                 | 200; position and `updatedAt` unchanged             |
| 3   | `{"status":"completed"}`                           | 400 `VALIDATION_ERROR` on `status`                  |

### US4: Update details (P3)

| #   | Request                                                  | Expected                              |
| --- | -------------------------------------------------------- | ------------------------------------- |
| 1   | `PATCH /todos/$ID` `{"dueDate":"2027-01-15"}`            | only `dueDate` and `updatedAt` change |
| 2   | `PATCH /todos/$ID` `{"description":null,"dueDate":null}` | both cleared                          |
| 3   | `PATCH /todos/$ID` `{}`                                  | 400; at least one field required      |

### US5: Delete (P3)

| #   | Request                   | Expected                                                              |
| --- | ------------------------- | --------------------------------------------------------------------- |
| 1   | `DELETE /todos/$ID`       | 204; then `GET` returns 404; other todos in that status close the gap |
| 2   | `DELETE /todos/$ID` again | 404                                                                   |

### US6: Move (P3)

Create A, B, C in `todo` (positions: C 0, B 1, A 2).

| #   | Request                                                | Expected                                         |
| --- | ------------------------------------------------------ | ------------------------------------------------ |
| 1   | `POST /todos/$A/move` `{"status":"todo","position":0}` | `GET /todos?status=todo&sort=position` → A, C, B |
| 2   | `POST /todos/$B/move` `{"status":"done","position":0}` | B is `done` at 0; A, C keep their order at 0, 1  |
| 3   | `{"status":"done","position":999}`                     | placed at the bottom of `done`                   |
| 4   | `{"status":"done","position":-1}`                      | 400 on `position`                                |

### Cross-cutting

| Check                                                     | Expected                                                | Spec       |
| --------------------------------------------------------- | ------------------------------------------------------- | ---------- |
| Send `{"title":` (broken JSON)                            | 400 `MALFORMED_REQUEST` in the same error format        | Edge cases |
| Stop the database, call any endpoint                      | 500 `INTERNAL_ERROR`, no stack trace or SQL in the body | FR-022     |
| Restart the API (`docker compose restart` + `pnpm start`) | All todos still there                                   | SC-006     |
| Seed 10,000 todos, time `GET /todos?sort=dueDate`         | under 1 second                                          | SC-003     |

### Redis cache ([research.md R12](./research.md))

| Check                                                                              | Expected                                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /todos` twice, then `redis-cli` inside the Redis container: `KEYS 'todos:*'`  | A `todos:v{n}:…` key exists after the first call                                |
| Create or move a todo, then `GET /todos?sort=position`                             | New data at once (not stale); `GET todos:version` is one higher                 |
| `docker compose stop redis`, then repeat US1–US6                                   | All scenarios still pass; the API log shows cache warnings, no error responses  |
| `docker compose start redis`                                                       | Caching resumes without restarting the API                                      |

### CORS (for feature 002)

| Check                                                                    | Expected                                                          |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `curl -i -H 'Origin: http://localhost:3000' http://localhost:4000/todos` | Response has `Access-Control-Allow-Origin: http://localhost:3000` |
| Same with `Origin: http://evil.example`                                  | No `Access-Control-Allow-Origin` header                           |
