# PYQ Solver & Sample Paper Generator — Master Build Plan
**Version:** 0.1 MVP  
**Stack:** FastAPI · React · RAG · Claude API  
**Builder:** Solo dev  

---

## 1. Product Overview

A web app where students (K-12 + college) upload their study resources — notes, syllabi, past year papers — and either:
- **Get AI-powered answers** to past year questions, grounded in their own uploaded material (PYQ Solver)
- **Generate realistic sample papers** with optional answers and explanations (Sample Paper Generator)

Both services share a single RAG ingestion pipeline. Text-only for MVP. Maths and image support deferred to v0.2.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | UI framework |
| Frontend | TailwindCSS | Styling |
| Frontend | React Query | API state, polling |
| Frontend host | Vercel (initial) | Zero-config deploys |
| Backend | FastAPI (Python) | REST API, async |
| Backend | Pydantic v2 | Request/response validation |
| Backend | SQLAlchemy 2 | ORM, async |
| Backend | Alembic | DB migrations |
| Auth | Better Auth | Self-hosted, email+password + Google OAuth |
| LLM | Claude API | `claude-sonnet-4-20250514` for answering and generation |
| RAG | LangChain | Chunking, retrieval, vector store abstraction |
| Embeddings | text-embedding-3-small | OpenAI. Same model for chunks AND queries |
| Vector DB | ChromaDB | Runs as Docker container. Per-user collections |
| PDF parsing | pdfplumber | Text extraction from uploaded PDFs |
| PDF output | WeasyPrint + Jinja2 | Render HTML templates → downloadable PDF |
| Job queue | ARQ + Redis | Async background jobs |
| Cache/broker | Redis | Shared by ARQ and FastAPI |
| Streaming | SSE (FastAPI) | Server-Sent Events for streamed LLM responses |
| Database | PostgreSQL | Primary relational DB |
| File storage | Cloudflare R2 | S3-compatible, cheap egress, boto3 SDK |
| Infrastructure | Docker + Compose | All services containerised, same config local + VPS |
| Backend host | Own VPS (Hetzner) | Full control |
| Reverse proxy | Nginx | Routes traffic to FastAPI |
| SSL | Caddy / Let's Encrypt | Auto-renewing HTTPS |

### docker-compose services
- `api` — FastAPI application server
- `worker` — ARQ worker (same codebase, different entrypoint)
- `redis` — job broker and cache
- `postgres` — primary database
- `chroma` — ChromaDB vector store
- `nginx` — reverse proxy

---

## 3. System Architecture

### 3.1 Request routing
All HTTP traffic enters through Nginx → proxied to FastAPI on port 8000. React frontend served from Vercel, communicates via REST + SSE.

**Two delivery modes for both services:**
- **Stream mode:** frontend opens SSE connection, FastAPI streams Claude API tokens in real-time
- **Background mode:** API creates a job record, enqueues to ARQ via Redis, returns `job_id` immediately. Frontend polls `GET /jobs/{id}/status` every 3 seconds via React Query until `status = done`

---

### 3.2 RAG Ingestion Pipeline (shared by both services)

Triggered as a background job on every resource upload:

1. **Parse** — pdfplumber extracts raw text from PDFs. Plain text files read directly.
2. **Clean** — strip headers, footers, page numbers, excess whitespace.
3. **Chunk** — LangChain `RecursiveCharacterTextSplitter` with `chunk_size=400`, `chunk_overlap=60`. Splits at paragraph boundaries where possible.
4. **Embed** — each chunk embedded using `text-embedding-3-small` via OpenAI API.
5. **Store** — embeddings stored in ChromaDB under a per-user collection: `user_{user_id}`.
6. **Record** — each chunk saved in `resource_chunks` table with its `vector_id` for traceability and clean deletion.

---

### 3.3 PYQ Solver Query Pipeline

1. User submits question text (or PDF — extracted to text first).
2. Question text embedded using `text-embedding-3-small`.
3. ChromaDB cosine similarity search over user's collection, top `k=5` chunks retrieved.
4. Prompt assembled: system prompt + retrieved chunks as context + user question.
5. Claude API called. Response streamed (SSE) or stored via background job.
6. Answer returned with citations — each citation references the source filename and chunk index.
7. If PDF output requested: Jinja2 template rendered → WeasyPrint converts to PDF → stored on R2.

