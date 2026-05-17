from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth
from .config import settings

app = FastAPI(title="PYQ Solver API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    # allow_origins=[settings.FRONTEND_URL],
    allow_origins=["*"],  # Allow all origins for development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to PYQ Solver API"}
