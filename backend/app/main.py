from fastapi import FastAPI

app = FastAPI(title="PYQ Solver API")

@app.get("/")
async def root():
    return {"message": "Welcome to PYQ Solver API"}