---

### 3.4 Sample Paper Generator Pipeline

1. User uploads inputs (any combo of syllabus, PYQ, notes) — ingested via shared pipeline.
2. **Format detection:**
   - If past year paper uploaded → LLM extracts question pattern (MCQ count, short answer count, long answer count, marks distribution).
   - If not → user is prompted to specify format manually.
   - Fallback default: 15 MCQ + 4 short + 2 long.
3. Format config confirmed and stored on the `papers` record as a `jsonb` field.
4. RAG retrieval: topics extracted from syllabus chunks, relevant content chunks retrieved per topic.
5. LLM generates paper as structured JSON — array of question objects with type, marks, topic, question_text. Optionally: answer and explanation.
6. Output stored in `paper_outputs.questions` jsonb. PDF generated on demand.
7. User can toggle answers and explanations in UI — this re-renders existing output data, does NOT trigger a new LLM call.

---

## 4. Database Schema

All tables use UUID primary keys. Timestamps stored as UTC. PostgreSQL via SQLAlchemy + Alembic.

### users
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | varchar | Unique |
| password_hash | varchar | Null for Google OAuth users |
| google_id | varchar | Null for email+password users |
| plan | varchar | Enum: `free` \| `paid`. Default: `free` |
| questions_used | integer | Counter for freemium quota enforcement |
| created_at | timestamp | UTC |

### resources
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | References `users.id`, cascade delete |
| filename | varchar | Original uploaded filename |
| file_url | varchar | Cloudflare R2 object URL |
| type | varchar | Enum: `notes` \| `syllabus` \| `past_paper` \| `other` |
| status | varchar | Enum: `pending` \| `processing` \| `ready` \| `failed` |
| created_at | timestamp | |

### resource_chunks
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| resource_id | uuid FK | References `resources.id`, cascade delete |
| content | text | Raw chunk text |
| chunk_index | integer | Order within the resource |
| vector_id | varchar | ChromaDB document ID — used for deletion |

### questions
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | References `users.id` |
| content | text | The question text |
| delivery_mode | varchar | Enum: `stream` \| `background` |
| created_at | timestamp | |

### question_resources (join table)
| Column | Type | Notes |
|---|---|---|
| question_id | uuid FK | References `questions.id` |
| resource_id | uuid FK | References `resources.id` |

### answers
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| question_id | uuid FK | References `questions.id`, one-to-one |
| content | text | Full answer text (markdown) |
| status | varchar | Enum: `pending` \| `generating` \| `done` \| `failed` |
| pdf_url | varchar | R2 URL — null until PDF generated |
| citations | jsonb | Array of `{resource_id, chunk_index, filename}` |
| created_at | timestamp | |

### papers
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | References `users.id` |
| title | varchar | User-provided or auto-generated |
| format_config | jsonb | `{mcq: 15, short: 4, long: 2, marks: {...}}` |
| status | varchar | Enum: `pending` \| `generating` \| `done` \| `failed` |
| delivery_mode | varchar | Enum: `stream` \| `background` |
| created_at | timestamp | |

### paper_resources (join table)
| Column | Type | Notes |
|---|---|---|
| paper_id | uuid FK | References `papers.id` |
| resource_id | uuid FK | References `resources.id` |
| resource_role | varchar | Enum: `syllabus` \| `past_paper` \| `notes` |

### paper_outputs
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| paper_id | uuid FK | References `papers.id`, one-to-one |
| questions | jsonb | Array of question objects (structure below) |
| include_answers | boolean | Toggle — does not trigger re-generation |
| include_explanations | boolean | Toggle — does not trigger re-generation |
| pdf_url | varchar | R2 URL — null until PDF generated |
| created_at | timestamp | |

