# Feature Specification: Kanban Board

**Feature Branch**: `002-kanban-board`

**Created**: 2026-11-23

**Status**: Draft

**Input**: User description: "Build a kanban board for the todo app so a person can see and organize their todos visually. This is the first user-facing screen of the app; it uses the existing todo backend (feature 001) and extends it where needed. The board has three columns: \"To do\", \"In progress\", and \"Done\". Every todo appears in exactly one column, based on its status. This replaces the current two-state status (completed / not completed) with three states; existing \"not completed\" todos go to \"To do\" and \"completed\" todos go to \"Done\". The person can: see all todos as cards in their column, showing title, due date (if any), and a visual hint when the due date has passed; drag a card to another column to change its status; drag a card up or down within a column to change its order; the order is saved and stays the same after reloading the page; create a new todo directly in a column; open a card to view and edit its title, description, and due date, or delete it. When a drag fails to save (for example, the server is unreachable), the card returns to its original place and the person sees a clear message. The board should be usable on desktop with a mouse; touch/mobile drag is not required in this version. Keyboard users must be able to move cards between columns without dragging. Single user, no authentication. Out of scope: custom columns, swimlanes, WIP limits, multiple boards, real-time sync between browser tabs."

## Clarifications

### Session 2026-11-26

- Q: Feature 001 now defines three statuses, positions, and a move operation. Does this feature
  still change the backend's status model or convert data? → A: No. The status model, status
  filter, positions, and move operation come from feature 001; the earlier requirements for a
  status conversion (FR-003) and its success criterion (SC-007) are replaced by relying on 001.

## User Scenarios & Testing _(mandatory)_

The user is a single person managing their own todos in a desktop web browser. This feature
builds on the todo backend from feature 001 (`specs/001-todo-backend-api/spec.md`), which already
provides the three statuses, a saved position within each status, and a move operation (see the
001 clarification of 2026-11-26).

### User Story 1 - See all todos on a board (Priority: P1)

The person opens the app and sees a board with three columns, "To do", "In progress", and
"Done". Every todo appears as a card in the column that matches its status, in the saved order.
Each card shows the title and, if set, the due date; cards whose due date has passed are
visibly marked as overdue.

**Why this priority**: Seeing todos at a glance is the foundation of the board. Every other story
acts on cards that this story displays, and on its own it already replaces a plain list view.

**Independent Test**: Store a set of todos with each of the three statuses, some with due dates
in the past, today, and the future, and some without. Open the board and confirm every todo
appears exactly once, in the right column, in the saved order, with the correct title, due date,
and overdue marking.

**Acceptance Scenarios**:

1. **Given** todos exist with statuses "to do", "in progress", and "done", **When** the person
   opens the board, **Then** each todo appears as a card in exactly one column matching its
   status.
2. **Given** a todo has a due date, **When** its card is shown, **Then** the card displays the
   due date; **Given** a todo has no due date, **Then** no date is shown.
3. **Given** a todo in "To do" or "In progress" has a due date earlier than today, **When** its
   card is shown, **Then** the card is visibly marked as overdue in a way that does not rely on
   color alone.
4. **Given** a todo's due date is today or later, or the todo is in "Done", **When** its card is
   shown, **Then** it is not marked as overdue.
5. **Given** a column has no todos, **When** the board is shown, **Then** the column is still
   shown with an empty-state message.
6. **Given** the todos cannot be loaded (for example, the server is unreachable), **When** the
   person opens the board, **Then** a clear message explains that the board could not be loaded
   and offers a way to try again.
7. **Given** todos exist in each status with saved positions, **When** the person opens the
   board, **Then** every todo appears in its status's column in its saved order, with no todo
   missing.

---

### User Story 2 - Move cards between columns (Priority: P1)

The person drags a card from one column to another to change its status, for example from
"To do" to "In progress" when they start a task. A person using only the keyboard can do the
same without dragging.

**Why this priority**: Moving work across stages is the core purpose of a kanban board. Without
it, the board is read-only.

