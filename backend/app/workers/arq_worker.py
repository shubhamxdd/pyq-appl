import asyncio
from arq.connections import RedisSettings
from app.config import settings
from .tasks import extraction_task, generate_paper_task

async def ping(ctx):
    return "pong"

async def startup(ctx):
    pass

async def shutdown(ctx):
    pass

class WorkerSettings:
    functions = [ping, extraction_task, generate_paper_task]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
