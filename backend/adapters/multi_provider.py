"""
Multi-Provider Fallback Manager
Mengelola fallback otomatis antar AI providers: Groq → Gemini → OpenRouter
"""

import logging
from typing import List, Type

from adapters.base import BaseAIAdapter
from adapters.groq import GroqAdapter
from adapters.gemini import GeminiAdapter
from adapters.openrouter import OpenRouterAdapter
from utils.config import settings

logger = logging.getLogger(__name__)


class MultiProviderAdapter(BaseAIAdapter):
    """
    Adapter yang otomatis fallback ke provider lain ketika rate limit atau error.
    
    Priority order:
    1. Groq (fastest, free tier)
    2. Gemini (Google, reliable)
    3. OpenRouter (paid, most reliable)
    """

    def __init__(self):
        self._providers: List[tuple[str, Type[BaseAIAdapter]]] = []
        
        # Build provider list based on available API keys
        if settings.GROK_API_KEY:
            self._providers.append(("Groq", GroqAdapter))
        
        if settings.GEMINI_API_KEY:
            self._providers.append(("Gemini", GeminiAdapter))
        
        if settings.OPENROUTER_API_KEY:
            self._providers.append(("OpenRouter", OpenRouterAdapter))
        
        if not self._providers:
            raise ValueError("No AI provider API keys configured!")
        
        logger.info(f"MultiProviderAdapter initialized with {len(self._providers)} providers: {[p[0] for p in self._providers]}")
        
        self._current_provider_name = self._providers[0][0]

    @property
    def provider_name(self) -> str:
        return f"Multi({self._current_provider_name})"

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """
        Generate text dengan fallback otomatis antar providers.
        
        Tries each provider in order until one succeeds.
        """
        last_error = None
        
        for provider_name, ProviderClass in self._providers:
            try:
                logger.info(f"[MultiProvider] Trying {provider_name}...")
                self._current_provider_name = provider_name
                
                adapter = ProviderClass()
                result = await adapter.generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                
                logger.info(f"[MultiProvider] ✓ {provider_name} succeeded")
                return result
                
            except Exception as e:
                last_error = e
                error_msg = str(e).lower()
                
                # Check if it's a rate limit error
                is_rate_limit = any(keyword in error_msg for keyword in [
                    "rate limit",
                    "rate_limit",
                    "429",
                    "quota",
                    "too many requests",
                    "resource_exhausted",
                ])
                
                if is_rate_limit:
                    logger.warning(f"[MultiProvider] {provider_name} rate limited: {e}")
                else:
                    logger.error(f"[MultiProvider] {provider_name} error: {e}")
                
                # Try next provider
                continue
        
        # All providers failed
        logger.error(f"[MultiProvider] All providers failed! Last error: {last_error}")
        raise Exception(f"All AI providers failed. Last error: {last_error}")


def get_ai_adapter() -> BaseAIAdapter:
    """
    Factory function to get the appropriate AI adapter.
    Returns MultiProviderAdapter for automatic fallback.
    """
    return MultiProviderAdapter()
