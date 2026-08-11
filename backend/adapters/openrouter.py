"""
OpenRouter Adapter — OpenRouter API (Multi-model access)
Digunakan sebagai fallback terakhir ketika Groq dan Gemini rate limit.
"""

import logging
from openai import AsyncOpenAI

from adapters.base import BaseAIAdapter
from utils.config import settings
from utils.retry import with_retry

logger = logging.getLogger(__name__)


class OpenRouterAdapter(BaseAIAdapter):
    """
    Adapter untuk OpenRouter API (OpenAI-compatible).
    Mendukung berbagai model dari berbagai provider.
    """

    def __init__(self, model_override: str | None = None):
        self._client = AsyncOpenAI(
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
        )
        self._model_name = model_override or settings.OPENROUTER_MODEL
        self._default_temperature = settings.GROK_TEMPERATURE
        self._default_max_tokens = settings.GROK_MAX_TOKENS
        logger.debug(f"OpenRouterAdapter initialized — model: {self._model_name}")

    @property
    def provider_name(self) -> str:
        return f"OpenRouter/{self._model_name}"

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Generate text menggunakan OpenRouter API."""
        temp = temperature if temperature is not None else self._default_temperature
        tokens = max_tokens if max_tokens is not None else self._default_max_tokens

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async def _call():
            response = await self._client.chat.completions.create(
                model=self._model_name,
                messages=messages,
                temperature=temp,
                max_tokens=tokens,
                # OpenRouter supports response_format for some models
                extra_body={
                    "response_format": {"type": "json_object"}
                }
            )
            return response.choices[0].message.content

        try:
            result = await with_retry(
                _call,
                max_retry=settings.GROK_MAX_RETRY,
                operation_name=f"OpenRouter/{self._model_name}",
            )
            logger.debug(f"[OpenRouter/{self._model_name}] Generated {len(result)} chars")
            return result
        except Exception as e:
            logger.error(f"[OpenRouter] Error: {e}")
            raise