**Independent Test**: Drag a card from "To do" to "In progress", reload the page, and confirm it
is still in "In progress". Then, using only the keyboard, move a card from "In progress" to
"Done", reload, and confirm again.

**Acceptance Scenarios**:

1. **Given** a card in "To do", **When** the person drags it into "In progress" and drops it,
   **Then** the card appears in "In progress" at the drop position and the todo's status is saved
   as "in progress".
2. **Given** a card was moved to another column, **When** the person reloads the page, **Then**
   the card is in the new column at the same position.
3. **Given** a card has keyboard focus, **When** the person uses the keyboard move action and
   chooses another column, **Then** the card moves to that column and the status is saved, without
   any mouse use.
4. **Given** a card was moved with the keyboard, **When** the move completes, **Then** keyboard
   focus stays on the moved card and the change is announced to screen reader users.
5. **Given** the person starts dragging a card, **When** they drop it outside any column or press
   Escape, **Then** the card returns to its original place and nothing is saved.
6. **Given** the move cannot be saved (for example, the server is unreachable), **When** the save
   fails, **Then** the card returns to its original column and position and the person sees a
   clear message that the move was not saved.

---

### User Story 3 - Reorder cards within a column (Priority: P2)

The person drags a card up or down within a column to set its priority order. The order is saved
and stays the same after reloading the page.

**Why this priority**: Ordering lets the person show what matters most, but the board is already
useful with status changes alone.

**Independent Test**: In a column with at least three cards, drag the bottom card to the top,
reload, and confirm the new order is kept and no other column changed.

**Acceptance Scenarios**:

1. **Given** a column with cards A, B, C (top to bottom), **When** the person drags C above A,
   **Then** the column shows C, A, B and that order is saved.
2. **Given** a column was reordered, **When** the person reloads the page, **Then** the column
   shows the same order.
3. **Given** a card is dropped back in its original position, **When** the drop completes,
   **Then** nothing changes and no error is shown.
4. **Given** the new order cannot be saved, **When** the save fails, **Then** the column returns
   to its previous order and the person sees a clear message.

---

### User Story 4 - Create a todo in a column (Priority: P2)

The person adds a new todo directly in any column by typing its title. The new todo gets that
column's status.

**Why this priority**: The board must let the person add work without leaving it, but they can
already see and organize existing todos without this.

**Independent Test**: Add a todo in "In progress", reload, and confirm it appears in
"In progress" at the top with the entered title.

**Acceptance Scenarios**:

1. **Given** the board is shown, **When** the person chooses "add" in the "In progress" column,
   enters a title, and confirms, **Then** a new card appears at the top of "In progress" and the
   todo is saved with status "in progress".
2. **Given** the person is adding a todo, **When** they confirm with an empty title, a title of
   only spaces, or a title over 200 characters, **Then** nothing is saved and a message explains
   the title rule.
3. **Given** the person is adding a todo, **When** they cancel (for example, press Escape),
   **Then** no todo is created.
4. **Given** the todo cannot be saved, **When** the save fails, **Then** no card is added, the
   entered title is kept so the person can retry, and a clear message is shown.

---

### User Story 5 - View, edit, and delete a todo (Priority: P3)

The person opens a card to see all of its details, edit its title, description, and due date,
or delete it.

**Why this priority**: Editing details and removing todos matter, but the board delivers its main
value (seeing and organizing work) without them.

**Independent Test**: Open a card, change its title and due date, clear its description, save,
reload, and confirm the changes; then open another card, delete it after confirming, reload,
and confirm it is gone.

**Acceptance Scenarios**:

1. **Given** a card, **When** the person opens it (by click or keyboard), **Then** they see its
   title, description, due date, and status.
2. **Given** an open card, **When** the person changes the title, description, or due date and
   saves, **Then** the changes are saved and the card on the board reflects them.
3. **Given** an open card, **When** the person clears the description or due date and saves,
   **Then** the todo has no description or due date.
