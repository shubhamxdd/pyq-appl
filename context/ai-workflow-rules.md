# AI Workflow Rules

## Approach

Build this project incrementally using the Research -> Strategy -> Execution lifecycle. Context files define the source of truth. Always implement against these specs—do not invent behavior from scratch. Every feature must be verified with tests or manual verification scripts where applicable.

## Scoping Rules

- Work on one feature unit at a time (e.g., one API route, one component).
- Prefer small, verifiable increments.
- Do not mix frontend and backend changes in a single turn if they are complex.

## When to Split Work

Split an implementation step if it combines:
- Database schema changes and API implementation.
- Complex RAG logic and UI components.
- Background task setup and frontend polling logic.

## Handling Missing Requirements

- If a requirement is ambiguous (e.g., specific PDF layout), refer to `PLAN.md` or ask the user.
- Add any unresolved decisions to `progress-tracker.md` under "Open Questions".

## Protected Files

- Do not modify `.git`, `.env` (unless adding new vars), or system config files without clear instruction.
- Respect `.gitignore` and `.geminiignore`.

## Keeping Docs in Sync

Update `context/progress-tracker.md` after every meaningful change. If the architecture or standards evolve, update `context/architecture.md` or `context/code-standards.md` immediately.

## Before Moving to the Next Unit

1. The current unit works end to end.
2. No invariants in `architecture.md` were violated.
3. `progress-tracker.md` reflects the completed work.
4. Linting and type-checking pass if tools are available.
