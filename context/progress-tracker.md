# Progress Tracker

## Current Phase

- Phase 7: UI/UX Onboarding & Reliability (Infrastructure Complete)

## Current Goal

- Transition from infrastructure stabilization to core feature enhancements (RAG or Payments).

## Completed

- **Sprint 7: Phase 1 (UI/UX & Onboarding)**:
    - Implemented `PublicRoute` to redirect authenticated users away from login/register.
    - Added dismissible `WelcomeBanner` on the Dashboard for new user guidance.
    - Created `UpgradeModal` and integrated it into Solver, Generator, and Resources for quota limit handling.
- **Sprint 7: Phase 2 (Infrastructure & Reliability)**:
    - **Dockerized Frontend**: Multi-stage build with Nginx integrated into `docker-compose.yml` (Port 3001).
    - **Worker Reliability**: Implemented `after_job_end` and `on_job_start` hooks in ARQ to prevent status deadlock on crashes.
    - **Transaction Integrity**: Refactored resource upload to ensure storage files are deleted if DB transactions fail.
    - **LLM Resilience**: Implemented exponential backoff retries (2s, 4s, 8s) in `OpenRouterClient` for all API calls.
    - **Production Deployment**: VPS updated and live with unified Docker setup behind system Nginx reverse proxy.
- **Phase 6: Deployment**:
    - Initial VPS Deployment (Hetzner, Nginx, SSL) finalized.
- **Phase 5: Sample Paper Generator**:
    - **Backend**: Pydantic schemas, `papers` router, and full background generation logic.
    - **Worker**: `generate_paper_task` with detailed debug logging and robust cancellation.
    - **Frontend**: Interactive Generator dashboard with multi-resource selection.
    - **Format Detection**: AI-powered extraction of exam patterns, editable via UI.
    - **PDF Export**: Dual export modes (Study Guide & Question Paper) via WeasyPrint + Jinja2.
- **Phase 4: PYQ Solver**:
    - Real-time chat interface with markdown rendering.
    - SSE (Server-Sent Events) backend routing for token streaming.
- **Phase 3: Resource Management**:
    - DigitalOcean Spaces integration for S3-compatible storage.
    - Vision-model-based text extraction (Gemini 1.5 Flash).
- **Phase 2: Authentication**: Full-stack JWT and Google OAuth logic.

## In Progress

- Sprint 7: Planning Phase 3 (Core Enhancements).

## Next Up

1. **In-house RAG**: Implement LangChain + ChromaDB for chunked vector search (highly recommended for cost/scale).
2. **Payment Integration**: Connect Razorpay to the Upgrade Modal for premium subscriptions.
3. **Landing Page**: Build the "PrepAI" landing page based on the approved spec.

## Architecture Decisions

- **Dockerized Frontend**: Moved from static hosting to a containerized Nginx service for unified deployment.
- **Global Worker Hooks**: Used `after_job_end` as a safety net for unexpected task failures.
- **Client-Side Retry**: Moved LLM retry logic into the backend client to centralize resilience.
- **No RAG (Current)**: Currently passing full document text; transition to Vector RAG is the next major architectural shift.

## Session Notes

- Sprint 7: Infrastructure and Reliability phase fully verified and live.
- Frontend is now served via Docker on port 3001.
- App is stable, resilient to crashes, and handles quota limits gracefully.
