# Todo App

A todo application built with [Spec Kit](https://github.com/github/spec-kit) (spec-driven
development) and Claude Code. The backend uses NestJS + Prisma and follows Clean Architecture.

> **Status:** project setup only. The constitution and the Spec Kit tooling are in place, and
> no feature has been specified or implemented yet.

## Tech stack

| Area         | Choice                                   |
| ------------ | ---------------------------------------- |
| Backend      | NestJS (TypeScript)                      |
| ORM          | Prisma (`prisma/schema.prisma`)          |
| Architecture | Clean Architecture, four layers          |
| Workflow     | Spec Kit + Claude Code (`/speckit-*`)    |

## Architecture

Each backend feature is a module with four layers. Dependencies point **inward only**.

```
presentation ─┐
              ├──► application ──► domain
infrastructure┘
```

| Layer              | Contains                                                       | May import           |
| ------------------ | -------------------------------------------------------------- | -------------------- |
| **domain**         | Entities, repository contracts (abstract classes)              | nothing outer        |
| **application**    | Use cases (business logic)                                     | domain               |
| **infrastructure** | Prisma repository implementations, mappers, `prisma.service.ts` | application, domain |
| **presentation**   | NestJS controllers and DTOs                                    | application, domain  |

Key rules:

- `domain` and `application` never import `@nestjs/*` or Prisma.
- Prisma-generated types never leave `infrastructure`; mappers convert them to domain entities.
- Repository contracts are abstract classes and are used directly as injection tokens.
- Each feature's `.module.ts` is the composition root: it binds repositories and provides use
  cases through factory providers.

### Planned folder layout

```
prisma/
  schema.prisma
src/
  shared/
    infrastructure/
      prisma.service.ts
  todo/
    domain/
      todo.entity.ts
      todo.repository.ts          # abstract class
    application/
      create-todo.use-case.ts
    infrastructure/
      prisma-todo.repository.ts
      todo.mapper.ts
    presentation/
      todo.controller.ts
      create-todo.dto.ts
    todo.module.ts
```

### File naming

Backend files are named `<kebab-name>.<role>.ts`. Allowed roles: `entity`, `repository`,
`use-case`, `mapper`, `service` (only `prisma.service.ts`), `controller`, `dto`, `module`.
See the constitution for the full table.

## Development workflow

Features are built through Spec Kit commands in Claude Code:

1. `/speckit-specify <description>` — creates a feature branch and `spec.md`
2. `/speckit-clarify` — resolves unclear parts of the spec (optional)
3. `/speckit-plan` — writes `plan.md`, including layers touched, design patterns, and the
   impact analysis
4. `/speckit-tasks` — generates `tasks.md`
5. `/speckit-analyze` — checks spec, plan, and tasks for consistency (optional)
6. `/speckit-implement` — implements the tasks

The active feature is recorded in `.specify/feature.json`.

## Project rules

The full rules are in [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
(v2.1.0). In short:

1. **Clean Architecture on NestJS**: see [Architecture](#architecture).
2. **Impact analysis before change**: list every affected function, module, and caller in the
   plan before writing code.
3. **File naming convention**: see [File naming](#file-naming).
4. **Dependency approval**: no package is installed, upgraded, or removed without the owner's
   approval.

Automated tests are not required at this stage.

### Git

- Commits and pushes are made only when the owner explicitly asks. Spec Kit auto-commit hooks
  are disabled in `.specify/extensions.yml`.
- Claude Code asks for confirmation before `git commit` and `git push`
  (`.claude/settings.json`).
- See [`CLAUDE.md`](CLAUDE.md) for the instructions given to Claude Code.

## Repository layout

| Path                     | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `.specify/memory/`       | Project constitution                            |
| `.specify/templates/`    | Spec Kit templates for spec, plan, and tasks    |
| `.specify/extensions/`   | Spec Kit git extension (branching, validation)  |
| `.claude/skills/`        | `/speckit-*` skills for Claude Code             |
| `CLAUDE.md`              | Instructions for Claude Code                    |
