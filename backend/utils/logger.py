"""
Logger setup — konfigurasi logging untuk backend
"""

import logging
import sys
from utils.config import settings


def setup_logger():
    """Setup root logger berdasarkan konfigurasi dari .env"""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    handlers: list[logging.Handler] = [
        logging.StreamHandler(sys.stdout),
    ]

    if settings.LOG_TO_FILE:
        import os
        os.makedirs(os.path.dirname(settings.LOG_FILE_PATH), exist_ok=True)
        handlers.append(logging.FileHandler(settings.LOG_FILE_PATH, encoding="utf-8"))

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers,
    )

    # Kurangi noise dari library pihak ketiga
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("google").setLevel(logging.WARNING)
