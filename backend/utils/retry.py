"""
Retry utility — exponential backoff untuk semua AI API calls
"""

import asyncio
import logging
import random
from typing import TypeVar, Callable, Awaitable

from utils.config import settings

logger = logging.getLogger(__name__)
T = TypeVar("T")


async def with_retry(
    func: Callable[[], Awaitable[T]],
    max_retry: int,
    operation_name: str = "AI call",
) -> T:
    """
    Jalankan async function dengan exponential backoff retry.

    Args:
        func: Async function yang akan dijalankan
        max_retry: Jumlah maksimum retry
        operation_name: Nama operasi untuk logging

    Returns:
        Return value dari func jika berhasil

    Raises:
        Exception: Exception terakhir jika semua retry gagal
    """
    last_exception: Exception | None = None

    for attempt in range(max_retry + 1):
        try:
            return await func()
        except Exception as exc:
            last_exception = exc
            err_str = str(exc)

            # Fatal errors — jangan retry
            if any(code in err_str for code in ["401", "403", "Unauthorized", "Forbidden"]):
                logger.error(f"[{operation_name}] Fatal auth error: {exc}")
                raise

            if attempt < max_retry:
                # Exponential backoff dengan ±10% jitter
                delay = settings.RETRY_DELAY_BASE * (2 ** attempt)
                jitter = delay * 0.1 * (2 * random.random() - 1)
                wait_time = delay + jitter

                logger.warning(
                    f"[{operation_name}] Attempt {attempt + 1}/{max_retry + 1} failed: {exc}. "
                    f"Retrying in {wait_time:.1f}s..."
                )
                await asyncio.sleep(wait_time)
            else:
                logger.error(
                    f"[{operation_name}] All {max_retry + 1} attempts failed. Last error: {exc}"
                )

    raise last_exception
