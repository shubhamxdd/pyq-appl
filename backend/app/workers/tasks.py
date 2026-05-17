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
    print(f"--- Extraction Task Started: {resource_id} ---")
    
    async with SessionLocal() as db:
        try:
            # Fetch resource
            result = await db.execute(select(Resource).where(Resource.id == resource_id))
            resource = result.scalar_one_or_none()
            
            if not resource:
                print(f"DEBUG: Resource {resource_id} not found in DB")
                return
            
            print(f"DEBUG: Resource found: {resource.filename} | URL: {resource.file_url}")
            
            # For PDF files
            if resource.filename.lower().endswith('.pdf'):
                print(f"DEBUG: Starting PDF Download for {resource.filename}...")
                
                # Handle CDN URL issue: if CDN isn't enabled, the .cdn. URL won't resolve.
                download_url = resource.file_url.replace(".cdn.digitaloceanspaces.com", ".digitaloceanspaces.com")
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(download_url)
                    if response.status_code != 200:
                        raise Exception(f"Storage download failed: HTTP {response.status_code}")
                    file_content = response.content
                
                print(f"DEBUG: Downloaded {len(file_content)} bytes. Starting PDFium...")
                
                # Load PDF
                pdf = pdfium.PdfDocument(file_content)
                num_pages = len(pdf)
                pages_to_process = min(num_pages, settings.MAX_OCR_PAGES)
                print(f"DEBUG: Processing {pages_to_process} pages...")
                
                full_text = []
                
                for i in range(pages_to_process):
                    # CHECK FOR CANCELLATION (CodeRabbit/User Request)
                    # We check if the user has manually set the status to 'failed' or deleted it
                    async with SessionLocal() as check_db:
                        check_res = await check_db.execute(select(Resource).where(Resource.id == resource_id))
                        current_res = check_res.scalar_one_or_none()
                        if not current_res or current_res.status != "processing":
                            print(f"DEBUG: Processing aborted for {resource_id} (Status changed or deleted)")
                            return # Exit the task immediately

                    print(f"DEBUG: Rendering Page {i+1}/{pages_to_process}...")
                    page = pdf[i]
                    # Render page to image
                    bitmap = page.render(scale=2) 
                    pil_image = bitmap.to_pil()
                    
                    # Convert to base64
                    img_byte_arr = io.BytesIO()
                    pil_image.save(img_byte_arr, format='JPEG', quality=85)
                    img_base64 = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
                    
                    print(f"DEBUG: Sending Page {i+1} to OpenRouter (Nvidia Model)...")
                    
                    async with httpx.AsyncClient(timeout=90.0) as client:
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
                            print(f"DEBUG: Page {i+1} completed.")
                        else:
                            error_msg = f"Vision API error on page {i+1}: {vision_response.status_code} - {vision_response.text}"
                            print(f"ERROR: {error_msg}")
                            raise Exception(error_msg)

                resource.extracted_text = "\n\n".join(full_text)
                resource.status = "ready"
                print("DEBUG: Extraction successful. Status set to READY.")
            
            elif resource.filename.lower().endswith('.txt'):
                print("DEBUG: Processing text file...")
                async with httpx.AsyncClient() as client:
                    response = await client.get(resource.file_url)
                    resource.extracted_text = response.text
                    resource.status = "ready"
                print("DEBUG: Text extraction complete.")
            
            else:
                resource.status = "failed"
                print(f"DEBUG: Unsupported file type: {resource.filename}")

            await db.commit()

        except Exception as e:
            error_trace = traceback.format_exc()
            print(f"CRITICAL ERROR in extraction_task: {str(e)}")
            print(error_trace)

            # Attempt to mark as failed in DB
            try:
                # Use a fresh query for the update
                result = await db.execute(select(Resource).where(Resource.id == resource_id))
                res = result.scalar_one_or_none()
                if res:
                    res.status = "failed"
                    await db.commit()
            except Exception as commit_err:
                print(f"DEBUG: Final status update failed: {commit_err}")
