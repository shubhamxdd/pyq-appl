# Progress Tracker

## Current Phase

- Phase 7: UI/UX Onboarding & Reliability (Infrastructure Complete)

## Current Goal

- Transition from infrastructure stabilization to core feature enhancements.

## Completed

- **Sprint 7: Phase 3 (Marketing & Identity)**:
    - **PrepAI Landing Page**: Fully implemented as a high-converting single-page layout at `/`. 
    - Replicated professional Hero section and "Meet the two superpowers" from HTML template.
    - Responsive mobile layout with overlapping mockups and float animations.
    - Integrated 3-tier INR Pricing (Standard, Pro, Elite).
    - Smooth-scroll navigation with URL hash synchronization.
- **Sprint 7: Phase 2 (Infrastructure & Reliability)**:
    - **Dockerized Frontend**: Multi-stage build with Nginx integrated into `docker-compose.yml` (Port 3001).
    - **Worker Reliability**: Implemented `after_job_end` and `on_job_start` hooks in ARQ to prevent status deadlock on crashes.
    - **Transaction Integrity**: Refactored resource upload to ensure storage files are deleted if DB transactions fail.
    - **LLM Resilience**: Implemented exponential backoff retries (2s, 4s, 8s) in `OpenRouterClient` for all API calls.
    - **Production Deployment**: VPS updated and live with unified Docker setup behind system Nginx reverse proxy.
- **Sprint 7: Phase 1 (UI/UX & Onboarding)**:
    - Implemented `PublicRoute` to redirect authenticated users away from login/register.
    - Added dismissible `WelcomeBanner` on the Dashboard for new user guidance.
    - Created `UpgradeModal` and integrated it into Solver, Generator, and Resources for quota limit handling.
- **Phase 6: Deployment**: Initial VPS Deployment finalized.
- **Phase 5: Sample Paper Generator**: Backend, Worker, and Frontend flows complete with PDF export.
- **Phase 4: PYQ Solver**: Real-time chat interface with SSE token streaming.

## In Progress

- Sprint 7: Planning Core Enhancements & Roadmap.

## Next Up (Priority Tasks)

1.  **In-house RAG (Vector Search):** Transition from full-document passing to a LangChain + ChromaDB pipeline to support larger files and reduce LLM token costs.
2.  **Payment Integration (Razorpay):** Connect the frontend "Upgrade" CTAs to a real payment flow with backend webhook handling for automated plan upgrades.
3.  **Backend Migration Evaluation:** Perform a feasibility study and potential implementation of migrating from FastAPI/Python to Node.js/Express for a unified TypeScript ecosystem.
4.  **UX Polish Pack:** 
    - **PWA Support**: Make the app installable on mobile devices.
    - **Google Polish**: Display user profile pictures and enhance the sidebar UI.
    - **Auth Security**: Implement email-based "Forgot Password" and account verification.

## Architecture Decisions

- **Dockerized Frontend**: Containerized Nginx service for unified deployment.
- **Path-Based Separation**: `/` reserved for the full PrepAI Landing Page, `/dashboard` for the core authenticated application.
- **Global Worker Hooks**: Safety net for unexpected task failures.
- **Client-Side Retry**: Exponential backoff for LLM API resilience.

## Session Notes

- Sprint 7: Marketing & Identity phase complete. Landing page is live and fully polished.
- App architecture is now clearly separated between public marketing and private dashboard.
- Future focus shifted towards core AI performance (RAG) and monetization.
