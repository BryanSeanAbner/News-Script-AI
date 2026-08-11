"""
Step 4 — Pilih Angle & Judul (User Input Step)
User memilih angle dari hasil Gap Analysis (Step 3).
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def save_angle_selection(session: dict, selected_angle_id: str) -> dict:
    """
    Simpan pilihan angle user ke session (Step 4).
    
    Args:
        session: Session dict
        selected_angle_id: ID angle yang dipilih user
    
    Returns:
        Step 4 data yang disimpan
    """
    step3 = session["data"].get("step_3")
    if not step3:
        raise ValueError("Step 3 (Gap Analysis & Angles) belum selesai")
    
    angles = step3.get("angles", [])
    valid_ids = [a["id"] for a in angles]
    
    if selected_angle_id not in valid_ids:
        raise ValueError(
            f"Angle ID '{selected_angle_id}' tidak valid. "
            f"Pilih dari: {valid_ids}"
        )
    
    # Find selected angle details
    selected_angle = next(
        (a for a in angles if a["id"] == selected_angle_id),
        None
    )
    
    now = datetime.now(timezone.utc).isoformat()
    step4_data = {
        "selected_angle_id": selected_angle_id,
        "selected_angle": selected_angle,
        "selected_at": now,
    }
    
    logger.info(f"Step 4 complete: Angle '{selected_angle_id}' selected")
    return step4_data
