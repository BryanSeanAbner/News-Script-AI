# Pipeline Flow (8 Steps) - Fixed

## Overview
Pipeline berita AI dengan 8 langkah yang jelas: 5 AI steps dan 3 user input steps.

## Step-by-Step Flow

### Step 1: Input Artikel (User Input)
**Endpoint:** `POST /{session_id}/steps/1/submit`
- Editor submit artikel referensi
- Data: title, body, sources, metadata

### Step 2: Fact Extraction (AI)
**Endpoint:** `POST /{session_id}/steps/2/run`
- AI ekstrak fakta-fakta dari artikel
- Output: facts[], entity_map, summary, total_facts

### Step 3: Gap Analysis & Angle Mapping (AI)
**Endpoint:** `POST /{session_id}/steps/3/run`
- AI identifikasi gap editorial
- AI mapping 3 angle/perspektif berita
- Output: gaps[], angles[]

### Step 4: Pilih Angle (User Input)
**Endpoint:** `POST /{session_id}/steps/4/select-angle`
- Editor pilih 1 angle dari 3 opsi
- Data: selected_angle_id
- Output: selected_angle_id, selected_angle

### Step 5: Title Generation (AI)
**Endpoint:** `POST /{session_id}/steps/5/run`
- AI generate 3-5 opsi judul berdasarkan angle terpilih
- Output: titles[], primary_keyword

### Step 6: Pilih Judul (User Input)
**Endpoint:** `POST /{session_id}/steps/6/select-title`
- Editor pilih judul final atau custom title
- Data: selected_title_id atau custom_title
- Output: selected_title, selected_title_id

### Step 7: Draft Article (AI)
**Endpoint:** `POST /{session_id}/steps/7/run`
- AI tulis draft artikel lengkap
- Output: paragraphs[], content, word_count

### Step 8: Grounding Check (AI)
**Endpoint:** `POST /{session_id}/steps/8/run`
- AI verifikasi semua klaim terhadap fakta sumber
- Output: grounding_score, claim_evidence_map, status

### Editorial Review
**Endpoint:** `POST /{session_id}/editorial-review`
- Editor review final: approved / revision_small / revision_large
- Data: review_status, editor_notes

### Publish
**Endpoint:** `POST /{session_id}/publish`
- Publish artikel yang sudah approved
- Output: article, publication_meta, pipeline_summary

## AI vs User Steps

**AI Steps (5):** 2, 3, 5, 7, 8
- Menggunakan Groq/LangChain adapter
- Otomatis dijalankan oleh sistem

**User Steps (3):** 1, 4, 6
- Memerlukan input manual dari editor
- Handled by router endpoints

## File Structure

```
backend/pipeline/
├── steps/
│   ├── step_02.py      # Fact Extraction
│   ├── step_03.py      # Gap Analysis & Angle Mapping
│   ├── step_04.py      # Angle Selection (helper)
│   ├── step_06.py      # Title Generation
│   ├── step_07.py      # Draft Article
│   └── step_08.py      # Grounding Check
├── step_runner.py      # Legacy runner
├── langgraph_pipeline.py       # LangGraph implementation
└── langgraph_step_runner.py   # LangGraph integration

backend/routers/
└── pipeline.py         # FastAPI endpoints
```

## Changes Made

1. **Created `step_04.py`** - User input helper for angle selection
2. **Fixed `pipeline.py`** - Separated endpoints:
   - `/steps/4/select-angle` - Step 4 (user selects angle)
   - `/steps/5/run` - Step 5 (AI generates titles)
   - `/steps/6/select-title` - Step 6 (user selects title)
3. **Updated `step_runner.py`** - Corrected AI step mapping (2,3,5,7,8)
4. **Cleaned up** - Removed test files and redundant documentation

## Testing Checklist

- [ ] Step 1: Submit artikel works
- [ ] Step 2: Fact extraction completes
- [ ] Step 3: Gap analysis + angles generated
- [ ] Step 4: Angle selection works (no skip to step 5)
- [ ] Step 5: Title generation works
- [ ] Step 6: Title selection works
- [ ] Step 7: Draft article generated
- [ ] Step 8: Grounding check completes
- [ ] Editorial review flow works
- [ ] Publish works
