# Architecture Context

## Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend | React + Vite | UI framework |
| Frontend Styling | TailwindCSS | Styling (Light + Dark support) |
| Frontend State | React Query | API state, polling |
| Backend | FastAPI (Python) | REST API, async |
| Database | PostgreSQL (SQLAlchemy 2) | Relational storage (Metadata + Extracted Text) |
| LLM Gateway | OpenRouter | Access to Claude 3.5 Sonnet, Gemini 1.5 Pro, etc. |
| Auth | Better Auth | Self-hosted auth (Email + Google) |
| Job Queue | ARQ + Redis | Async background jobs (Paper gen, extraction) |
| File Storage | Cloudflare R2 | S3-compatible file storage (Original PDFs + Exports) |
| PDF Parsing | pdfplumber | Text extraction from PDFs |
| PDF Output | WeasyPrint + Jinja2 | HTML to PDF rendering |

## System Boundaries

- `backend/app/routers/` — API endpoint handlers and request validation.
- `backend/app/services/` — Business logic (extraction, solver, generator, storage).
- `backend/app/llm/` — OpenRouter client wrappers and prompt templates.
- `backend/workers/` — ARQ background task definitions for long-running jobs.
- `frontend/src/api/` — API clients and React Query hooks.
- `frontend/src/components/` — UI components (Tailwind + Theme support).

## Storage Model

- **PostgreSQL**: Metadata for users, resources, extracted text, questions, answers, papers, and jobs.
- **Cloudflare R2**: Original uploaded PDFs and generated PDF exports.
- **Redis**: Job queue state and application caching.
- **Vector Storage**: *REMOVED for MVP*. Documents are passed directly to LLM context.

## Auth and Access Model

- Authentication via Better Auth.
- **User Isolation**: All data is scoped to `user_id`.
- Access control enforced via FastAPI dependencies for every API route.

## Invariants

1. **Text Persistence**: Extracted text must be stored in PostgreSQL immediately after parsing to avoid re-parsing.
2. **Automatic Delivery Mode**: 
    - Small Q&A responses use **Stream** mode (SSE).
    - Complex tasks (Paper Generation) use **Background** mode (ARQ) automatically.
3. **On-Demand PDF**: PDFs are generated and cached in R2 only when a user requests a download.
4. **Quota First**: Check `questions_used` before calling LLM APIs.
5. **OpenRouter Priority**: Use models with large context windows to handle full document text.
