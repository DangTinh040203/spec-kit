# Feature Specification: Todo Backend API

**Feature Branch**: `001-todo-backend-api`

**Created**: 2026-11-22

**Status**: Draft

**Input**: User description: "Build the backend API for a personal todo app. No user interface in this phase; a frontend will consume this API later. A todo has a title (required, 1–200 characters), an optional description, an optional due date, a completed/not-completed status, and creation/update timestamps. The API client can: create a todo, list todos, get one todo, update a todo's fields, mark a todo completed or not completed, and delete a todo permanently. Listing supports filtering by status (all / active / completed), sorting by creation date or due date, and pagination. Invalid input and requests for non-existent todos return clear, consistent error responses. Single user, no authentication in this version."

## User Scenarios & Testing _(mandatory)_

The "user" in this phase is an API client (later, the frontend) acting on behalf of a single
person who manages their own todos.

### User Story 1 - Create and view todos (Priority: P1)

The client creates a todo with a title and, optionally, a description and a due date. It can then
fetch that todo by its identifier and see all of its details, including its status and timestamps.

**Why this priority**: Without creating and reading todos, nothing else in the app has value. This
alone is a usable minimum: a person can record tasks and look them up.

**Independent Test**: Create a todo, then fetch it by its identifier and confirm every field
matches what was sent, the status is "not completed", and both timestamps are set.

**Acceptance Scenarios**:

1. **Given** no todos exist, **When** the client creates a todo with the title "Buy milk",
   **Then** the todo is saved and returned with a unique identifier, the title "Buy milk", no
   description, no due date, status "not completed", and creation and update timestamps.
2. **Given** the client sends a title, a description, and a due date, **When** the todo is created,
   **Then** all three values are saved and returned exactly as sent.
3. **Given** a todo exists, **When** the client fetches it by its identifier, **Then** the full
   todo is returned.
4. **Given** the client sends an empty title, a title of only spaces, or a title over 200
   characters, **When** it tries to create a todo, **Then** nothing is saved and a validation
   error names the title field and explains the rule.
5. **Given** no todo has a given identifier, **When** the client fetches it, **Then** a
   "not found" error is returned.

---

### User Story 2 - List, filter, sort, and page through todos (Priority: P2)

The client gets a list of todos. It can show only active or only completed todos, order them by
creation date or due date, and fetch them one page at a time.

**Why this priority**: Once a person has more than a handful of todos, they need to see them as a
list and narrow it down. This depends on todos existing (Story 1) but on nothing else.

**Independent Test**: Create a mix of completed and active todos with different due dates, then
request lists with each filter, each sort option, and different pages, and confirm the contents
and order of every response.

**Acceptance Scenarios**:t

1. **Given** 5 active and 3 completed todos exist, **When** the client lists with status "all",
   "active", or "completed", **Then** it receives 8, 5, or 3 todos respectively.
2. **Given** several todos exist, **When** the client lists without any options, **Then** it
   receives all statuses, newest-created first, on the first page with the default page size.
3. **Given** todos with different due dates and some with no due date, **When** the client sorts
   by due date ascending, **Then** todos are ordered earliest due first and todos without a due
   date come last.
4. **Given** 45 todos exist and the page size is 20, **When** the client requests page 3,
   **Then** it receives the last 5 todos plus the total count (45), the page number, the page
   size, and the total number of pages (3).
5. **Given** 10 todos exist, **When** the client requests a page beyond the last one, **Then** it
   receives an empty list with the correct total count, not an error.
6. **Given** the client sends an unknown status, an unknown sort field, a page number below 1, or
   a page size outside the allowed range, **When** it lists todos, **Then** a validation error
   names the invalid option.

---

### User Story 3 - Mark a todo completed or not completed (Priority: P2)

The client marks a todo as completed when the person finishes it, and can mark it as not
completed again.

**Why this priority**: Tracking what is done is the core purpose of a todo app, but it builds on
Story 1 and is most useful together with the status filter in Story 2.