4. **Given** an open card, **When** the person enters an invalid title, a description over 2,000
   characters, or an invalid date, **Then** nothing is saved and a message names the field and
   explains the rule.
5. **Given** an open card with unsaved changes, **When** the person closes it without saving,
   **Then** the changes are discarded and the todo is unchanged.
6. **Given** an open card, **When** the person chooses delete and confirms, **Then** the todo is
   permanently deleted and its card disappears from the board; **When** they cancel the
   confirmation, **Then** nothing is deleted.
7. **Given** a save or delete fails, **When** the failure happens, **Then** the board keeps showing
   the todo as it was, the person's edits stay in the form, and a clear message is shown.

---

### Edge Cases

- A todo whose due date is today is not overdue; it becomes overdue starting the next day.
  "Today" is the person's local calendar date.
- A card in "Done" is never marked as overdue, even if its due date has passed.
- A card is dropped while a previous move is still being saved: each move is handled
  independently, and if one fails only that card returns to its previous place.
- A card is moved into an empty column: it becomes the only card in that column.
- A card was deleted or changed elsewhere (for example, in another browser tab) and the person
  then moves or edits it on this board: the action fails with a clear message and the board
  reloads the current data. Real-time sync between tabs is not provided.
- Very long titles (up to 200 characters) wrap or are shortened on the card without breaking the
  layout; the full title is visible when the card is opened.
- Titles with accented or non-Latin text (for example, Vietnamese) display correctly and count
  toward the 200-character limit as a person reads them.
- A todo moved to "Done" and back to "To do" keeps its title, description, and due date.
- With many cards in one column, the column scrolls on its own so the other columns stay
  visible.

## Requirements _(mandatory)_

### Functional Requirements

**Status model (provided by feature 001)**

- **FR-001**: Each todo has exactly one of three statuses: "to do", "in progress", or "done", as
  defined in feature 001 (FR-005 there). Each column shows the todos of one status.
- **FR-002**: New todos MUST start as "to do" unless they are created in a specific column, in
  which case they MUST take that column's status.
- **FR-003**: The board MUST read and change todos only through feature 001's operations
  (create with a status, change status, move, update, delete, and list sorted by position). This
  feature adds no new backend data or data conversion.
- **FR-004**: The client MUST be able to set a todo's status to any of the three values, and
  setting the status a todo already has MUST succeed without error.
- **FR-005**: The board MUST load each column using feature 001's status filter and position
  sort (FR-013, FR-014 there).

**Ordering**

- **FR-006**: Each todo MUST have a position within its column, and the board MUST show cards in
  that order.
- **FR-007**: The person MUST be able to change a card's position within its column, and the new
  order MUST be saved so it is the same after a reload.
- **FR-008**: When a card moves to another column, its status and its position in the target
  column MUST be saved together, so a card is never saved with one changed and not the other.
- **FR-009**: A newly created todo MUST be placed at the top of its column.
- **FR-010**: Changing one card's position MUST NOT change the relative order of other cards in
  any column.

**Board display**

- **FR-011**: The board MUST show three columns, in this order: "To do", "In progress", "Done".
  Each column MUST show the number of cards it holds.
- **FR-012**: Every todo MUST appear as a card in exactly one column, the one matching its status.
  The board MUST show all todos, not a paged subset.
- **FR-013**: Each card MUST show the todo's title and, if set, its due date.
- **FR-014**: A card in "To do" or "In progress" whose due date is earlier than the person's local
  current date MUST be visibly marked as overdue, using text or an icon in addition to color.
- **FR-015**: An empty column MUST show an empty-state message and MUST still accept dropped
  cards.
- **FR-016**: If the board cannot be loaded, the person MUST see a clear message and a way to
  retry.

**Moving cards**

- **FR-017**: The person MUST be able to drag a card with a mouse to another column, or to another
  position in the same column, and drop it there.
- **FR-018**: While dragging, the board MUST show where the card will be placed if dropped.
- **FR-019**: Dropping a card outside any column, or cancelling the drag with Escape, MUST return
  the card to its original place without saving anything.
