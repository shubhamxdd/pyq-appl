# PYQ Solver & Sample Paper Generator

A web application for students to solve past year questions and generate sample papers using AI (OpenRouter) and Python-based PDF processing.

## 🚀 Local Development Setup

### 1. Prerequisites
- **Docker & Docker Compose**
- **Node.js** (v18+)
- **Python** (3.11+)

### 2. Environment Configuration
Copy the example environment file and fill in your credentials:
```bash
cp .env.example .env
```
*Key variables needed:*
- `OPENROUTER_API_KEY`: For LLM access.
- `BETTER_AUTH_SECRET`: For authentication.
- `Cloudflare R2 Credentials`: For file storage.

### 3. Start Backend Services (Docker)
This starts PostgreSQL, Redis, and the FastAPI server with hot-reload enabled.
```bash
docker-compose up --build
```
- **API URL**: [http://localhost:8000](http://localhost:8000)
- **Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Start Frontend (React)
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
- **Frontend URL**: [http://localhost:5173](http://localhost:5173)

---

## 🛠 Project Structure

- `/backend`: FastAPI application, models, and background workers.
- `/frontend`: React + Vite + Tailwind CSS v4.
- `/context`: Project guidelines and architecture documentation.
- `PLAN.md`: Detailed master build plan and sprint breakdown.

## 📝 Backend Commands (Inside Container)
To run migrations or interactive shells:
```bash
# Run migrations
docker exec -it pyq_api alembic upgrade head

# Create new migration
docker exec -it pyq_api alembic revision --autogenerate -m "description"
```

## 📜 UI Guidelines
- **Themes**: Supports Light and Dark mode (system default).
- **Styling**: Tailwind CSS v4 is used via the Vite plugin.
- **Icons**: Lucide React.
