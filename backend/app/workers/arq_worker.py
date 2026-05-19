import asyncio
import logging
import sys
from datetime import datetime
from sqlalchemy import select
from arq.connections import RedisSettings
from arq.cron import cron
from ..config import settings
from .tasks import extraction_task, generate_paper_task, reset_monthly_quotas
from ..database import SessionLocal
from ..models.job import Job
from ..models.resource import Resource
from ..models.paper import Paper

# Use the arq.worker logger so messages show up in the same stream
logger = logging.getLogger('arq.worker')

async def ping(ctx):
    return "pong"

async def startup(ctx):
    logger.info("🚀 [WORKER] Starting up and initializing hooks...")

async def shutdown(ctx):
    logger.info("🛑 [WORKER] Shutting down...")

async def on_job_start(ctx):
    logger.info(f"▶️ [HOOK] Job Start: {ctx.get('job_id')}")

async def after_job_end(ctx):
    """
    Global hook called after every job in arq. 
    Ensures DB status is updated even if the task itself crashed.
    """
    job_id = ctx.get('job_id')
    success = ctx.get('success')
    
    # ARQ logs the failure, but we want our own trace
    logger.info(f"🔍 [HOOK] Job {job_id} ended. Success: {success}")
    sys.stdout.flush()

    if not job_id:
        logger.warning("⚠️ [HOOK] No job_id in context.")
        return

    async with SessionLocal() as db:
        try:
            # We explicitly set _job_id in routers to match our DB Job ID
            # So job_id here SHOULD be the UUID of our Job record.
            result = await db.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()
            
            if not job:
                logger.error(f"❌ [HOOK] Job {job_id} not found in database.")
                return

            logger.info(f"📊 [HOOK] Current DB Job Status: {job.status}")

            # If the job is still in a transient state, force it to its final state
            if job.status in ["running", "queued", "pending"]:
                job.status = "done" if success else "failed"
                job.completed_at = datetime.utcnow()
                
                # Update the specific entity status (Resource or Paper)
                if not success:
                    if job.job_type == "ingest" and job.ref_id:
                        res_result = await db.execute(select(Resource).where(Resource.id == job.ref_id))
                        resource = res_result.scalar_one_or_none()
                        if resource and resource.status == "processing":
                            resource.status = "failed"
                            logger.info(f"📉 [HOOK] Marked Resource {job.ref_id} as FAILED")
                    
                    elif job.job_type == "generate_paper" and job.ref_id:
                        paper_result = await db.execute(select(Paper).where(Paper.id == job.ref_id))
                        paper = paper_result.scalar_one_or_none()
                        if paper and paper.status in ["pending", "generating"]:
                            paper.status = "failed"
                            logger.info(f"📉 [HOOK] Marked Paper {job.ref_id} as FAILED")
                
                await db.commit()
                logger.info(f"✅ [HOOK] Finalized DB Job {job_id} as {job.status}")
            else:
                logger.info(f"ℹ️ [HOOK] DB Job {job_id} was already finalized as {job.status}")

        except Exception as e:
            logger.error(f"❌ [HOOK] Error updating database for job {job_id}: {e}")
            import traceback
            logger.error(traceback.format_exc())
        finally:
            sys.stdout.flush()

class WorkerSettings:
    functions = [ping, extraction_task, generate_paper_task]
    cron_jobs = [
        cron(reset_monthly_quotas, day=1, hour=0, minute=0)
    ]
    on_startup = startup
    on_shutdown = shutdown
    on_job_start = on_job_start
    after_job_end = after_job_end
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