**Independent Test**: Create a todo, mark it completed, fetch it and confirm the status changed
and the update timestamp moved forward; then mark it not completed and confirm again.

**Acceptance Scenarios**:

1. **Given** an active todo, **When** the client marks it completed, **Then** its status is
   "completed" and its update timestamp is later than before.
2. **Given** a completed todo, **When** the client marks it not completed, **Then** its status is
   "not completed".
3. **Given** a completed todo, **When** the client marks it completed again, **Then** the request
   succeeds and the todo stays completed.
4. **Given** no todo has a given identifier, **When** the client changes its status, **Then** a
   "not found" error is returned.

---

### User Story 4 - Update a todo's details (Priority: P3)

The client changes a todo's title, description, or due date. It sends only the fields it wants
to change, and it can clear the description or the due date.

**Why this priority**: Fixing typos and moving deadlines matters, but a person can work around it
at first by deleting and re-creating a todo.

**Independent Test**: Create a todo, update only its due date, and confirm the due date changed
while the title and description stayed the same; then clear the description and confirm it is
empty.

**Acceptance Scenarios**:

1. **Given** a todo, **When** the client sends only a new title, **Then** only the title changes
   and the update timestamp moves forward; the creation timestamp does not change.
2. **Given** a todo with a description and a due date, **When** the client sets them to empty,
   **Then** the todo has no description and no due date.
3. **Given** a todo, **When** the client sends an invalid title or an invalid due date, **Then**
   nothing changes and a validation error names the field.
4. **Given** a todo, **When** the client sends an update with no fields, **Then** a validation
   error says at least one field is required.
5. **Given** no todo has a given identifier, **When** the client updates it, **Then** a
   "not found" error is returned.

---

### User Story 5 - Delete a todo (Priority: P3)

The client deletes a todo the person no longer wants. Deletion is permanent.

**Why this priority**: Useful for keeping the list clean, but the app still works without it.

**Independent Test**: Create a todo, delete it, then confirm that fetching it returns "not found"
and it no longer appears in any list.

**Acceptance Scenarios**:

1. **Given** a todo exists, **When** the client deletes it, **Then** the request succeeds and the
   todo can no longer be fetched, listed, updated, or deleted.
2. **Given** no todo has a given identifier, **When** the client deletes it, **Then** a
   "not found" error is returned.

---

### Edge Cases

- A title with leading or trailing spaces is trimmed before it is checked and saved; a title that
  is only spaces is rejected.
- A title of exactly 1 or exactly 200 characters is accepted; 201 characters is rejected. Length
  is counted in characters as a person reads them, so accented and non-Latin text (for example,
  Vietnamese) counts correctly.
- A description longer than 2,000 characters is rejected.
- A due date that is not a valid calendar date (for example, February 30) is rejected. A due date
  in the past is accepted, since a person may log an overdue task.
- An identifier that is malformed (not in the format the system issues) gets the same
  "not found" error as an identifier that simply does not exist.
- A request containing fields the system does not recognize is rejected with a validation error
  that names those fields, so client mistakes are caught early.
- A request that is not well-formed (for example, a body that cannot be parsed) gets a clear
  error in the same format as other errors.
- When two todos have the same sort value (for example, the same due date), they are ordered by
  creation date, newest first, so the order is stable across pages.
- A list request when no todos exist returns an empty list with a total count of 0.

## Requirements _(mandatory)_

### Functional Requirements

**Todo data**

- **FR-001**: Each todo MUST have a unique identifier assigned by the system when it is created.
- **FR-002**: Each todo MUST have a title of 1–200 characters after trimming leading and trailing
  spaces.
- **FR-003**: Each todo MAY have a description of up to 2,000 characters.
- **FR-004**: Each todo MAY have a due date, which is a calendar date without a time of day.
- **FR-005**: Each todo MUST have a status of either "completed" or "not completed"; new todos
  MUST start as "not completed".
- **FR-006**: Each todo MUST have a creation timestamp, set once by the system and never changed,
  and an update timestamp, set by the system on creation and on every successful change.