**Question object structure inside `questions` jsonb:**
```json
{
  "type": "mcq",
  "marks": 1,
  "topic": "Photosynthesis",
  "question_text": "Which pigment is responsible for...",
  "options": ["A. Chlorophyll", "B. Carotene", "C. Xanthophyll", "D. Anthocyanin"],
  "answer": "A. Chlorophyll",
  "explanation": "Chlorophyll absorbs red and blue light wavelengths..."
}
```

### jobs
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | References `users.id` |
| job_type | varchar | Enum: `ingest` \| `answer` \| `generate_paper` |
| status | varchar | Enum: `queued` \| `running` \| `done` \| `failed` |
| ref_id | uuid | Points to `question_id` or `paper_id` |
| error | text | Error message if status = failed |
| created_at | timestamp | |
| completed_at | timestamp | Null until job finishes |

---

## 5. API Endpoints

### Auth — `/api/auth/*` (Better Auth)
```
POST   /api/auth/sign-up               Email + password registration
POST   /api/auth/sign-in               Email + password login
GET    /api/auth/sign-in/google        Google OAuth redirect
POST   /api/auth/sign-out              Session invalidation
GET    /api/auth/session               Returns current session/user
```

### Resources — `/api/resources`
```
POST   /api/resources                  Upload file (multipart: file, type). Stores to R2, enqueues ingest job. Returns {resource_id, job_id}
GET    /api/resources                  List all resources for current user
DELETE /api/resources/{id}             Delete resource, chunks from ChromaDB, file from R2
```

### Questions — `/api/questions`
```
POST   /api/questions                  Body: {content, delivery_mode, resource_ids[]}
                                       stream → returns SSE stream
                                       background → returns {question_id, job_id}
GET    /api/questions                  List questions for current user
GET    /api/questions/{id}/answer      Fetch answer for a question
GET    /api/questions/{id}/answer/pdf  Generate + return PDF download URL
```

### Papers — `/api/papers`
```
POST   /api/papers                     Body: {title, resource_ids[], resource_roles{}, delivery_mode}. Returns {paper_id, job_id}
GET    /api/papers                     List all papers for current user
GET    /api/papers/{id}                Get paper + output status
PATCH  /api/papers/{id}/output         Toggle include_answers, include_explanations (no re-generation)
GET    /api/papers/{id}/pdf            Generate + return PDF download URL
POST   /api/papers/detect-format       Body: {resource_id} (must be past_paper). Returns detected format_config JSON
```

### Jobs — `/api/jobs`
```
GET    /api/jobs/{id}                  Get job status. Returns {status, ref_id, job_type, error}
```

---

## 6. Freemium Limits

| Feature | Free tier | Paid tier |
|---|---|---|
| Questions per month | 10 | Unlimited |
| Resources stored | 3 | Unlimited |
| Sample papers per month | 2 | Unlimited |
| PDF downloads | Not available | Available |
| Delivery mode | Stream only | Stream + background |
| Max file size | 5 MB | 20 MB |

> Quota tracked via `users.questions_used`. Reset monthly via a scheduled ARQ cron job. Check quota at the start of every `POST /api/questions` and `POST /api/papers` before doing any work.

---

## 7. Folder Structure

### Backend (FastAPI)
```
backend/
  app/
    main.py                  # FastAPI app init, middleware, router registration
    config.py                # Settings via pydantic-settings (.env)
    database.py              # SQLAlchemy async engine + session factory
    auth.py                  # Better Auth integration
    models/                  # SQLAlchemy ORM models
      user.py
      resource.py
      question.py
      answer.py
      paper.py
      paper_output.py
      job.py
    schemas/                 # Pydantic request/response schemas
      resource.py
      question.py
      paper.py
      job.py
    routers/                 # FastAPI route handlers
      resources.py
      questions.py
      papers.py
      jobs.py
    services/                # Business logic (no FastAPI deps here)
      ingest.py              # RAG ingestion orchestration
      solver.py              # PYQ solver: RAG query + LLM call
      generator.py           # Paper generation logic
      pdf_export.py          # WeasyPrint PDF generation
      storage.py             # Cloudflare R2 via boto3
    rag/
      chunker.py             # LangChain RecursiveCharacterTextSplitter
      embedder.py            # OpenAI embedding calls
      vectorstore.py         # ChromaDB wrapper (swap here for Qdrant later)
      retriever.py           # Similarity search, top-k, reranking
    llm/
      client.py              # Claude API wrapper (streaming + non-streaming)
      prompts.py             # All system + user prompt templates as constants
    workers/
      arq_worker.py          # ARQ worker entrypoint
      tasks.py               # ingest_task, answer_task, generate_paper_task, quota_reset_task
    templates/               # Jinja2 HTML templates for PDF output
      answer.html
      paper.html
      base.html
  alembic/                   # Migration files
  tests/
  Dockerfile
  requirements.txt
  .env.example
```

