import asyncio
from arq.connections import RedisSettings
from app.config import settings

async def ping(ctx):
    return "pong"

async def startup(ctx):
    pass

async def shutdown(ctx):
    pass

class WorkerSettings:
    functions = [ping]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
