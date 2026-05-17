# Progress Tracker

## Current Phase

- Phase 3: Resource Management (In Review)

## Current Goal

- Verify File Uploads and Vision OCR.

## Completed

- **Initial context setup**: Populated `context/` with updated decisions.
- **Git Initialization**: Repository initialized with branch-based workflow.
- **Infrastructure**: Backend/Frontend scaffolded, Docker services running.
- **Phase 2: Authentication**: Full-stack JWT and Google OAuth logic.
- **Phase 3: Resource Management**:
    - DigitalOcean Spaces integration for S3-compatible storage.
    - Multipart file upload API with background task enqueuing.
    - Vision-model-based text extraction (Claude 3.5 Sonnet) capped at 12 pages.
    - Frontend Resource Dashboard with real-time status polling.
    - Modern Sidebar Layout with Dark/Light mode support.

## In Progress

- Verification and testing of the end-to-end upload and extraction flow.

## Next Up

1. **Phase 4: PYQ Solver**:
    - `POST /api/questions`: Submit question with document context.
    - Streaming SSE response with OpenRouter.
    - Citation linking.
2. **Phase 5: Sample Paper Generator**:
    - Automatic format detection.
    - JSON paper generation.

## Open Questions

- **OCR Accuracy**: Does the 2x scaling in `pypdfium2` provide enough detail for handwritten notes, or should we increase it?
- **Model Selection**: Sticking with Claude 3.5 Sonnet for its superior vision/reasoning for now.

## Architecture Decisions

- **No RAG**: MVP will pass full document text to LLM to simplify infrastructure.
- **Vision OCR**: Using Vision models to process scanned PDFs instead of traditional OCR engines.
- **Python Backend**: Chosen for superior PDF/Image processing capabilities.

## Session Notes

- Resources are uploaded to DO Spaces and then processed in a background worker.
- The UI polls the resource status every 3 seconds until 'ready' or 'failed'.