### Frontend (React + Vite)
```
frontend/
  src/
    main.tsx
    App.tsx                  # Routes (React Router)
    api/                     # React Query hooks + axios calls
      resources.ts
      questions.ts
      papers.ts
      jobs.ts
      auth.ts
    components/
      ui/                    # Reusable: Button, Input, Badge, Card, Toggle, Spinner
      layout/                # Sidebar, Navbar, PageWrapper
      resources/             # ResourceUploader, ResourceList, ResourceCard
      questions/             # QuestionInput, AnswerStream, AnswerView, CitationList
      papers/                # PaperForm, FormatConfig, PaperOutput, PaperToggle
    pages/
      Login.tsx
      Register.tsx
      Dashboard.tsx
      Solver.tsx             # PYQ solver page
      Generator.tsx          # Paper generator page
      Resources.tsx          # Manage uploaded resources
    hooks/
      useJobPoller.ts        # Polls /jobs/{id} every 3s until status = done
      useSSE.ts              # Handles SSE stream from backend
    store/                   # Zustand (or React context) for auth state
  index.html
  vite.config.ts
  tailwind.config.ts
```

### Infrastructure
```
docker-compose.yml           # Production: all services
docker-compose.dev.yml       # Dev overrides: hot reload, no nginx
.env.example
nginx/
  nginx.conf
```

---

## 8. Environment Variables

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/pyqapp

# Redis
REDIS_URL=redis://redis:6379

# LLM
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...          # For text-embedding-3-small

