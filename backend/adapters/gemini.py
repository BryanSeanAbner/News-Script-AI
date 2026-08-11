"""
Gemini Adapter — Google Gemini API (Flash models)
Digunakan sebagai fallback provider ketika Groq rate limit.
"""

import logging
import json
import google.generativeai as genai

from adapters.base import BaseAIAdapter
from utils.config import settings
from utils.retry import with_retry

logger = logging.getLogger(__name__)


class GeminiAdapter(BaseAIAdapter):
    """
    Adapter untuk Google Gemini API.
    Mendukung JSON mode dan fast inference.
    """

    def __init__(self, model_override: str | None = None):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._model_name = model_override or settings.GEMINI_MODEL
        self._model = genai.GenerativeModel(
            model_name=self._model_name,
            generation_config={
                "temperature": settings.GROK_TEMPERATURE,
                "max_output_tokens": settings.GROK_MAX_TOKENS,
                "response_mime_type": "application/json",
            }
        )
        logger.debug(f"GeminiAdapter initialized — model: {self._model_name}")

    @property
    def provider_name(self) -> str:
        return f"Gemini/{self._model_name}"

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Generate text menggunakan Gemini API."""
        
        # Combine system prompt with user prompt
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        # Update generation config if custom params provided
        config = {
            "temperature": temperature if temperature is not None else settings.GROK_TEMPERATURE,
            "max_output_tokens": max_tokens if max_tokens is not None else settings.GROK_MAX_TOKENS,
            "response_mime_type": "application/json",
        }

        async def _call():
            # Gemini SDK is sync, but we wrap it for consistency
            import asyncio
            loop = asyncio.get_event_loop()
            
            def _sync_call():
                response = self._model.generate_content(
                    full_prompt,
                    generation_config=config
                )
                return response.text
            
            result = await loop.run_in_executor(None, _sync_call)
            return result

        try:
            result = await with_retry(
                _call,
                max_retry=settings.GROK_MAX_RETRY,
                operation_name=f"Gemini/{self._model_name}",
            )
            logger.debug(f"[Gemini/{self._model_name}] Generated {len(result)} chars")
            return result
        except Exception as e:
            logger.error(f"[Gemini] Error: {e}")
            raise
