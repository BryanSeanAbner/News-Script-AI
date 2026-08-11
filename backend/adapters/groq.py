"""
Groq Adapter — Groq Cloud API (Llama 3.3 70B, Llama 3.1 8B, Qwen 3.6)
Digunakan sebagai adapter AI utama untuk seluruh pipeline steps.
"""

import logging

from openai import AsyncOpenAI

from adapters.base import BaseAIAdapter
from utils.config import settings
from utils.retry import with_retry

logger = logging.getLogger(__name__)


class GroqAdapter(BaseAIAdapter):
    """
    Adapter untuk Groq Cloud API (OpenAI-compatible).
    Sangat cepat, handal, dan mendukung JSON Mode native.
    """

    def __init__(self, model_override: str | None = None):
        self._client = AsyncOpenAI(
            api_key=settings.GROK_API_KEY,
            base_url=settings.GROK_BASE_URL,
        )
        self._model_name = model_override or settings.GROK_MODEL
        self._default_temperature = settings.GROK_TEMPERATURE
        self._default_max_tokens = settings.GROK_MAX_TOKENS
        logger.debug(f"GroqAdapter initialized — model: {self._model_name}")

    @property
    def provider_name(self) -> str:
        return f"Groq/{self._model_name}"

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Generate text terstruktur menggunakan Groq Cloud API."""
        temp = temperature if temperature is not None else self._default_temperature
        tokens = max_tokens if max_tokens is not None else self._default_max_tokens

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Fallback list jika model pilihan utama sibuk atau rate limited
        FALLBACK_MODELS = [
            self._model_name,
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "qwen/qwen3.6-27b",
        ]
        fallback_list = []
        for m in FALLBACK_MODELS:
            if m not in fallback_list:
                fallback_list.append(m)

        last_error = None
        for m_name in fallback_list:
            try:
                async def _call():
                    response = await self._client.chat.completions.create(
                        model=m_name,
                        messages=messages,
                        temperature=temp,
                        max_tokens=tokens,
                        response_format={"type": "json_object"},
                    )
                    return response.choices[0].message.content

                result = await with_retry(
                    _call,
                    max_retry=settings.GROK_MAX_RETRY,
                    operation_name=f"Groq/{m_name}",
                )

                logger.debug(f"[Groq/{m_name}] Generated {len(result)} chars")
                return result

            except Exception as e:
                last_error = e
                logger.warning(f"[Groq] Model '{m_name}' failed ({e}). Trying fallback...")

        raise last_error
