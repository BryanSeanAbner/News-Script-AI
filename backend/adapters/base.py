"""
Base AI Adapter — abstract interface untuk semua provider LLM
"""

from abc import ABC, abstractmethod


class BaseAIAdapter(ABC):
    """Abstract base class untuk semua AI provider adapters."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """
        Generate text dari LLM.

        Args:
            prompt: User prompt / message
            system_prompt: System instruction (opsional)
            temperature: Override temperature (None = gunakan default config)
            max_tokens: Override max tokens (None = gunakan default config)

        Returns:
            Raw string response dari LLM

        Raises:
            Exception: Jika API call gagal setelah semua retry
        """
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Nama provider untuk logging."""
        ...