- **FR-007**: The client MUST NOT be able to set the identifier, status (on create), or either
  timestamp directly.

**Operations**

- **FR-008**: The client MUST be able to create a todo by providing a title and, optionally, a
  description and a due date. The created todo MUST be returned in full.
- **FR-009**: The client MUST be able to fetch a single todo by its identifier.
- **FR-010**: The client MUST be able to update any combination of title, description, and due
  date in one request, changing only the fields it sends. Sending an empty value for the
  description or due date MUST clear it. The updated todo MUST be returned in full.
- **FR-011**: The client MUST be able to set a todo's status to "completed" or "not completed".
  Setting a status the todo already has MUST succeed without error. The updated todo MUST be
  returned in full.
- **FR-012**: The client MUST be able to delete a todo permanently. A deleted todo MUST NOT be
  recoverable or appear in any later response.

**Listing**

- **FR-013**: The client MUST be able to list todos filtered by status: "all" (default),
  "active" (not completed), or "completed".
- **FR-014**: The client MUST be able to sort the list by creation date or due date, in ascending
  or descending order. The default MUST be creation date, newest first.
- **FR-015**: When sorting by due date, todos without a due date MUST come after all todos with a
  due date, in both ascending and descending order.
- **FR-016**: Todos with equal sort values MUST be ordered by creation date, newest first, so the
  order is the same every time.
- **FR-017**: The list MUST be paginated by page number and page size. The default page is 1, the
  default page size is 20, and the page size MUST be between 1 and 100.
- **FR-018**: Each list response MUST include the todos on the page, the total number of matching
  todos, the current page number, the page size, and the total number of pages.

**Errors**

- **FR-019**: Every error response MUST use one consistent format containing a stable
  machine-readable error code, a human-readable message, and, for validation errors, a list of
  the fields that failed with the reason for each.
- **FR-020**: All invalid input MUST be rejected with a validation error, and no data MUST change
  as a result of a rejected request. All validation problems in one request MUST be reported
  together, not one at a time.
- **FR-021**: A request for a todo that does not exist, including one with a malformed
  identifier, MUST return a "not found" error.
- **FR-022**: Unexpected failures MUST return a generic error in the same format, without
  exposing internal details.

**Access**

- **FR-023**: The API MUST serve a single user and MUST NOT require authentication in this
  version.

### Key Entities

- **Todo**: One task the person wants to do. Attributes: identifier, title, description
  (optional), due date (optional, date only), status (completed or not completed), creation
  timestamp, update timestamp. There are no relationships to other entities in this version.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A client developer can perform all six operations (create, list, get, update,
  change status, delete) using only the documented request and response formats, with no
  undocumented behavior needed.
- **SC-002**: 100% of invalid requests in the acceptance scenarios and edge cases above are
  rejected with an error in the single consistent format, and none of them changes stored data.
- **SC-003**: Every response for a single-todo operation completes in under 1 second, and a list
  page completes in under 1 second with up to 10,000 todos stored.
- **SC-004**: Paging through all todos with any filter and sort returns every matching todo
  exactly once, with no duplicates or gaps.
- **SC-005**: A client developer can identify what went wrong and how to fix it from the error
  response alone (error code, message, and field details) for every validation error.
- **SC-006**: Todos survive a restart of the service with no data loss.

## Assumptions

- The only consumer is a single API client (later, a frontend); there are no other users, roles,
  or sharing in this version.
- No authentication or authorization is included; the API is expected to run in a trusted
  environment (for example, locally or behind a private network) until authentication is added.
- Due dates are calendar dates without a time or time zone; timestamps are stored and returned
  in a single standard time zone (UTC).
- The description limit of 2,000 characters and the page size range of 1–100 (default 20) are
  reasonable defaults for a personal todo app and can be adjusted later.
- Deletion is a hard delete; there is no trash, undo, or archive.
- Search by text, tags, priorities, subtasks, reminders, and recurring todos are out of scope for
  this version.
- Data is stored persistently, so todos remain available across restarts.
