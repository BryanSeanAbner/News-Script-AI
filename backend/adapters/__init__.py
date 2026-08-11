"""
AI Adapters — Multi-provider fallback system
"""

from adapters.base import BaseAIAdapter
from adapters.groq import GroqAdapter
from adapters.gemini import GeminiAdapter
from adapters.openrouter import OpenRouterAdapter

__all__ = [
    "BaseAIAdapter",
    "GroqAdapter",
    "GeminiAdapter",
    "OpenRouterAdapter",
]
