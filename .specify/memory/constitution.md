<!--
Sync Impact Report
- Version change: 1.0.0 → 2.0.0 (MAJOR: Principle I redefined; business logic moves from
  services to use cases)
- Modified principles:
  - I. Design-Pattern-Driven Implementation → I. Clean Architecture on NestJS
  - III. File Naming Convention: added layer-specific role suffixes
  - II. Impact Analysis Before Change: "tests" → "existing tests, if any" (no testing requirement)
- Added sections: none
- Removed sections: none
- Other changes: Code Organization Standards now uses the four layer folders;
  Development Workflow states that automated tests are not required for now
- Templates: not modified (dependent templates read this file at runtime)
- Follow-up TODOs: none
-->

# Todo App Constitution

## Core Principles

### I. Clean Architecture on NestJS

- The backend is built with NestJS and MUST follow Clean Architecture with four layers:
  - **domain**: entities and repository interfaces. No framework or ORM imports.
  - **application**: use cases that hold the business logic, depending only on domain.
  - **infrastructure**: ORM/database implementations of the domain repository interfaces.
  - **presentation**: NestJS controllers and DTOs that receive input and call use cases.
- Dependencies MUST point inward only: presentation and infrastructure → application → domain.
  An inner layer MUST NOT import from an outer layer.
- The domain and application layers MUST NOT import NestJS (`@nestjs/*`) or any ORM/database
  code, including decorators such as `@Injectable()` or `@Inject()`.
- Each feature's `.module.ts` is its composition root: it binds repository interfaces to their
  infrastructure implementations and provides use cases (e.g., via factory providers). It is the
  only place allowed to import from every layer.
- Controllers MUST NOT contain business logic or access repositories directly; they map DTOs to
  use-case input and use-case output to responses.
- Within this structure, code MUST follow SOLID principles and apply recognized design patterns
  (e.g., Repository, Use Case, Dependency Injection, Factory, Strategy). The patterns used MUST
  be named in the feature plan, and any deviation MUST be justified there.

**Rationale**: Keeping business rules free of framework and database code makes them easy to
change, reuse, and maintain, and lets the framework or ORM be replaced without touching them.

### II. Impact Analysis Before Change

- Before implementing any new task or feature, the implementer MUST scan the codebase and list
  every existing function, module, and feature the change touches or depends on.
- The impact analysis MUST be recorded in the plan or task notes before code is written, covering
  affected call sites, shared types/contracts, and existing tests, if any.
- Changes that alter an existing function's signature or behavior MUST update all of its callers
  in the same change.

**Rationale**: Knowing the blast radius up front prevents regressions and hidden breakage.

### III. File Naming Convention

- Source files MUST be named `<name>.<role>.ts`, where `<name>` is lowercase kebab-case and
  `<role>` identifies the file's responsibility.
- Role suffixes by layer:

  | Layer | Suffix | Example |
  |-------|--------|---------|
  | domain | `.entity.ts` | `todo.entity.ts` |
  | domain | `.repository.ts` (interface) | `todo.repository.ts` |
  | application | `.use-case.ts` | `create-todo.use-case.ts` |
  | infrastructure | `.repository.ts` (implementation) | `<orm>-todo.repository.ts` |
  | presentation | `.controller.ts` | `todo.controller.ts` |
  | presentation | `.dto.ts` | `create-todo.dto.ts` |
  | feature root | `.module.ts` | `todo.module.ts` |

- A repository implementation MUST be distinguishable from its interface by its layer folder and
  a technology prefix in `<name>` (e.g., the ORM name).
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

- Code is grouped by feature module; each module contains `domain/`, `application/`,
  `infrastructure/`, and `presentation/` folders plus its `.module.ts`, following Principles I
  and III.
- Shared logic MUST live in a dedicated shared module that follows the same layer rules, rather
  than be duplicated across features.

## Development Workflow

1. Specify the feature, then plan it, naming the layers touched and the design patterns used
   (Principle I).
2. Run and record the impact analysis before any implementation task starts (Principle II).
3. If the plan needs a new dependency, stop and ask the user before installing (Principle IV).
4. Implement with files named per Principle III.
5. Review checks compliance with all four principles, including the inward-only dependency rule,
   before the change is merged.

Automated tests are not required at this stage; plans and tasks MUST NOT add testing work unless
the user requests it.

## Governance

- This constitution supersedes other development practices; conflicts are resolved in its favor.
- Amendments require a documented change, user approval, and an updated version below.
- Versioning follows semantic versioning: MAJOR for removing or redefining a principle, MINOR for
  adding a principle or section or materially expanding guidance, PATCH for clarifications.
- Every plan and review MUST verify compliance with the Core Principles; any justified exception
  MUST be recorded in the plan.

**Version**: 2.0.0 | **Ratified**: 2026-11-22 | **Last Amended**: 2026-11-22
