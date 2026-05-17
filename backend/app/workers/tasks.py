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

async def extraction_task(ctx, resource_id: str):
    print(f"\n🚀 [TASK START] Resource ID: {resource_id}")
    
    async with SessionLocal() as db:
        try:
            # 1. Fetch Resource
            result = await db.execute(select(Resource).where(Resource.id == resource_id))
            resource = result.scalar_one_or_none()
            
            if not resource:
                print(f"❌ [DB ERROR] Resource {resource_id} not found.")
                return
            
            print(f"📄 [PROCESSING] Filename: {resource.filename} | Type: {resource.type}")

            # 2. Check for initial cancellation
            if resource.status != "processing":
                print(f"⚠️ [ABORTED] Task aborted before starting (Status: {resource.status})")
                return

            # 3. Handle PDF Files
            if resource.filename.lower().endswith('.pdf'):
                print(f"📥 [STEP 1/3] Downloading PDF from Storage...")
                
                # Handle CDN URL issue
                download_url = resource.file_url.replace(".cdn.digitaloceanspaces.com", ".digitaloceanspaces.com")
                
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.get(download_url)
                    if response.status_code != 200:
                        raise Exception(f"Storage download failed: HTTP {response.status_code}")
                    file_content = response.content
                
                print(f"✅ [SUCCESS] Downloaded {len(file_content) / 1024 / 1024:.2f} MB")
                
                # 4. Process Pages
                print(f"⚙️ [STEP 2/3] Initializing PDFium renderer...")
                pdf = pdfium.PdfDocument(file_content)
                num_pages = len(pdf)
                pages_to_process = min(num_pages, settings.MAX_OCR_PAGES)
                print(f"🔍 [INFO] Total Pages: {num_pages} | Processing Limit: {pages_to_process}")
                
                full_text = []
                
                for i in range(pages_to_process):
                    # Robust Cancellation Check
                    async with SessionLocal() as check_db:
                        check_res = await check_db.execute(select(Resource).where(Resource.id == resource_id))
                        current_status = check_res.scalar_one().status
                        if current_status != "processing":
                            print(f"🛑 [STOPPED] Cancellation detected at Page {i+1}. Aborting loop.")
                            return

                    print(f"📸 [PAGE {i+1}/{pages_to_process}] Rendering & Base64 Encoding...")
                    page = pdf[i]
                    bitmap = page.render(scale=2) 
                    pil_image = bitmap.to_pil()
                    
                    img_byte_arr = io.BytesIO()
                    pil_image.save(img_byte_arr, format='JPEG', quality=85)
                    img_base64 = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
                    
                    print(f"📡 [PAGE {i+1}/{pages_to_process}] Sending to OpenRouter (Nvidia Model)...")
                    
                    async with httpx.AsyncClient(timeout=120.0) as client:
                        vision_response = await client.post(
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                                "Content-Type": "application/json",
                                "HTTP-Referer": settings.FRONTEND_URL,
                                "X-Title": "PYQ Solver App",
                            },
                            json={
                                "model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
                                "messages": [
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
                            }
                        )
                        
                        if vision_response.status_code == 200:
                            page_text = vision_response.json()['choices'][0]['message']['content']
                            full_text.append(f"--- Page {i+1} ---\n{page_text}")
                            print(f"✨ [PAGE {i+1}] Extraction successful.")
                        else:
                            error_msg = f"Vision API error: {vision_response.status_code} - {vision_response.text}"
                            raise Exception(error_msg)

                # Final Status Check before committing
                async with SessionLocal() as final_check:
                    f_res = await final_check.execute(select(Resource).where(Resource.id == resource_id))
                    if f_res.scalar_one().status != "processing":
                        print(f"🛑 [ABORTED] Final commit skipped. User stopped task during last page.")
                        return

                resource.extracted_text = "\n\n".join(full_text)
                resource.status = "ready"
                print(f"💾 [STEP 3/3] Saving extracted text to DB...")
                await db.commit()
                print(f"🏁 [TASK COMPLETE] Resource {resource_id} is now READY.\n")
            
            elif resource.filename.lower().endswith('.txt'):
                print("📝 [TEXT] Extracting plain text content...")
                async with httpx.AsyncClient() as client:
                    response = await client.get(resource.file_url)
                    resource.extracted_text = response.text
                    resource.status = "ready"
                await db.commit()
                print("🏁 [TASK COMPLETE] Text file is READY.\n")
            
            else:
                resource.status = "failed"
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
                        await err_db.commit()
                        print(f"📉 [DB] Resource {resource_id} marked as FAILED.")
            except Exception as final_err:
                print(f"💀 [FATAL] Could not even mark as failed: {final_err}")
