"""
JSON Validator — validasi output JSON dari LLM terhadap schema
"""

import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


def repair_truncated_json(text: str) -> str:
    """Mencoba memperbaiki JSON string yang terpotong di tengah jalan."""
    s = text.strip()
    
    # Hitung tanda kurung yang belum ditutup
    open_braces = s.count('{') - s.count('}')
    open_brackets = s.count('[') - s.count(']')
    
    # Jika berada di dalam string yang belum ditutup
    in_string = False
    escaped = False
    for char in s:
        if char == '"' and not escaped:
            in_string = not in_string
        elif char == '\\' and not escaped:
            escaped = True
            continue
        escaped = False
        
    if in_string:
        s += '"'
        
    # Hapus koma gantung di akhir jika ada
    s = re.sub(r',\s*$', '', s)
    
    # Tutup bracket dan brace yang terbuka
    s += ']' * max(0, open_brackets)
    s += '}' * max(0, open_braces)
    return s


def extract_json_from_response(raw: str) -> dict | list:
    """
    Ekstrak JSON dari raw LLM response.
    Menangani kasus di mana LLM membungkus JSON dengan markdown code block atau terpotong.
    """
    text = raw.strip()

    # Coba parse langsung
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Coba strip markdown code block: ```json ... ```
    pattern = r"```(?:json)?\s*([\s\S]*?)```"
    match = re.search(pattern, text)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Coba temukan objek JSON pertama dengan regex greedy
    obj_match = re.search(r"\{[\s\S]*\}", text)
    if obj_match:
        try:
            return json.loads(obj_match.group())
        except json.JSONDecodeError:
            pass

    # Coba temukan array JSON pertama
    arr_match = re.search(r"\[[\s\S]*\]", text)
    if arr_match:
        try:
            return json.loads(arr_match.group())
        except json.JSONDecodeError:
            pass

    # Upaya perbaikan JSON jika terpotong
    try:
        repaired = repair_truncated_json(text)
        return json.loads(repaired)
    except Exception:
        pass

    raise ValueError(f"Tidak bisa menemukan JSON valid dalam response LLM. Preview: {text[:200]}")


def validate_required_keys(data: dict, required_keys: list[str], context: str = "") -> None:
    """Validasi bahwa semua required keys ada dalam dict."""
    missing = [k for k in required_keys if k not in data]
    if missing:
        raise ValueError(
            f"[{context}] Missing required keys dalam output LLM: {missing}"
        )


def safe_parse_llm_json(raw: str, required_keys: list[str] = None, context: str = "") -> Any:
    """
    Parse dan validasi JSON dari LLM response.

    Args:
        raw: Raw string response dari LLM
        required_keys: Optional list of required top-level keys
        context: Context string untuk error messages

    Returns:
        Parsed JSON object (dict atau list)
    """
    try:
        data = extract_json_from_response(raw)
    except ValueError as e:
        logger.error(f"[{context}] JSON parse error: {e}")
        raise

    if required_keys and isinstance(data, dict):
        validate_required_keys(data, required_keys, context)

    return data
