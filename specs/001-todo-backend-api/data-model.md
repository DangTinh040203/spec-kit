# Data Model: Todo Backend API

**Feature**: `001-todo-backend-api` | **Date**: 2026-11-26 | **Plan**: [plan.md](./plan.md)

## Entity: Todo

The only entity in this feature. It has no relationships.

| Field | Domain type | Storage (PostgreSQL via Prisma) | Rules | Spec |
| --- | --- | --- | --- | --- |
| `id` | `string` (UUID v4) | `uuid`, primary key, generated | Set by the system, never changed | FR-001, FR-007 |
| `title` | `string` | `varchar(800)` | Trimmed; 1–200 grapheme clusters after trimming | FR-002 |
| `description` | `string \| null` | `text`, nullable | Up to 2,000 characters; empty string or `null` clears it | FR-003, FR-010 |
| `dueDate` | `string \| null` (`YYYY-MM-DD`) | `date`, nullable | Valid calendar date; past dates allowed; no time of day | FR-004 |
| `status` | `TodoStatus` | enum `TodoStatus` | `todo` \| `in_progress` \| `done`; default `todo` | FR-005 |
| `position` | `number` (integer ≥ 0) | `integer` | 0 = top of its status; dense 0..n-1 per status | FR-024, FR-027 |
| `createdAt` | `Date` | `timestamptz`, `@default(now())` | Set once, never changed | FR-006 |
| `updatedAt` | `Date` | `timestamptz`, `@updatedAt` | Changes on every successful write | FR-006 |

`varchar(800)` leaves room for 200 grapheme clusters, which can take several code points each
(for example, combining accents or emoji). The 200 limit itself is enforced in the application,
not by the column.

### Status values

| API / domain value | Shown to people as | In the "active" filter |
| --- | --- | --- |
| `todo` | To do | yes |
| `in_progress` | In progress | yes |
| `done` | Done | no |

Column order for `sort=position`: `todo`, `in_progress`, `done`.

### Indexes

| Index | Used by |
| --- | --- |
| `(status, position)` | Position sort, position shifts on create / move / delete |
| `(createdAt)` | Default sort, tie-breaker (FR-016) |
| `(dueDate)` | Due-date sort |

No unique index on `(status, position)`; see [research.md R7](./research.md).

## State transitions

Any status can change to any other status. There are no forbidden transitions.

```text
          ┌──────────────┐
          ▼              │
   todo ◄────► in_progress ◄────► done
     ▲                              │
     └──────────────────────────────┘
```

| Action | Status | Position effect |
| --- | --- | --- |
| Create (no status) | `todo` | Inserted at 0 of `todo`; others in `todo` shift down by 1 |
| Create (with status S) | S | Inserted at 0 of S |
| Change status to a new value S | S | Removed from old status (gap closed); inserted at 0 of S |
| Change status to the current value | unchanged | Unchanged; nothing is written |
| Move to (S, i) | S | Removed from old status (gap closed); inserted at `min(i, count(S))` of S |
| Delete | — | Removed; rows below it in the same status shift up by 1 |
| Update title / description / due date | unchanged | Unchanged |

Moving within the same status uses the same rule: the todo is taken out first, then inserted at
the clamped index, so the other todos keep their relative order (FR-026).

## List query

| Parameter | Values | Default | Spec |
| --- | --- | --- | --- |
| `status` | `all`, `active`, `todo`, `in_progress`, `done` | `all` | FR-013 |
| `sort` | `createdAt`, `dueDate`, `position` | `createdAt` | FR-014 |
| `order` | `asc`, `desc` (ignored for `position`) | `desc` | FR-014 |
| `page` | integer ≥ 1 | 1 | FR-017 |
| `pageSize` | integer 1–100 | 20 | FR-017 |

Ordering rules applied by the repository:

| `sort` | ORDER BY |
| --- | --- |
| `createdAt` | `createdAt {order}`, then `id` |
| `dueDate` | `dueDate {order} NULLS LAST`, then `createdAt DESC`, then `id` (FR-015, FR-016) |
| `position` | status rank (`todo`, `in_progress`, `done`), then `position ASC` |

The final `id` tie-breaker keeps paging stable even if two todos share a creation timestamp
(SC-004).

## Domain types (no framework imports)

```text
TodoStatus        = 'todo' | 'in_progress' | 'done'
TodoStatusFilter  = 'all' | 'active' | TodoStatus
TodoSortField     = 'createdAt' | 'dueDate' | 'position'
TodoListQuery     = { status, sort, order, page, pageSize }
Page<T>           = { items: T[], total, page, pageSize, totalPages }
```

`totalPages = ceil(total / pageSize)`, and 0 when `total` is 0.

## Repository contract (domain, abstract class `TodoRepository`)

| Method | Returns | Behavior |
| --- | --- | --- |
| `create(input)` | `Todo` | Inserts at position 0 of `input.status`, shifting others, in one transaction |
| `findById(id)` | `Todo \| null` | — |
| `findPage(query)` | `Page<Todo>` | Filter, order, and page as above |
| `updateDetails(id, changes)` | `Todo \| null` | Title / description / due date only |
| `moveTo(id, status, index)` | `Todo \| null` | Close gap, clamp index, open gap, write status + position, one transaction |
| `delete(id)` | `boolean` | Remove and close the gap, one transaction |

Methods take and return domain types only; Prisma models never cross this boundary
(Principle I). `null` / `false` means "not found", which the use case turns into
`TodoNotFoundError`.

### Implementations (infrastructure)

| Class | Role |
| --- | --- |
| `PrismaTodoRepository` | Talks to PostgreSQL; owns transactions and position shifts |
| `CachedTodoRepository` | Decorator bound to the `TodoRepository` token; caches reads in Redis, delegates everything to `PrismaTodoRepository` |

## Cache keys (Redis, [research.md R12](./research.md))

Redis holds copies only; PostgreSQL is the source of truth. Losing Redis loses no data.

| Key | Value | TTL | Written by |
| --- | --- | --- | --- |
| `todos:version` | integer counter `n` | none | `INCR` after every successful write |
| `todo:v{n}:{id}` | one todo as JSON | 60 s | `findById` on cache miss |
| `todos:v{n}:{status}:{sort}:{order}:{page}:{pageSize}` | one page as JSON | 60 s | `findPage` on cache miss |

Dates are stored as ISO strings in the JSON and turned back into domain types when read.
Not-found results are not cached.

## Errors (domain)

| Error | When | HTTP mapping (presentation) |
| --- | --- | --- |
| `TodoNotFoundError` | Id unknown or malformed | 404 `NOT_FOUND` |
| `TodoValidationError` | An entity invariant fails (with field + reason list) | 400 `VALIDATION_ERROR` |
