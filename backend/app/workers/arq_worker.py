import asyncio
from arq import Token

async def startup(ctx):
    pass

async def shutdown(ctx):
    pass

class WorkerSettings:
    functions = []
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = None # Will be configured from env
