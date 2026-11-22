<!--
Sync Impact Report
- Version change: 2.0.0 → 2.1.0 (MINOR: guidance materially expanded; no principle removed
  or redefined)
- Modified principles:
  - I. Clean Architecture on NestJS: ORM fixed to Prisma (schema in prisma/schema.prisma);
    Prisma-generated types confined to infrastructure; repository contracts are abstract
    classes used directly as injection tokens (no Symbol/string tokens); use cases provided
    via factory providers
  - III. File Naming Convention: scoped to backend source files; added .mapper.ts and
    .service.ts (prisma.service.ts only); <orm>- prefix replaced with prisma-
- Added sections: none
- Removed sections: none
- Templates: not modified (dependent templates read this file at runtime)
- Follow-up TODOs: frontend naming conventions to be added when frontend work starts
-->

# Todo App Constitution

## Core Principles

### I. Clean Architecture on NestJS

- The backend is built with NestJS and MUST follow Clean Architecture with four layers:
  - **domain**: entities and repository contracts. No framework or ORM imports.
  - **application**: use cases that hold the business logic, depending only on domain.
  - **infrastructure**: Prisma-based implementations of the domain repository contracts, plus
    the mappers and Prisma client service they use.
  - **presentation**: NestJS controllers and DTOs that receive input and call use cases.
- Dependencies MUST point inward only: presentation and infrastructure → application → domain.
  An inner layer MUST NOT import from an outer layer.
- The domain and application layers MUST NOT import NestJS (`@nestjs/*`) or any ORM/database
  code, including decorators such as `@Injectable()` or `@Inject()`.
- The ORM is Prisma. Database models MUST be defined in `prisma/schema.prisma`.
- Prisma-generated types (anything from `@prisma/client` or the generated client) MUST NOT leave
  the infrastructure layer. Repository implementations MUST convert Prisma models to domain
  entities (and back) through mappers, and MUST accept and return domain types only.
- Domain repository contracts MUST be abstract classes, not TypeScript interfaces. The abstract
  class itself is the NestJS injection token; `Symbol` or string tokens MUST NOT be used.
- Each feature's `.module.ts` is its composition root and the only file allowed to import from
  every layer. It MUST:
  - bind each repository contract to its implementation
    (e.g., `{ provide: TodoRepository, useClass: PrismaTodoRepository }`);
  - provide each use case with a factory provider that injects the abstract-class tokens
    (`useFactory` + `inject`), since use cases cannot carry NestJS decorators.
- Controllers MUST NOT contain business logic or access repositories directly; they map DTOs to
  use-case input and use-case output to responses.
- Within this structure, code MUST follow SOLID principles and apply recognized design patterns
  (e.g., Repository, Use Case, Mapper, Dependency Injection, Factory, Strategy). The patterns
  used MUST be named in the feature plan, and any deviation MUST be justified there.

**Rationale**: Keeping business rules free of framework and database code makes them easy to
change, reuse, and maintain. Abstract classes survive TypeScript compilation, so they work as
injection tokens without extra token constants, and confining Prisma types to infrastructure
keeps the ORM replaceable.

### II. Impact Analysis Before Change

- Before implementing any new task or feature, the implementer MUST scan the codebase and list
  every existing function, module, and feature the change touches or depends on.
- The impact analysis MUST be recorded in the plan or task notes before code is written, covering
  affected call sites, shared types/contracts, and existing tests, if any.
- Changes that alter an existing function's signature or behavior MUST update all of its callers
  in the same change.

**Rationale**: Knowing the blast radius up front prevents regressions and hidden breakage.

### III. File Naming Convention

- This principle applies to backend source files only. Frontend conventions will be added when
  frontend work starts.
- Backend source files MUST be named `<name>.<role>.ts`, where `<name>` is lowercase kebab-case
  and `<role>` identifies the file's responsibility.
- Role suffixes by layer:

  | Layer          | Suffix                               | Example                     |
  | -------------- | ------------------------------------ | --------------------------- |
  | domain         | `.entity.ts`                         | `todo.entity.ts`            |
  | domain         | `.repository.ts` (abstract class)    | `todo.repository.ts`        |
  | application    | `.use-case.ts`                       | `create-todo.use-case.ts`   |
  | infrastructure | `.repository.ts` (implementation)    | `prisma-todo.repository.ts` |
  | infrastructure | `.mapper.ts` (Prisma model ↔ entity) | `todo.mapper.ts`            |
  | infrastructure | `.service.ts` (Prisma client only)   | `prisma.service.ts`         |
  | presentation   | `.controller.ts`                     | `todo.controller.ts`        |
  | presentation   | `.dto.ts`                            | `create-todo.dto.ts`        |
  | feature root   | `.module.ts`                         | `todo.module.ts`            |

- A repository implementation MUST be named with the `prisma-` prefix
  (e.g., `prisma-todo.repository.ts`) to distinguish it from the domain contract.
- `.service.ts` is reserved for `prisma.service.ts`; no other file MAY use this suffix.
- Files of the same role MUST use the same suffix throughout the project; a new role suffix MUST
  be added to this table before first use.

**Rationale**: A predictable naming scheme makes every file's purpose and layer obvious at a
glance and keeps the project navigable.

### IV. Dependency Approval (NON-NEGOTIABLE)

- No new library or dependency (runtime or development) MAY be installed without explicit
  approval from the user first.
- Each request MUST state the package name, why it is needed, and what alternatives exist
  (including implementing it without a new dependency).
- Upgrading or removing an existing dependency follows the same approval rule.

**Rationale**: Every dependency adds maintenance, security, and size cost; the user keeps full
control over what enters the project.

## Code Organization Standards

- Backend code is grouped by feature module; each module contains `domain/`, `application/`,
  `infrastructure/`, and `presentation/` folders plus its `.module.ts`, following Principles I
  and III.
- Shared logic MUST live in a dedicated shared module that follows the same layer rules, rather
  than be duplicated across features. `prisma.service.ts` lives in the shared module's
  `infrastructure/` folder.

## Development Workflow

1. Specify the feature, then plan it, naming the layers touched and the design patterns used
   (Principle I).
2. Run and record the impact analysis before any implementation task starts (Principle II).
3. If the plan needs a new dependency, stop and ask the user before installing (Principle IV).
4. Implement with files named per Principle III.
5. Review checks compliance with all four principles, including the inward-only dependency rule
   and that no Prisma type leaves infrastructure, before the change is merged.

Automated tests are not required at this stage; plans and tasks MUST NOT add testing work unless
the user requests it.

## Governance

- This constitution supersedes other development practices; conflicts are resolved in its favor.
- Amendments require a documented change, user approval, and an updated version below.
- Versioning follows semantic versioning: MAJOR for removing or redefining a principle, MINOR for
  adding a principle or section or materially expanding guidance, PATCH for clarifications.
- Every plan and review MUST verify compliance with the Core Principles; any justified exception
  MUST be recorded in the plan.

**Version**: 2.1.0 | **Ratified**: 2026-11-22 | **Last Amended**: 2026-11-22
