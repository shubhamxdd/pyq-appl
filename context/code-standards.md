# Code Standards

## General

- Keep modules small and single-purpose.
- Use Python's `async` capabilities for all I/O bound tasks (API calls, DB, storage).
- Strictly follow the "No RAG" approach—pass document text directly to prompts.

## TypeScript / Frontend

- Use TypeScript for all components and logic.
- React components should be modular and located in `src/components/`.
- Handle theme state using a robust provider (e.g., `next-themes` pattern or simple React context).

## Python / Backend

- **FastAPI** with Pydantic v2.
- **SQLAlchemy 2.0** for all DB interactions.
- All OpenRouter calls should be wrapped in a dedicated service to allow model switching easily.
- Extensive error handling for third-party API failures (OpenRouter, R2).

## Styling

- Use TailwindCSS. Use the defined color tokens from `ui-context.md`.
- Ensure all components have appropriate `dark:` styles.

## API Routes

- Automatic routing: Use a consistent header or response field to notify the frontend if a job is moved to background processing.
- All routes must be protected by authentication.
- **Fail-Fast**: Validate resource ownership and selection counts before starting long-running tasks.

## Data and Storage

- Extracted text from resources is stored in the `resources` table (or a related `resource_content` table) as `TEXT`.
- PDF generation uses Jinja2 templates for full layout control.
- **Job Audit**: Every ARQ worker task must update its corresponding record in the `jobs` table to track status (`queued`, `running`, `done`, `failed`).
