# Progress Tracker

## Current Phase

- Phase 7: UI/UX Onboarding & Reliability (Infrastructure Complete)

## Current Goal

- Transition from infrastructure stabilization to core feature enhancements.

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
- **Phase 6: Deployment**: Initial VPS Deployment finalized.
- **Phase 5: Sample Paper Generator**: Backend, Worker, and Frontend flows complete with PDF export.
- **Phase 4: PYQ Solver**: Real-time chat interface with SSE token streaming.

## In Progress

- Sprint 7: Planning Core Enhancements & Roadmap.

## Next Up (Priority Tasks)

1.  **In-house RAG (Vector Search):** Implement LangChain + ChromaDB pipeline to support larger documents and reduce API costs.
2.  **Payment Integration (Razorpay):** Connect the frontend checkout to a backend webhook to automate plan upgrades.
3.  **Full Landing Page Build:** Transform the `/` route from a placeholder into the high-converting "PrepAI" marketing site.
4.  **Backend Migration Evaluation:** Analyze and potentially implement a migration from FastAPI/Python to Node.js/Express for a unified TypeScript stacSupport** for mobile "installability."
    - Add **Google Profile Pictures** in the sidebar.
    - Build a **Forgotk.
5.  **UX Polish Pack:** 
    - Implement **PWA  Password** flow with email verification.

## Architecture Decisions

- **Dockerized Frontend**: Containerized Nginx service for unified deployment.
- **Path-Based Separation**: `/` reserved for Landing Page, `/dashboard` for the main application.
- **Global Worker Hooks**: Safety net for unexpected task failures.
- **Client-Side Retry**: Exponential backoff for LLM API resilience.

## Session Notes

- Infrastructure and Reliability phase fully verified and live.
- Routing refactored to support a future landing page at the root domain.
- Roadmap updated with 5 major upcoming objectives.
