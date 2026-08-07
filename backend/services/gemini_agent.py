import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

load_dotenv()

def generate_content_with_fallback(prompt: str):
    load_dotenv(override=True)
    api_key = os.getenv("GEMINI_API_KEY", "")

    genai.configure(api_key=api_key)
    models_to_try = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-flash-latest",
    ]
    last_error = None
    for model_name in models_to_try:
        try:
            m = genai.GenerativeModel(model_name)
            res = m.generate_content(prompt)
            if res and hasattr(res, 'text') and res.text:
                return res
        except Exception as e:
            last_error = e
            continue
    if last_error:
        raise last_error
    raise RuntimeError("Tidak dapat menginisialisasi model Gemini AI")



async def analyze_news(raw_text: str, platforms: list[str]) -> dict:
    """
    Agentic AI pipeline — multi-step reasoning untuk analisis berita.
    
    Step 1: Ekstrak fakta kunci (5W+1H)
    Step 2: Analisis sentimen & tone
    Step 3: Generate kandidat angle
    Step 4: Scoring & pilih Top 3 angle terbaik
    Step 5: Generate naskah untuk setiap platform yang dipilih
    """

    # ── STEP 1: Ekstrak Fakta & Sentimen ──────────────────────────────────────
    step1_prompt = f"""Kamu adalah jurnalis senior yang berpengalaman menganalisis berita.

Analisis teks berita berikut dan ekstrak informasi penting dalam format JSON.

TEKS BERITA:
{raw_text}

Berikan respons HANYA dalam format JSON berikut (tanpa markdown, langsung JSON):
{{
  "title": "judul berita yang terdeteksi atau dibuat dari konten",
  "language": "id atau en atau bahasa lain",
  "facts": {{
    "who": "siapa yang terlibat",
    "what": "apa yang terjadi",
    "when": "kapan kejadiannya",
    "where": "di mana kejadiannya",
    "why": "mengapa bisa terjadi",
    "how": "bagaimana prosesnya"
  }},
  "sentiment": {{
    "label": "positive/negative/neutral",
    "dominant_emotion": "emosi dominan (misal: excitement, concern, outrage, hope, sadness, anger)",
    "intensity": "low/medium/high"
  }},
  "key_entities": ["entitas penting 1", "entitas penting 2"],
  "keywords": ["kata kunci 1", "kata kunci 2", "kata kunci 3"]
}}"""

    step1_response = generate_content_with_fallback(step1_prompt)
    step1_text = step1_response.text.strip()
    
    # Clean JSON response
    if "```json" in step1_text:
        step1_text = step1_text.split("```json")[1].split("```")[0].strip()
    elif "```" in step1_text:
        step1_text = step1_text.split("```")[1].split("```")[0].strip()
    
    facts_data = json.loads(step1_text)

    # ── STEP 2: Generate & Score Angle ────────────────────────────────────────
    step2_prompt = f"""Kamu adalah editor berita senior yang ahli dalam menentukan angle berita yang tepat dan bervariasi.

Berikut fakta-fakta dari berita yang sudah dianalisis:
- Judul: {facts_data.get('title', '')}
- Siapa: {facts_data['facts'].get('who', '')}
- Apa: {facts_data['facts'].get('what', '')}
- Kapan: {facts_data['facts'].get('when', '')}
- Di mana: {facts_data['facts'].get('where', '')}
- Mengapa: {facts_data['facts'].get('why', '')}
- Bagaimana: {facts_data['facts'].get('how', '')}
- Sentimen: {facts_data['sentiment'].get('label', '')}
- Emosi dominan: {facts_data['sentiment'].get('dominant_emotion', '')}

Tugasmu: Buat 5 ANGLE BERITA yang SALING BERBEDA (berbeda fokus, tone, atau aspek pembahasannya), lalu beri skor masing-masing.

Kriteria scoring (1-10):
- viral_score: Seberapa besar kemungkinan viral/dibagikan
- emotion_score: Seberapa kuat memancing emosi pembaca
- relevance_score: Seberapa relevan dengan pembaca umum
- novelty_score: Seberapa segar/unik sudut pandangnya

Berikan respons HANYA dalam format JSON (tanpa markdown, langsung JSON):
{{
  "angles": [
    {{
      "id": 1,
      "angle_name": "nama angle (misal: Human Interest, Analisis Taktis, Dampak Sosial, dsb)",
      "angle_description": "deskripsi angle ini dalam 1-2 kalimat",
      "hook": "kalimat pembuka yang memikat untuk angle ini",
      "viral_score": 8,
      "emotion_score": 7,
      "relevance_score": 9,
      "novelty_score": 6,
      "total_score": 30,
      "reasoning": "mengapa angle ini efektif"
    }}
  ]
}}"""

    step2_response = generate_content_with_fallback(step2_prompt)
    step2_text = step2_response.text.strip()
    
    if "```json" in step2_text:
        step2_text = step2_text.split("```json")[1].split("```")[0].strip()
    elif "```" in step2_text:
        step2_text = step2_text.split("```")[1].split("```")[0].strip()
    
    angles_data = json.loads(step2_text)
    
    # Sort by total_score descending, ambil Top 3
    sorted_angles = sorted(angles_data["angles"], key=lambda x: x["total_score"], reverse=True)
    top3_angles = sorted_angles[:3]

    # ── STEP 3: Generate Naskah per Platform ──────────────────────────────────
    best_angle = top3_angles[0]
    scripts = {}

    platform_instructions = {
        "tv_radio": {
            "name": "TV / Radio",
            "instruction": "Buat naskah berita untuk TV/Radio. Gunakan bahasa yang diucapkan (bukan dibaca). Pembuka kuat, isi singkat padat, penutup tegas. Panjang sekitar 150-200 kata (durasi 1 menit dibacakan). Sertakan panduan anchor: [PAUSE], [INTONASI TEGAS], dll.",
            "format": "naskah_anchor"
        },
        "article": {
            "name": "Artikel Online",
            "instruction": "Buat artikel berita online lengkap. Gunakan piramida terbalik. Headline SEO-friendly. Lead paragraph yang menarik (2-3 kalimat). Body 4-5 paragraf. Closing quote atau pernyataan. Panjang 300-400 kata.",
            "format": "artikel_lengkap"
        },
        "instagram": {
            "name": "Instagram Caption",
            "instruction": "Buat caption Instagram yang engaging. Mulai dengan hook/pertanyaan. Gunakan line breaks untuk keterbacaan. Akhiri dengan CTA (call to action). Sertakan 10-15 hashtag relevan. Maks 2200 karakter.",
            "format": "caption_ig"
        },
        "tiktok": {
            "name": "TikTok Script",
            "instruction": "Buat script untuk video TikTok pendek (30-60 detik). Format: [HOOK 3 detik], [POINT 1], [POINT 2], [POINT 3], [CTA]. Gunakan bahasa kasual dan energik. Sertakan panduan visual/action dalam tanda kurung.",
            "format": "script_tiktok"
        },
        "youtube": {
            "name": "YouTube Shorts Script",
            "instruction": "Buat script YouTube Shorts (max 60 detik). Dimulai dengan pertanyaan atau fakta mengejutkan. Struktur: Hook → Konteks → Fakta Kunci → Kesimpulan → CTA Subscribe. Sertakan panduan visual.",
            "format": "script_yt_shorts"
        }
    }

    for platform in platforms:
        if platform not in platform_instructions:
            continue

        platform_info = platform_instructions[platform]
        
        step3_prompt = f"""Kamu adalah content creator & jurnalis berpengalaman.

BERITA:
Judul: {facts_data.get('title', '')}
Fakta: {json.dumps(facts_data['facts'], ensure_ascii=False)}
Bahasa sumber: {facts_data.get('language', 'id')}

ANGLE TERPILIH:
Nama: {best_angle['angle_name']}
Deskripsi: {best_angle['angle_description']}
Hook: {best_angle['hook']}

PLATFORM TARGET: {platform_info['name']}

INSTRUKSI: {platform_info['instruction']}

Buat konten dalam bahasa yang sama dengan sumber berita ({facts_data.get('language', 'id')}).

Berikan respons HANYA dalam format JSON (tanpa markdown, langsung JSON):
{{
  "platform": "{platform}",
  "platform_name": "{platform_info['name']}",
  "headline": "headline/judul untuk platform ini",
  "content": "konten lengkap sesuai instruksi di atas",
  "word_count": 0,
  "notes": "catatan tambahan untuk redaksi (opsional)"
}}"""

        step3_response = generate_content_with_fallback(step3_prompt)
        step3_text = step3_response.text.strip()
        
        if "```json" in step3_text:
            step3_text = step3_text.split("```json")[1].split("```")[0].strip()
        elif "```" in step3_text:
            step3_text = step3_text.split("```")[1].split("```")[0].strip()
        
        script_data = json.loads(step3_text)
        # Calculate actual word count
        script_data["word_count"] = len(script_data["content"].split())
        scripts[platform] = script_data

    return {
        "facts": facts_data,
        "all_angles": sorted_angles,
        "top3_angles": top3_angles,
        "selected_angle": best_angle,
        "scripts": scripts
    }