# Auth
BETTER_AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# ChromaDB
CHROMA_HOST=chroma
CHROMA_PORT=8001

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=pyqapp-files
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# App
FRONTEND_URL=https://app.yourdomain.com
MAX_FILE_SIZE_FREE=5242880        # 5 MB in bytes
MAX_FILE_SIZE_PAID=20971520       # 20 MB in bytes
```

---

## 9. LLM Prompt Templates

All prompts live in `llm/prompts.py` as Python string constants.

### 9.1 PYQ Solver system prompt
```
SOLVER_SYSTEM = """
You are an expert academic tutor helping a student understand a question
from their past year papers.

You are given relevant excerpts from the student's own study material
as context. Answer the question using ONLY the provided context.

Rules:
- Be clear, structured, and student-friendly.
- If the context does not contain enough information, say so honestly.
  Do not make up information.
- At the end, cite which source(s) you used (filename only).
- Format using markdown headings and bullet points where helpful.
- Do not add information that is not present in the provided context.
"""
```

### 9.2 Format detection prompt
```
DETECT_FORMAT_PROMPT = """
Analyse this past year paper and extract the question format.
Return ONLY a JSON object with this exact structure, no explanation:

{
  "mcq": <count>,
  "short": <count>,
  "long": <count>,
  "mcq_marks": <marks each>,
  "short_marks": <marks each>,
  "long_marks": <marks each>,
  "total_marks": <total>,
  "duration_minutes": <duration or null>
}
"""
```

### 9.3 Paper generation prompt
```
GENERATE_PAPER_PROMPT = """
You are generating a sample exam paper for a student.

Format config: {format_config}
Subject context from student's material:
{context_chunks}

Generate exactly the number of questions specified in the format config.
Return ONLY a JSON array of question objects. Each object must have:
  - type (mcq | short | long)
  - marks (integer)
  - topic (string)
  - question_text (string)
  - For MCQ: also include options (array of 4 strings) and answer (correct option text)
  - For short/long: also include answer (model answer string) and explanation (string)

Rules:
- Distribute questions across different topics evenly.
- No repeated questions.
- Difficulty should match a real exam for this level.
- JSON array only. No preamble, no explanation, no markdown fences.
"""
```

> **Important:** Wrap every LLM call expecting JSON in a `try/except json.loads` block. On parse failure, retry once with the message appended: `"Your previous response was not valid JSON. Return only the JSON object, no other text."` If it fails twice, mark the job as failed.

---

## 10. Sprint Plan

Estimated for a solo developer. Each sprint ~1 week. Total MVP: ~8 weeks.

---

### Sprint 1 — Project scaffold & infrastructure

| Task | Est. | Output |
|---|---|---|
| Initialise FastAPI project with full folder structure | 2h | Working FastAPI server |
| Set up docker-compose (api, postgres, redis, chroma, nginx) | 3h | `docker-compose up` works locally |
| Configure pydantic-settings, .env, config.py | 1h | All env vars loading |
| SQLAlchemy async engine + Alembic init | 2h | DB connection working |
| Write all ORM models | 3h | Models complete |
| Initial Alembic migration — create all tables | 1h | Tables in Postgres |
| Initialise React + Vite project with Tailwind | 2h | Frontend dev server running |
| Set up React Router, base layout, placeholder pages | 2h | Routes navigable |

---

### Sprint 2 — Auth

| Task | Est. | Output |
|---|---|---|
| Integrate Better Auth into FastAPI (mount routes) | 3h | Auth routes responding |
| Configure email+password sign-up and sign-in | 2h | Can register and login |
| Configure Google OAuth | 2h | Google login working |
| Auth middleware — protect all `/api/*` routes | 2h | Unauthenticated requests rejected |
| Build Login and Register pages in React | 4h | Auth UI complete |
| React Query auth hooks (useSession, useLogin, etc.) | 2h | Session state in frontend |

---

### Sprint 3 — File upload & RAG ingestion

| Task | Est. | Output |
|---|---|---|
| `POST /api/resources` — file upload handler | 2h | File accepted by API |
| Cloudflare R2 upload via boto3 (storage.py) | 2h | File stored in R2 |
| pdfplumber PDF text extraction | 1h | Text extracted from PDF |
| LangChain chunker (chunker.py) | 2h | Text split into chunks |
| OpenAI embedding calls (embedder.py) | 1h | Chunks embedded |
| ChromaDB storage with user namespace (vectorstore.py) | 2h | Vectors stored |
| ARQ worker + ingest_task wiring | 3h | Ingestion runs as background job |
| Resource list/delete endpoints + chunk cleanup | 2h | Resources manageable |
| Resources page in React with upload UI | 4h | Users can upload and view resources |

---

### Sprint 4 — PYQ solver (stream mode)

| Task | Est. | Output |
|---|---|---|
| `POST /api/questions` — question creation handler | 2h | Question saved to DB |
| RAG retriever — cosine search, top-k=5 (retriever.py) | 2h | Relevant chunks returned |
| Prompt assembly (solver system prompt + context + question) | 1h | Prompt ready for LLM |
| Claude API streaming wrapper (client.py) | 2h | Tokens stream from Claude |
| FastAPI SSE endpoint for streaming response | 3h | SSE stream works in browser |
| `useSSE.ts` hook in React | 2h | Frontend receives and renders stream |
| Solver page — question input + streaming answer UI | 4h | Full stream flow working end-to-end |
| Citation display from `answer.citations` | 2h | Sources shown under answer |

---

### Sprint 5 — PYQ solver (background mode) + PDF export

| Task | Est. | Output |
|---|---|---|
| `answer_task` ARQ worker function | 2h | Background answering works |
| `useJobPoller.ts` — polls `/jobs/{id}` every 3s | 2h | Frontend polls and updates UI |
| Delivery mode toggle in solver UI | 1h | User can pick stream / background |
| Jinja2 answer HTML template | 2h | Answer renders in styled HTML |
| WeasyPrint PDF generation + R2 upload (pdf_export.py) | 3h | PDF generated and stored |
| `GET /api/questions/{id}/answer/pdf` endpoint | 1h | PDF URL returned |
| PDF download button in UI | 1h | User can download PDF |

---

### Sprint 6 — Sample paper generator

| Task | Est. | Output |
|---|---|---|
| `POST /api/papers/detect-format` endpoint | 2h | Format auto-extracted from PYQ |
| Format config UI — manual input form | 3h | User can specify format |
| `POST /api/papers` — paper creation + resource linking | 2h | Paper record created |
| `generate_paper_task` ARQ worker function | 4h | Full paper generated and saved |
| Paper output storage in `paper_outputs.questions` jsonb | 1h | Output persisted |
| Generator page — resource picker + format config UI | 4h | Generation flow complete |
| Paper output view with question list | 3h | Generated paper displayed |
| `PATCH /api/papers/{id}/output` — toggle answers/explanations | 1h | Toggles work without re-generation |
| Paper PDF generation (Jinja2 template + WeasyPrint) | 3h | Paper downloadable as PDF |

---

### Sprint 7 — Freemium, polish & deploy

| Task | Est. | Output |
|---|---|---|
| Quota check middleware for questions and papers | 2h | Free tier limits enforced |
| Monthly quota reset ARQ cron job | 1h | Quota resets automatically |
| Plan-based feature gating (PDF, background mode) | 2h | Paid features blocked for free users |
| Error handling — failed jobs, LLM errors, JSON parse failures | 3h | Errors surfaced to user cleanly |
| Loading states and empty states across all pages | 2h | UI feels complete and polished |
| Nginx config for production | 2h | Reverse proxy working |
| VPS provisioning (Hetzner) + Docker deploy | 3h | App live on VPS |
| Vercel deploy for frontend | 1h | Frontend live |
| SSL via Caddy / Let's Encrypt | 1h | HTTPS working |
| End-to-end smoke test — full user flow | 2h | MVP verified working |

---

## 11. Key Implementation Decisions

### ChromaDB → Qdrant migration path
ChromaDB is used for MVP — zero config, runs as a Docker container. When you need to scale (multiple workers, persistent volumes, production-grade vector search), migrate to Qdrant Cloud or self-hosted Qdrant. Because LangChain abstracts the vector store interface, this is a **1-file change** in `vectorstore.py`.

### Same embedding model for ingestion and query
Both chunk embedding (ingestion) and query embedding (question time) must use `text-embedding-3-small`. This is non-negotiable — mixing models invalidates cosine similarity entirely. If you ever change the embedding model, you must re-embed all existing chunks.

### Per-user ChromaDB collections
Each user gets their own ChromaDB collection named `user_{user_id}`. This means:
- User A's notes can never appear in User B's answers
- Deleting a user's data is a single `delete_collection` call
- No cross-user data leakage possible

### Paper generation is always a background job
Generating a full 30-question paper with answers can take 30–60 seconds. Even if the user selects "stream" delivery, paper generation runs as an ARQ background task. The SSE connection in stream mode tails the job and streams output as it is written to the DB.

### PDF generation is on-demand, not automatic
PDFs are not generated when an answer or paper is created. They are generated the first time the user clicks the download button. The generated PDF URL is then cached in the `pdf_url` column so subsequent downloads serve the same R2 file without re-generating.

### Freemium quota enforcement
Check `users.questions_used` and `users.plan` at the very start of `POST /api/questions` and `POST /api/papers` handlers — before parsing the request body, before any DB writes, before any LLM calls. Return `HTTP 403` with a clear message if quota exceeded.

---

## 12. Out of Scope for v0.1 (Deferred to v0.2+)

- Image and handwriting input — vision model support
- Maths and formula-heavy subjects — LaTeX rendering
- Payment integration — Stripe for plan upgrades
- Subject-specific question templates — custom formats per exam board
- Collaboration — sharing resources or papers with other users
- Admin dashboard — usage analytics, user management
- Mobile app — React Native or PWA
- OCR for scanned PDFs — Tesseract or cloud OCR
- Question difficulty scoring and adaptive paper generation

---

*End of document — ready to build.*