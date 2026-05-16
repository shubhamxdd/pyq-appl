# Progress Tracker

## Current Phase

- Phase 1: Project Scaffolding & Infrastructure (Ready to Start)

## Current Goal

- Initialize backend (FastAPI) and frontend (React) structures with the updated "No RAG" and "OpenRouter" strategy.

## Completed

- **Initial context setup**: Populated `context/` with updated decisions (Python backend, OpenRouter, Light/Dark themes, No RAG).

## In Progress

- Waiting for user's green light to begin implementation.

## Next Up

1. Backend Project Scaffold:
    - FastAPI setup.
    - Docker Compose for Postgres, Redis, and API.
    - SQLAlchemy models (User, Resource, Question, Paper, Job).
2. Frontend Project Scaffold:
    - Vite + React + Tailwind (Dark mode configured).
    - Base layouts and theme provider.

## Open Questions

- **Model Selection**: Which specific OpenRouter models to prioritize? (Suggesting Claude 3.5 Sonnet for accuracy).
- **Text Storage**: For very large PDFs (e.g., 500 pages), should we implement a basic truncation or simple "split and pass" strategy since we aren't using vector DB?

## Architecture Decisions

- **No RAG**: MVP will pass full document text to LLM to simplify infrastructure and speed up development.
- **Automatic Delivery**: The system handles the switch between SSE streaming and ARQ background polling seamlessly.
- **Python Backend**: Chosen for superior PDF text extraction (`pdfplumber`) and generation (`WeasyPrint`).

## Session Notes

- Architecture has been simplified: removed ChromaDB, LangChain, and embedding pipelines.
- UI will support both Light and Dark modes from the start.
