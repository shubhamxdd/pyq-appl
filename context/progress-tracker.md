# Progress Tracker

## Current Phase

- Phase 3: Resource Management (Not Started)

## Current Goal

- Implement File Uploads to Cloudflare R2 and PDF Text Extraction.

## Completed

- **Initial context setup**: Populated `context/` with updated decisions.
- **Git Initialization**: Repository initialized with branch-based workflow.
- **Infrastructure**: Backend/Frontend scaffolded, Docker services running (Port 8001), `pgadmin` added.
- **Phase 2: Authentication**:
    - JWT-based registration and login implemented.
    - Protected dashboard and route guards in React.
    - Database tables created via Alembic.
    - `bcrypt` version compatibility fixed.

## In Progress

- Designing Phase 3: R2 Storage & Extraction.

## Next Up

1. **Resource Management**:
    - `POST /api/resources`: Upload file to Cloudflare R2.
    - `extraction_task`: Background job to parse PDF text via `pdfplumber`.
    - `GET /api/resources`: List user resources.
    - Frontend Resource Upload UI.

## Open Questions

- **Auth Framework**: Since we switched to Python, do you want to use a Python-native auth (like FastAPI Users) instead of "Better Auth" (which is JS-only)?
- **Model Selection**: Which specific OpenRouter models to prioritize? (Suggesting Claude 3.5 Sonnet).

## Architecture Decisions

- **No RAG**: MVP will pass full document text to LLM to simplify infrastructure.
- **Automatic Delivery**: System handles switch between SSE and ARQ background polling.
- **Python Backend**: Port 8001 (Port 8000 had host conflicts).

## Session Notes

- Infrastructure is stable. API is responsive at http://localhost:8001.
