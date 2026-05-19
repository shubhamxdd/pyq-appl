import asyncio
import base64
import io
import logging
import traceback
from sqlalchemy import select
from ..database import SessionLocal
from ..models.resource import Resource
from ..config import settings
from ..services.storage import storage_service
import httpx
import pypdfium2 as pdfium
from PIL import Image

# Configure logging for the task
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def extraction_task(ctx, resource_id: str, job_id: str = None):
    print(f"\n🚀 [TASK START] Resource ID: {resource_id}")

    # raise RuntimeError("Simulated Worker Crash")
    
    async with SessionLocal() as db:
        try:
            if job_id:
                from ..models.job import Job
                job_res = await db.execute(select(Job).where(Job.id == job_id))
                job = job_res.scalar_one_or_none()
                if job:
                    job.status = "running"
                    await db.commit()

            # 1. Fetch Resource
            result = await db.execute(select(Resource).where(Resource.id == resource_id))
            resource = result.scalar_one_or_none()
            
            if not resource:
                print(f"❌ [DB ERROR] Resource {resource_id} not found.")
                if job_id:
                    job.status = "failed"
                    job.error = "Resource not found"
                    await db.commit()
                return
            
            print(f"📄 [PROCESSING] Filename: {resource.filename} | Type: {resource.type}")

            # 2. Check for initial cancellation
            if resource.status != "processing":
                print(f"⚠️ [ABORTED] Task aborted before starting (Status: {resource.status})")
                if job_id:
                    job.status = "done"
                    await db.commit()
                return

            # 3. Handle PDF Files
            if resource.filename.lower().endswith('.pdf'):
                print("📥 [STEP 1/3] Downloading PDF from Storage...")
                
                # Handle CDN URL issue
                download_url = resource.file_url.replace(".cdn.digitaloceanspaces.com", ".digitaloceanspaces.com")
                
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.get(download_url)
                    if response.status_code != 200:
                        raise Exception(f"Storage download failed: HTTP {response.status_code}")
                    file_content = response.content
                
                print(f"✅ [SUCCESS] Downloaded {len(file_content) / 1024 / 1024:.2f} MB")
                
                # 4. Process Pages
                print("⚙️ [STEP 2/3] Initializing PDFium renderer...")
                pdf = pdfium.PdfDocument(file_content)
                num_pages = len(pdf)
                pages_to_process = min(num_pages, settings.MAX_OCR_PAGES)
                print(f"🔍 [INFO] Total Pages: {num_pages} | Processing Limit: {pages_to_process}")
                
                full_text = []
                
                for i in range(pages_to_process):
                    # Robust Cancellation Check
                    async with SessionLocal() as check_db:
                        check_res = await check_db.execute(select(Resource).where(Resource.id == resource_id))
                        db_res = check_res.scalar_one_or_none()
                        if not db_res or db_res.status != "processing":
                            print(f"🛑 [STOPPED] Cancellation detected at Page {i+1}. Aborting loop.")
                            if job_id:
                                async with SessionLocal() as job_db:
                                    j_res = await job_db.execute(select(Job).where(Job.id == job_id))
                                    j = j_res.scalar_one_or_none()
                                    if j:
                                        j.status = "done"
                                        await job_db.commit()
                            return
                        
                        # Update Progress %
                        progress = int(((i + 1) / pages_to_process) * 100)
                        db_res.processing_progress = progress
                        await check_db.commit()
                        print(f"📊 [PROGRESS] {progress}% completed.")

                    print(f"📸 [PAGE {i+1}/{pages_to_process}] Rendering & Base64 Encoding...")
                    page = pdf[i]
                    bitmap = page.render(scale=2) 
                    pil_image = bitmap.to_pil()
                    
                    img_byte_arr = io.BytesIO()
                    pil_image.save(img_byte_arr, format='JPEG', quality=85)
                    img_base64 = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
                    
                    print(f"📡 [PAGE {i+1}/{pages_to_process}] Sending to OpenRouter (Nvidia Model)...")
                    
                    from ..llm.client import open_router_client
                    
                    messages = [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "Extract all text from this page image precisely. Return only the extracted text."},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{img_base64}"
                                    }
                                }
                            ]
                        }
                    ]

                    try:
                        vision_response = await open_router_client.complete_chat(
                            messages=messages,
                            model="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
                        )
                        
                        page_text = vision_response['choices'][0]['message']['content']
                        full_text.append(f"--- Page {i+1} ---\n{page_text}")
                        print(f"✨ [PAGE {i+1}] Extraction successful.")
                    except Exception as e:
                        error_msg = f"Vision API failed after retries: {str(e)}"
                        raise Exception(error_msg)

                # Final Status Check before committing
                async with SessionLocal() as final_check:
                    f_res = await final_check.execute(select(Resource).where(Resource.id == resource_id))
                    db_res_final = f_res.scalar_one_or_none()
                    if not db_res_final or db_res_final.status != "processing":
                        print("🛑 [ABORTED] Final commit skipped. User stopped task during last page.")
                        if job_id:
                            async with SessionLocal() as job_db:
                                j_res = await job_db.execute(select(Job).where(Job.id == job_id))
                                j = j_res.scalar_one_or_none()
                                if j:
                                    j.status = "done"
                                    await job_db.commit()
                        return

                resource.extracted_text = "\n\n".join(full_text)
                resource.status = "ready"
                
                if job_id:
                    job.status = "done"
                    from datetime import datetime
                    job.completed_at = datetime.utcnow()
                    
                print(f"💾 [STEP 3/3] Saving extracted text to DB...")
                await db.commit()
                print(f"🏁 [TASK COMPLETE] Resource {resource_id} is now READY.\n")
            
            elif resource.filename.lower().endswith('.txt'):
                print("📝 [TEXT] Extracting plain text content...")
                async with httpx.AsyncClient() as client:
                    response = await client.get(resource.file_url)
                    resource.extracted_text = response.text
                    resource.status = "ready"
                    
                if job_id:
                    job.status = "done"
                    from datetime import datetime
                    job.completed_at = datetime.utcnow()
                    
                await db.commit()
                print("🏁 [TASK COMPLETE] Text file is READY.\n")
            
            else:
                resource.status = "failed"
                if job_id:
                    job.status = "failed"
                    job.error = f"Unsupported file type: {resource.filename}"
                    from datetime import datetime
                    job.completed_at = datetime.utcnow()
                    
                print(f"❌ [ERROR] Unsupported file type: {resource.filename}")
                await db.commit()

        except Exception as e:
            error_trace = traceback.format_exc()
            print(f"💥 [CRITICAL ERROR] Task Failed: {str(e)}")
            print(f"Stack Trace:\n{error_trace}")

            try:
                # Re-fetch to ensure we have a valid object to update status
                async with SessionLocal() as err_db:
                    update_result = await err_db.execute(select(Resource).where(Resource.id == resource_id))
                    res_to_fail = update_result.scalar_one_or_none()
                    if res_to_fail and res_to_fail.status == "processing":
                        res_to_fail.status = "failed"
                    
                    if job_id:
                        from ..models.job import Job
                        j_res = await err_db.execute(select(Job).where(Job.id == job_id))
                        j = j_res.scalar_one_or_none()
                        if j:
                            j.status = "failed"
                            j.error = str(e)
                            from datetime import datetime
                            j.completed_at = datetime.utcnow()
                            
                    await err_db.commit()
                    print(f"📉 [DB] Resource {resource_id} marked as FAILED.")
            except Exception as final_err:
                print(f"💀 [FATAL] Could not even mark as failed: {final_err}")

