import asyncio
import base64
import io
import logging
from sqlalchemy import select
from ..database import SessionLocal
from ..models.resource import Resource
from ..config import settings
import httpx
import pypdfium2 as pdfium
from PIL import Image

async def extraction_task(ctx, resource_id: str):
    logging.info(f"Starting extraction for resource {resource_id}")
    
    async with SessionLocal() as db:
        # Fetch resource
        result = await db.execute(select(Resource).where(Resource.id == resource_id))
        resource = result.scalar_one_or_none()
        
        if not resource:
            logging.error(f"Resource {resource_id} not found")
            return
        
        try:
            # For PDF files
            if resource.filename.lower().endswith('.pdf'):
                # Download file from DO Spaces
                async with httpx.AsyncClient() as client:
                    response = await client.get(resource.file_url)
                    if response.status_code != 200:
                        raise Exception(f"Failed to download file from storage: {response.status_code}")
                    file_content = response.content
                
                # Load PDF
                pdf = pdfium.PdfDocument(file_content)
                num_pages = len(pdf)
                pages_to_process = min(num_pages, settings.MAX_OCR_PAGES)
                
                full_text = []
                
                for i in range(pages_to_process):
                    page = pdf[i]
                    # Render page to image
                    bitmap = page.render(scale=2) # 2x scale for better OCR
                    pil_image = bitmap.to_pil()
                    
                    # Convert to base64
                    img_byte_arr = io.BytesIO()
                    pil_image.save(img_byte_arr, format='JPEG', quality=85)
                    img_base64 = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
                    
                    # Call OpenRouter Vision Model (Claude 3.5 Sonnet)
                    async with httpx.AsyncClient(timeout=60.0) as client:
                        vision_response = await client.post(
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                                "Content-Type": "application/json",
                                "HTTP-Referer": settings.FRONTEND_URL,
                            },
                            json={
                                "model": "anthropic/claude-3.5-sonnet",
                                "messages": [
                                    {
                                        "role": "user",
                                        "content": [
                                            {"type": "text", "text": "Extract all text from this page image precisely. If there are tables or diagrams, describe them briefly in text format. Return only the extracted text."},
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
                        else:
                            logging.error(f"Vision API error on page {i+1}: {vision_response.text}")
                            full_text.append(f"--- Page {i+1} ---\n[Error extracting text]")

                resource.extracted_text = "\n\n".join(full_text)
                resource.status = "ready"
            
            # For Plain Text files
            elif resource.filename.lower().endswith('.txt'):
                async with httpx.AsyncClient() as client:
                    response = await client.get(resource.file_url)
                    resource.extracted_text = response.text
                    resource.status = "ready"
            
            else:
                resource.status = "failed"
                logging.error(f"Unsupported file type for extraction: {resource.filename}")

        except Exception as e:
            logging.error(f"Extraction failed for {resource_id}: {str(e)}")
            resource.status = "failed"
        
        await db.commit()
