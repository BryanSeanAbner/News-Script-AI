import google.generativeai as genai
import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()


class _TextResponse:
    """Wrapper supaya hasil dari Groq punya bentuk yang sama dengan response Gemini (.text)."""
    def __init__(self, text: str):
        self.text = text


def _call_gemini(prompt: str):
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key.startswith("AQ."):
        raise ValueError("GEMINI_API_KEY di Vercel Settings belum valid. Gunakan API key resmi dari Google AI Studio yang diawali 'AIzaSy...'.")

    genai.configure(api_key=api_key)

    # Urutan dicoba dari yang paling murah/besar kuota gratisnya ke yang paling ketat.
    # (Agustus 2026) gemini-1.5-* dan gemini-2.0-* sudah shutdown, jangan dipakai lagi.
    models_to_try = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-flash-latest",
    ]

    last_error = None
    for model_name in models_to_try:
        try:
            m = genai.GenerativeModel(model_name)
            res = m.generate_content(prompt)
            if res and hasattr(res, "text") and res.text:
                return res
        except Exception as e:
            last_error = e
            continue

    if last_error:
        raise last_error
    raise RuntimeError("Tidak dapat menginisialisasi model Gemini AI")


def _call_groq(prompt: str):
    """Fallback ke Groq (OpenAI-compatible), dipakai kalau semua model Gemini gagal/kena quota."""
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY belum di-set. Ambil API key gratis di https://console.groq.com/keys lalu simpan sebagai env var GROQ_API_KEY.")

    groq_models_to_try = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
    ]

    last_error = None
    for model_name in groq_models_to_try:
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                },
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()
            text = data["choices"][0]["message"]["content"]
            if text:
                return _TextResponse(text)
        except Exception as e:
            last_error = e
            continue

    if last_error:
        raise last_error
    raise RuntimeError("Tidak dapat menginisialisasi model Groq")


def generate_content_with_fallback(prompt: str):
    """
    Coba semua model Gemini dulu. Kalau semuanya gagal (404 model mati,
    429 quota habis, dsb), otomatis fallback ke Groq.
    """
    load_dotenv(override=True)
    try:
        return _call_gemini(prompt)
    except Exception as gemini_error:
        try:
            return _call_groq(prompt)
        except Exception as groq_error:
            raise RuntimeError(
                f"Gemini gagal ({gemini_error}) dan Groq juga gagal ({groq_error})"
            )