from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, resources, solver, papers
from .config import settings
from posthog import Posthog

app = FastAPI(title="PYQ Solver API")

# Initialize PostHog
ph_client = Posthog(settings.POSTHOG_API_KEY, host=settings.POSTHOG_HOST)
if not settings.POSTHOG_API_KEY:
    ph_client.disabled = True

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    # allow_origins=[settings.FRONTEND_URL],
    allow_origins=["pyq.shubhamxd.in"],  # Allow all origins for development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(resources.router, prefix="/api")
app.include_router(solver.router, prefix="/api")
app.include_router(papers.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to PYQ Solver API"}
