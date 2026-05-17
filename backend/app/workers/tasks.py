import asyncio
import base64
import io
import logging
import traceback
from sqlalchemy import select
from ..database import SessionLocal
from ..models.resource import Resource
from ..config import settings
import httpx
import pypdfium2 as pdfium
from PIL import Image

# Configure logging for the task
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def extraction_task(ctx, resource_id: str):
    logger.info(f"--- Extraction Task Started: {resource_id} ---")
    logger.info(f"Config Check: MAX_OCR_PAGES={settings.MAX_OCR_PAGES}")
    logger.info(f"Config Check: SPACES_ENDPOINT={settings.SPACES_ENDPOINT}")

    async with SessionLocal() as db:
        try:
            # Fetch resource
            result = await db.execute(select(Resource).where(Resource.id == resource_id))
            resource = result.scalar_one_or_none()

            if not resource:
                logger.error(f"Resource {resource_id} not found in DB")
                return

            logger.info(f"Resource found: {resource.filename} | URL: {resource.file_url}")

            # For PDF files
            if resource.filename.lower().endswith('.pdf'):
                logger.info("Starting PDF processing...")

                # Use storage_service to download (more reliable than public URL)
                object_name = resource.file_url.replace(f"{settings.SPACES_PUBLIC_URL}/", "")
                logger.info(f"Downloading object: {object_name}")
                file_content = storage_service.download_file(object_name)

                if not file_content:
                    raise Exception("Storage download failed via boto3")

                logger.info(f"Downloaded {len(file_content)} bytes")
                # Load PDF
                pdf = pdfium.PdfDocument(file_content)
                num_pages = len(pdf)
                pages_to_process = min(num_pages, settings.MAX_OCR_PAGES)
                logger.info(f"PDF has {num_pages} pages. Processing first {pages_to_process}.")

                full_text = []

                for i in range(pages_to_process):
                    logger.info(f"Processing page {i+1}/{pages_to_process}...")
                    page = pdf[i]
                    # Render page to image
                    bitmap = page.render(scale=2) 
                    pil_image = bitmap.to_pil()

                    # Convert to base64
                    img_byte_arr = io.BytesIO()
                    pil_image.save(img_byte_arr, format='JPEG', quality=85)
                    img_base64 = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')

                    logger.info(f"Page {i+1} rendered. Sending to Vision API...")

                    async with httpx.AsyncClient(timeout=60.0) as client:
                        vision_response = await client.post(
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                                "Content-Type": "application/json",
                                "HTTP-Referer": settings.FRONTEND_URL,
                            },
                            json={
                                "model": "google/gemini-flash-1.5-8b",
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
                            logger.info(f"Page {i+1} text extracted successfully.")
                        else:
                            error_msg = f"Vision API error on page {i+1}: {vision_response.status_code} - {vision_response.text}"
                            logger.error(error_msg)
                            raise Exception(error_msg)

                resource.extracted_text = "\n\n".join(full_text)
                resource.status = "ready"
                logger.info("Extraction complete. Status set to READY.")

            elif resource.filename.lower().endswith('.txt'):
                async with httpx.AsyncClient() as client:
                    response = await client.get(resource.file_url)
                    resource.extracted_text = response.text
                    resource.status = "ready"
                logger.info("Text extraction complete. Status set to READY.")

            else:
                resource.status = "failed"
                logger.error(f"Unsupported file type: {resource.filename}")

            await db.commit()

        except Exception as e:
            error_trace = traceback.format_exc()
            logger.error(f"Extraction failed for {resource_id}!")
            logger.error(f"Error Detail: {str(e)}")
            logger.error(f"Traceback: {error_trace}")

            # Update status to failed
            try:
                # Need to refresh session or use a new one to update status after error
                result = await db.execute(select(Resource).where(Resource.id == resource_id))
                res = result.scalar_one_or_none()
                if res:
                    res.status = "failed"
                    await db.commit()
            except Exception as commit_err:
                logger.error(f"Failed to set status to failed: {commit_err}")

 logger.error(f"Failed to set status to failed: {commit_err}")