async def regenerate_script_with_angle(
    facts_data: dict,
    angle: dict,
    platform: str
) -> dict:
    """Regenerate naskah dengan angle yang berbeda (dipilih user)."""
    
    platform_instructions = {
        "tv_radio": {
            "name": "TV / Radio",
            "instruction": "Buat naskah berita untuk TV/Radio. Gunakan bahasa yang diucapkan. Pembuka kuat, isi singkat padat, penutup tegas. Panjang sekitar 150-200 kata. Sertakan panduan anchor: [PAUSE], [INTONASI TEGAS], dll."
        },
        "article": {
            "name": "Artikel Online",
            "instruction": "Buat artikel berita online lengkap dengan piramida terbalik. Headline SEO-friendly. Lead paragraph menarik. Body 4-5 paragraf. Panjang 300-400 kata."
        },
        "instagram": {
            "name": "Instagram Caption",
            "instruction": "Buat caption Instagram engaging dengan hook, line breaks, CTA, dan 10-15 hashtag relevan. Maks 2200 karakter."
        },
        "tiktok": {
            "name": "TikTok Script",
            "instruction": "Buat script TikTok 30-60 detik. Format: [HOOK 3 detik], [POINT 1-3], [CTA]. Bahasa kasual & energik."
        },
        "youtube": {
            "name": "YouTube Shorts Script",
            "instruction": "Buat script YouTube Shorts max 60 detik. Hook → Konteks → Fakta Kunci → Kesimpulan → CTA."
        }
    }

    platform_info = platform_instructions.get(platform, {"name": platform, "instruction": "Buat naskah berita."})

    prompt = f"""Kamu adalah content creator & jurnalis berpengalaman.

BERITA:
Judul: {facts_data.get('title', '')}
Fakta: {json.dumps(facts_data['facts'], ensure_ascii=False)}
Bahasa sumber: {facts_data.get('language', 'id')}

ANGLE TERPILIH:
Nama: {angle['angle_name']}
Deskripsi: {angle['angle_description']}
Hook: {angle['hook']}

PLATFORM TARGET: {platform_info['name']}

INSTRUKSI: {platform_info['instruction']}

Berikan respons HANYA dalam format JSON (tanpa markdown):
{{
  "platform": "{platform}",
  "platform_name": "{platform_info['name']}",
  "headline": "headline/judul untuk platform ini",
  "content": "konten lengkap",
  "word_count": 0,
  "notes": "catatan tambahan opsional"
}}"""

    response = generate_content_with_fallback(prompt)
    response_text = response.text.strip()
    
    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0].strip()
    
    script_data = json.loads(response_text)
    script_data["word_count"] = len(script_data["content"].split())
    return script_data
