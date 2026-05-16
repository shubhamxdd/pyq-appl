# Progress Tracker

## Current Phase

- Phase 2: Auth & User Management (In Progress)

## Current Goal

- Implement User Authentication (Email/Password + Google OAuth).

## Completed

- **Initial context setup**: Populated `context/` with updated decisions.
- **Git Initialization**: Repository initialized with `.gitignore`.
- **Backend Scaffolding**: 
    - Folder structure created.
    - `Dockerfile` and `docker-compose.yml` configured (Port 8001).
    - SQLAlchemy models defined.
    - Database and Redis connectivity verified.
- **Frontend Scaffolding**:
    - Vite + React + TypeScript project initialized.
    - Tailwind CSS v4 configured.
- **Infrastructure Verification**: API and Workers confirmed running in Docker.

## In Progress

- Designing the Auth strategy for Python + React.

## Next Up

1. **Authentication**:
    - Implement JWT-based auth in FastAPI.
    - Setup Google OAuth 2.0.
    - Create Login/Register UI in React.
2. **Resource Management**:
    - File upload service (R2).
    - PDF text extraction service.

## Open Questions

- **Auth Framework**: Since we switched to Python, do you want to use a Python-native auth (like FastAPI Users) instead of "Better Auth" (which is JS-only)?
- **Model Selection**: Which specific OpenRouter models to prioritize? (Suggesting Claude 3.5 Sonnet).

## Architecture Decisions

- **No RAG**: MVP will pass full document text to LLM to simplify infrastructure.
- **Automatic Delivery**: System handles switch between SSE and ARQ background polling.
- **Python Backend**: Port 8001 (Port 8000 had host conflicts).

## Session Notes

- Infrastructure is stable. API is responsive at http://localhost:8001.
