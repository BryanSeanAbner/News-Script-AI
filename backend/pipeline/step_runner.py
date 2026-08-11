"""
Step Runner — routing ke Groq Cloud AI Adapter untuk 8-step pipeline

Pipeline Flow (8 Steps):
1. Input Artikel (User)
2. Fact Extraction (AI)
3. Gap Analysis & Angle Mapping (AI)
4. Pilih Angle & Title Generation (User + AI - handled by router)
5. Draft Generation (AI)
6. Grounding Check (AI)
7. Editorial Review (User)
8. Publish (User)
"""

import logging

from adapters.base import BaseAIAdapter
from adapters.multi_provider import get_ai_adapter

logger = logging.getLogger(__name__)

# AI steps yang dijalankan secara otomatis
AI_STEPS = (2, 3, 5, 6)

# User input steps (handled by router directly)
USER_STEPS = (1, 4, 7, 8)


def get_adapter_for_step(step: int) -> BaseAIAdapter:
    """Dapatkan adapter AI dengan multi-provider fallback."""
    if step not in AI_STEPS:
        raise ValueError(f"Step {step} tidak memerlukan AI adapter")
    return get_ai_adapter()


async def run_step(step: int, session: dict) -> dict:
    """
    Jalankan step pipeline dan return hasilnya.
    
    Args:
        step: Step number (2, 3, 5, 6 untuk AI steps)
        session: Session dict
    
    Returns:
        Step output data
    
    Note:
        Step 1, 4, 7, 8 adalah user input steps yang handled by router
    """
    from pipeline.steps import step_02, step_03, step_06, step_07, step_08

    step_functions = {
        2: step_02.run,        # Fact Extraction
        3: step_03.run,        # Gap Analysis & Angle Mapping
        5: step_07.run,        # Draft Generation (step 7 file but step 5 in pipeline)
        6: step_08.run,        # Grounding Check (step 8 file but step 6 in pipeline)
    }

    func = step_functions.get(step)
    if func is None:
        raise ValueError(f"No runner defined for step {step}")

    adapter = get_adapter_for_step(step)
    logger.info(f"Running Step {step} with {adapter.provider_name}")
    
    return await func(session, adapter)
