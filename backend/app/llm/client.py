import json
import httpx
import asyncio
import logging
from typing import AsyncGenerator
from ..config import settings

logger = logging.getLogger(__name__)

class OpenRouterClient:
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"

    async def complete_chat(self, messages: list, model: str, max_retries: int = 3) -> dict:
        """Standard chat completion with exponential backoff retries."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.FRONTEND_URL,
            "X-Title": "PYQ Solver",
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": False
        }

        last_error = None
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(self.base_url, headers=headers, json=payload)
                    
                    if response.status_code == 200:
                        return response.json()
                    
                    # Retry on transient errors (429, 500, 502, 503, 504)
                    if response.status_code in [429, 500, 502, 503, 504]:
                        error_msg = f"Transient error {response.status_code}: {response.text}"
                        logger.warning(f"Attempt {attempt + 1} failed: {error_msg}. Retrying...")
                        last_error = RuntimeError(error_msg)
                    else:
                        # Permanent error, don't retry
                        error_text = response.text
                        raise RuntimeError(f"OpenRouter Permanent Error: {response.status_code} - {error_text}")

            except (httpx.ConnectError, httpx.TimeoutException) as e:
                logger.warning(f"Attempt {attempt + 1} failed: Network/Timeout error. Retrying...")
                last_error = e
            
            # Exponential backoff: 2s, 4s, 8s...
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** (attempt + 1))
        
        raise last_error

    async def stream_chat(self, messages: list, model: str = "openrouter/owl-alpha", max_retries: int = 3) -> AsyncGenerator[str, None]:
        """Streaming chat completion with exponential backoff retries on initial connection."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.FRONTEND_URL,
            "X-Title": "PYQ Solver",
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": True
        }

        last_error = None
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    async with client.stream("POST", self.base_url, headers=headers, json=payload) as response:
                        if response.status_code == 200:
                            async for line in response.aiter_lines():
                                if not line or line == "":
                                    continue
                                
                                if line.startswith("data: "):
                                    data_str = line[6:]
                                    if data_str == "[DONE]":
                                        break
                                    
                                    try:
                                        data = json.loads(data_str)
                                        chunk = data['choices'][0]['delta'].get('content', "")
                                        if chunk:
                                            yield chunk
                                    except Exception:
                                        continue
                            return # Success, exit retry loop

                        # Handle errors
                        if response.status_code in [429, 500, 502, 503, 504]:
                            error_text = await response.aread()
                            error_msg = f"Transient error {response.status_code}: {error_text.decode()}"
                            logger.warning(f"Attempt {attempt + 1} failed: {error_msg}. Retrying...")
                            last_error = RuntimeError(error_msg)
                        else:
                            error_text = await response.aread()
                            raise RuntimeError(f"OpenRouter Permanent Error: {response.status_code} - {error_text.decode()}")

            except (httpx.ConnectError, httpx.TimeoutException) as e:
                logger.warning(f"Attempt {attempt + 1} failed: Network/Timeout error. Retrying...")
                last_error = e
            
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** (attempt + 1))
        
        raise last_error

open_router_client = OpenRouterClient()
