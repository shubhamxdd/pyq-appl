import json
import httpx
from typing import AsyncGenerator
from ..config import settings

class OpenRouterClient:
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"

    async def stream_chat(self, messages: list, model: str = "openrouter/owl-alpha") -> AsyncGenerator[str, None]:
    # async def stream_chat(self, messages: list, model: str = "nvidia/nemotron-3-super-120b-a12b:free") -> AsyncGenerator[str, None]:
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

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", self.base_url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    raise RuntimeError(f"OpenRouter Error: {response.status_code} - {error_text.decode()}")

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

open_router_client = OpenRouterClient()
