import asyncio
from arq.connections import RedisSettings
from arq.cron import cron
from app.config import settings
from .tasks import extraction_task, generate_paper_task, reset_monthly_quotas

async def ping(ctx):
    return "pong"

async def startup(ctx):
    pass

async def shutdown(ctx):
    pass

class WorkerSettings:
    functions = [ping, extraction_task, generate_paper_task]
    cron_jobs = [
        cron(reset_monthly_quotas, day=1, hour=0, minute=0)
    ]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