- **FR-020**: After a drop, the card MUST appear in its new place immediately, without waiting
  for the save to finish.
- **FR-021**: If saving a move fails, the card MUST return to its exact original column and
  position, and the person MUST see a clear message that the change was not saved.
- **FR-022**: A keyboard user MUST be able to move a focused card to any other column without
  dragging. After the move, focus MUST stay on the moved card. A card moved this way MUST be
  placed at the top of the target column.
- **FR-023**: Card moves made with the keyboard, and failures to save any move, MUST be announced
  to screen reader users.

**Creating, editing, and deleting**

- **FR-024**: Each column MUST offer a way to add a new todo by entering a title; the todo MUST be
  created with that column's status.
- **FR-025**: The person MUST be able to open any card, by mouse or keyboard, to view its title,
  description, due date, and status.
- **FR-026**: The person MUST be able to edit the title, description, and due date of an open
  card and save the changes; clearing the description or due date MUST remove it.
- **FR-027**: Input rules from feature 001 MUST apply and be shown to the person when broken:
  title 1–200 characters after trimming, description up to 2,000 characters, due date a valid
  calendar date (past dates allowed).
- **FR-028**: Closing an open card without saving MUST discard unsaved changes.
- **FR-029**: The person MUST be able to delete a todo from its open card, after confirming. The
  deletion is permanent.
- **FR-030**: If creating, saving, or deleting fails, the board MUST keep showing the last saved
  state, keep what the person entered so they can retry, and show a clear message.

**Interaction and access**

- **FR-031**: Every action on the board (moving between columns, adding, opening, editing,
  deleting) MUST be possible with the keyboard alone, with a visible focus indicator.
- **FR-032**: The board MUST work with a mouse in current desktop browsers. Touch and mobile
  dragging are not required in this version.
- **FR-033**: The board MUST serve a single user and MUST NOT require sign-in.

### Key Entities

- **Todo**: One task the person wants to do. Attributes from feature 001 (identifier, title,
  optional description, optional due date, status ("to do", "in progress", or "done"), position
  within its status, creation and update timestamps). This feature does not change it.
- **Board column**: A fixed view grouping all todos with one status. There are exactly three
  columns ("To do", "In progress", "Done"); they are not stored or editable.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: With up to 500 todos stored, the board shows all cards within 2 seconds of opening
  the page.
- **SC-002**: After a drop or keyboard move, the card appears in its new place within 100
  milliseconds, as perceived by the person.
- **SC-003**: 100% of moves, reorders, creations, and edits that the person sees succeed are still
  in place after reloading the page.
- **SC-004**: When the server is unreachable, 100% of failed moves return the card to its exact
  original place and show a message within 5 seconds.
- **SC-005**: A keyboard-only user can move a card from "To do" to "Done" in 5 or fewer key
  presses after the card has focus.
- **SC-006**: A first-time user can create a todo in a chosen column and move it to another
  column within 30 seconds, without instructions.
- **SC-007**: 100% of todos appear on the board in the column matching their status and in the
  same order as feature 001's list sorted by position.

## Assumptions

- Feature 001 provides the status model, positions, and move operation this board needs, so no
  backend change or data conversion is part of this feature.
- Ordering is manual only on the board; the list sorting options from feature 001 (by creation
  date or due date) remain available to API clients but do not affect the board's order.
- New todos go to the top of their column so they are immediately visible; keyboard moves to
  another column also place the card at the top.
- Reordering within a column with the keyboard is not required in this version; the
  requirement for keyboard users covers moving cards between columns.
- The board loads all todos at once; up to about 500 todos is the expected scale for a personal
  app.
- "Overdue" uses the person's local calendar date; due dates have no time of day.
- Deleting a todo requires a confirmation step because deletion is permanent and has no undo.
- Out of scope: custom or renamed columns, swimlanes, WIP limits, multiple boards, real-time sync
  between browser tabs, touch/mobile drag, sign-in, and undo.