async def generate_paper_task(ctx, paper_id: str, job_id: str = None):
    import json
    from sqlalchemy.orm import selectinload
    from ..models.paper import Paper
    from ..models.paper_output import PaperOutput
    from ..llm.client import open_router_client
    from ..llm.prompts import GENERATE_PAPER_PROMPT

    print(f"\n🚀 [TASK START] Paper Generation: {paper_id}")
    
    async with SessionLocal() as db:
        try:
            if job_id:
                from ..models.job import Job
                job_res = await db.execute(select(Job).where(Job.id == job_id))
                job = job_res.scalar_one_or_none()
                if job:
                    job.status = "running"
                    await db.commit()

            # 1. Fetch Paper with Resources
            print(f"📡 [DEBUG] Fetching paper metadata and linked resources...")
            result = await db.execute(
                select(Paper)
                .where(Paper.id == paper_id)
                .options(selectinload(Paper.resources))
            )
            paper = result.scalar_one_or_none()
            
            if not paper:
                print(f"❌ [DB ERROR] Paper {paper_id} not found")
                if job_id:
                    job.status = "failed"
                    job.error = "Paper not found"
                    await db.commit()
                return

            print(f"📝 [DEBUG] Paper Title: {paper.title}")
            print(f"⚙️ [DEBUG] Format Config: {paper.format_config}")

            paper.status = "generating"
            await db.commit()
            print(f"🔄 [STATUS] Set to 'generating'")

            # 2. Combine Context
            print(f"📚 [DEBUG] Aggregating context from {len(paper.resources)} resources...")
            combined_context = ""
            for res in paper.resources:
                if res.extracted_text:
                    content_len = len(res.extracted_text)
                    print(f"📎 [DEBUG] Adding resource: {res.filename} ({content_len} chars)")
                    combined_context += f"--- Source ({res.type}): {res.filename} ---\n{res.extracted_text}\n\n"
                else:
                    print(f"⚠️ [DEBUG] Resource {res.filename} has no extracted text. Skipping.")

            if not combined_context:
                raise Exception("No context found in selected resources.")

            context_total_len = len(combined_context)
            print(f"📊 [DEBUG] Total Context Length: {context_total_len} characters")

            # 3. Call LLM
            print(f"🤖 [LLM] Preparing prompt and calling OpenRouter...")
            prompt = GENERATE_PAPER_PROMPT.format(
                format_config=json.dumps(paper.format_config),
                context_chunks=combined_context
            )
            
            messages = [
                {"role": "system", "content": "You are a professional exam paper generator."},
                {"role": "user", "content": prompt}
            ]

            full_response = ""
            chunk_count = 0
            print(f"⏳ [LLM] Streaming response (this may take 30-90s)...")
            
            async for chunk in open_router_client.stream_chat(messages):
                full_response += chunk
                chunk_count += 1
                if chunk_count % 50 == 0:
                    print(f"📥 [LLM] Received {chunk_count} chunks...")
                    # Robust Cancellation Check
                    async with SessionLocal() as check_db:
                        check_res = await check_db.execute(select(Paper).where(Paper.id == paper_id))
                        p_check = check_res.scalar_one_or_none()
                        if not p_check or p_check.status not in ["pending", "generating"]:
                            print(f"🛑 [STOPPED] Paper {paper_id} deleted or aborted. Cancelling generation.")
                            if job_id:
                                async with SessionLocal() as job_db:
                                    j_res = await job_db.execute(select(Job).where(Job.id == job_id))
                                    j = j_res.scalar_one_or_none()
                                    if j:
                                        j.status = "done"
                                        from datetime import datetime
                                        j.completed_at = datetime.utcnow()
                                        await job_db.commit()
                            return

            print(f"✅ [LLM] Response complete ({len(full_response)} chars).")

            # 4. Parse JSON
            print(f"📦 [DEBUG] Cleaning and parsing JSON response...")
            clean_json = full_response.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            
            try:
                questions = json.loads(clean_json)
                print(f"✨ [DEBUG] Successfully parsed {len(questions)} questions.")
            except json.JSONDecodeError as je:
                print(f"❌ [PARSE ERROR] Failed to parse LLM response as JSON.")
                print(f"🔍 [DEBUG] Raw response snippet: {clean_json[:500]}...")
                raise je

            # 5. Save Output
            print(f"💾 [DEBUG] Saving paper output to database...")
            new_output = PaperOutput(
                paper_id=paper.id,
                questions=questions,
                include_answers=True,
                include_explanations=True
            )
            db.add(new_output)
            
            # Re-fetch to update status
            res_upd = await db.execute(select(Paper).where(Paper.id == paper_id))
            paper_to_done = res_upd.scalar_one()
            paper_to_done.status = "done"
            
            if job_id:
                job.status = "done"
                from datetime import datetime
                job.completed_at = datetime.utcnow()
                
            await db.commit()
            print(f"🏁 [TASK COMPLETE] Paper {paper_id} is READY.\n")

        except Exception as e:
            print(f"💥 [ERROR] Paper Generation Failed: {str(e)}")
            traceback.print_exc()
            try:
                async with SessionLocal() as err_db:
                    res_upd = await err_db.execute(select(Paper).where(Paper.id == paper_id))
                    paper_to_fail = res_upd.scalar_one_or_none()
                    if paper_to_fail:
                        paper_to_fail.status = "failed"
                    
                    if job_id:
                        from ..models.job import Job
                        j_res = await err_db.execute(select(Job).where(Job.id == job_id))
                        j = j_res.scalar_one_or_none()
                        if j:
                            j.status = "failed"
                            j.error = str(e)
                            from datetime import datetime
                            j.completed_at = datetime.utcnow()
                            
                    await err_db.commit()
                    print(f"📉 [DB] Paper {paper_id} marked as FAILED.")
            except:
                pass

async def reset_monthly_quotas(ctx):
    """
    ARQ Cron job intended to run on the 1st of every month to reset the questions_used 
    counter for all free tier users.
    """
    from sqlalchemy import update
    from ..models.user import User
    
    print("\n🔄 [CRON] Starting monthly quota reset...")
    async with SessionLocal() as db:
        try:
            # Only reset users on the free plan, although resetting all is also fine 
            # if paid plan is truly 'unlimited' regardless of counter.
            stmt = update(User).where(User.plan == "free").values(questions_used=0)
            result = await db.execute(stmt)
            await db.commit()
            print(f"✅ [CRON] Monthly quotas reset successfully. Rows affected: {result.rowcount}")
        except Exception as e:
            print(f"❌ [CRON] Failed to reset quotas: {e}")
            traceback.print_exc()
