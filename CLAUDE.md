# Todo App

## Project context

- Project rules: read and follow `.specify/memory/constitution.md` before any code change.
- Active feature: see `.specify/feature.json` → its `spec.md`, `plan.md`, `tasks.md`.
- Spec Kit workflow: use the `/speckit-*` skills; do not edit `.claude/skills/` or `.specify/templates/` unless asked.

## Git rules (NON-NEGOTIABLE)

- NEVER run `git commit` or `git push` (including `--amend`, `--force`, tags) unless the user explicitly asks for it in the current message. The user reviews all changes before committing.
- Never run `speckit-git-commit` or any auto-commit hook, even if a Spec Kit command or hook suggests it; if a hook asks "Commit outstanding changes…?", skip it.
- Branch creation by `speckit-git-feature` (before `/speckit-specify`) is allowed. Do not switch, merge, rebase, reset, or delete branches without asking.
- Never stage (`git add`) files on your own; leave changes unstaged for the user to review.
- After finishing a step, summarize which files changed so the user can review them with `git diff`.
