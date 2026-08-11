# ARCHITECTURE.md — NewsScript AI

Dokumentasi teknis arsitektur sistem **NewsScript AI** secara lengkap.

---

## 1. System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER (User / Editor)                     │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  React App (Vite)                       │   │
│   │                                                         │   │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  │   │
│   │  │ Step 1  │→ │ Step 2  │→ │ Step 3  │→ │  Step 4  │  │   │
│   │  │ Input   │  │ Facts   │  │  Gaps   │  │  Angles  │  │   │
│   │  └─────────┘  └─────────┘  └─────────┘  └──────────┘  │   │
│   │       ↓            ↓            ↓             ↓        │   │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  │   │
│   │  │ Step 5  │→ │ Step 6  │→ │ Step 7  │→ │  Step 8  │  │   │
│   │  │Pick Ang │  │ Titles  │  │  Draft  │  │ Grounding│  │   │
│   │  └─────────┘  └─────────┘  └─────────┘  └──────────┘  │   │
│   │       ↓                                       ↓        │   │
│   │  ┌─────────┐                            ┌──────────┐   │   │
│   │  │ Step 9  │←────────── LOOP_SMALL ─────│  Step 9  │   │   │
│   │  │ Review  │←────────── LOOP_LARGE ─────│  Review  │   │   │
│   │  └─────────┘                            └──────────┘   │   │
│   │       ↓                                                 │   │
│   │  ┌─────────┐                                           │   │
│   │  │ Step 10 │                                           │   │
│   │  │ Publish │                                           │   │
│   │  └─────────┘                                           │   │
│   └─────────────────────────────────────────────────────────┘   │
│                         │ REST API (JSON)                        │
└─────────────────────────┼───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    BACKEND — FastAPI (Python)                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Pipeline Orchestrator                        │   │
│  │   SessionManager → StepRunner → StateUpdater             │   │
│  └──────────┬───────────────────────────────────────────────┘   │
│             │                                                    │
│   ┌─────────▼──────────┐        ┌──────────────────────────┐   │
│   │   Gemini Adapter   │        │      Grok Adapter         │   │
│   │  (Steps 2,3,4,6,8) │        │      (Step 7 ONLY)        │   │
│   │  google-generativeai│       │  OpenAI-compat client     │   │
│   └────────────────────┘        └──────────────────────────┘   │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │                  File Storage                             │   │
│   │     data/sessions/<session_id>.json                      │   │
│   │     data/published/<session_id>.json                     │   │
│   └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          │
            ┌─────────────┴────────────┐
            │                          │
   ┌────────▼─────────┐    ┌───────────▼──────────┐
   │  Google Gemini   │    │      xAI Grok         │
   │  Flash API       │    │      API (x.ai)       │
   │  (aistudio.google│    │  (api.x.ai/v1)        │
   │   .com)          │    │                       │
   └──────────────────┘    └───────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Tech Stack

| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| React | 18 | UI framework |
| Vite | 5+ | Build tool & dev server |
| React Router | v6 | Client-side routing |
| Zustand | 4+ | Global state management |
| Vanilla CSS | — | GitHub Light design system |

### 2.2 Routing Structure

```
/                           → Redirect ke /session/new
/session/new                → Step 1: Editor Input Artikel
/session/:id/step/2         → Step 2: Fact Extraction (auto)
/session/:id/step/3         → Step 3: Gap Analysis (auto)
/session/:id/step/4         → Step 4: Angle Mapping (auto)
/session/:id/step/5         → Step 5: Pilih Angle [HUMAN GATE]
/session/:id/step/6         → Step 6: Title Generation (auto)
/session/:id/step/7         → Step 7: Draft Generation (auto)
/session/:id/step/8         → Step 8: Grounding Check (auto)
/session/:id/step/9         → Step 9: Editorial Review [HUMAN GATE]
/session/:id/step/10        → Step 10: Publish
/sessions                   → Daftar semua session
/session/:id/published      → Preview artikel terpublish
```

### 2.3 State Management (Zustand)

```
useSessionStore
├── currentSession: Session | null
├── currentStep: number (1-10)
├── isLoading: boolean
├── error: string | null
├── actions:
│   ├── createSession()
│   ├── loadSession(id)
│   ├── advanceStep()
│   ├── setLoopSmall()    ← kembali ke step 7
│   └── setLoopLarge()    ← kembali ke step 4

usePipelineStore
├── articleInput: ArticleInput | null
├── factExtraction: FactExtraction | null
├── gapAnalysis: GapAnalysis | null
├── angleMapping: AngleMapping | null
├── selectedAngle: Angle | null
├── titleOptions: TitleOptions | null
├── selectedTitle: string | null
├── draft: Draft | null
├── groundingResult: GroundingResult | null
├── publishOutput: PublishOutput | null
└── actions: (setter per field)
```

### 2.4 Component Tree

```
App
├── Layout
│   ├── Sidebar
│   │   ├── PipelineProgress     ← visualisasi 10 step
│   │   └── SessionInfo
│   └── MainContent
│       ├── PageHeader
│       └── <StepPage />         ← route-dependent
│
├── Pages (per step)
│   ├── ArticleInputPage         ← Step 1
│   ├── FactExtractionPage       ← Step 2
│   ├── GapAnalysisPage          ← Step 3
│   ├── AngleMappingPage         ← Step 4
│   ├── AngleSelectPage          ← Step 5 [HUMAN GATE]
│   ├── TitleGenerationPage      ← Step 6
│   ├── DraftGenerationPage      ← Step 7
│   ├── GroundingCheckPage       ← Step 8
│   ├── EditorialReviewPage      ← Step 9 [HUMAN GATE]
│   └── PublishPage              ← Step 10
│
└── Shared Components
    ├── StepCard                 ← wrapper untuk setiap step
    ├── LoadingSpinner
    ├── JsonViewer               ← display JSON facts/gaps
    ├── GroundingBadge           ← score display
    ├── AlertBanner              ← warning/error/success
    └── RevisionModal            ← LOOP_SMALL / LOOP_LARGE
```

---

## 3. Backend Architecture

### 3.1 FastAPI Structure

```
backend/
├── main.py                    ← FastAPI app, CORS, middleware
├── routers/
│   ├── sessions.py            ← CRUD session endpoints
│   └── pipeline.py            ← Per-step trigger endpoints
├── pipeline/
│   ├── orchestrator.py        ← Koordinasi urutan step
│   ├── step_runner.py         ← Eksekusi tiap step
│   └── steps/
│       ├── step_02_facts.py
│       ├── step_03_gaps.py
│       ├── step_04_angles.py
│       ├── step_06_titles.py
│       ├── step_07_draft.py
│       └── step_08_grounding.py
├── adapters/
│   ├── base.py                ← Abstract AI adapter
│   ├── gemini.py              ← Google Gemini adapter
│   └── grok.py                ← xAI Grok adapter
├── schemas/                   ← Pydantic models
│   ├── session.py
│   ├── article_input.py
│   ├── fact_extraction.py
│   ├── gap_analysis.py
│   ├── angle_mapping.py
│   ├── title_options.py
│   ├── draft.py
│   ├── grounding_result.py
│   └── publish_output.py
├── storage/
│   └── session_store.py       ← Read/write JSON files
├── utils/
│   ├── retry.py               ← Exponential backoff
│   ├── json_validator.py      ← Validate LLM output vs schema
│   └── logger.py
└── prompts/                   ← Prompt templates per step
    ├── fact_extraction.txt
    ├── gap_analysis.txt
    ├── angle_mapping.txt
    ├── title_generation.txt
    ├── draft_generation.txt
    └── grounding_check.txt
```

### 3.2 API Endpoints

```
POST   /api/sessions/                       ← Buat session baru
GET    /api/sessions/                       ← List semua session
GET    /api/sessions/{session_id}           ← Get session detail
DELETE /api/sessions/{session_id}           ← Hapus session

POST   /api/sessions/{id}/steps/2/run      ← Jalankan Step 2
POST   /api/sessions/{id}/steps/3/run      ← Jalankan Step 3
POST   /api/sessions/{id}/steps/4/run      ← Jalankan Step 4
POST   /api/sessions/{id}/steps/6/run      ← Jalankan Step 6
POST   /api/sessions/{id}/steps/7/run      ← Jalankan Step 7
POST   /api/sessions/{id}/steps/8/run      ← Jalankan Step 8

POST   /api/sessions/{id}/steps/5/select  ← Editor pilih angle
POST   /api/sessions/{id}/steps/9/review  ← Editor review (approve/revise)
POST   /api/sessions/{id}/steps/10/publish ← Publish artikel

POST   /api/sessions/{id}/loop/small      ← Trigger LOOP_SMALL
POST   /api/sessions/{id}/loop/large      ← Trigger LOOP_LARGE
```

---

## 4. AI Adapter Pattern

```python
# base.py — Abstract interface
class BaseAIAdapter(ABC):
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str: ...

# gemini.py — Implementasi Gemini
class GeminiAdapter(BaseAIAdapter):
    # Digunakan untuk: Step 2, 3, 4, 6, 8
    async def generate(self, ...) -> str:
        # Panggil google-generativeai SDK
        # Retry dengan exponential backoff
        # Return raw string response

# grok.py — Implementasi Grok
class GrokAdapter(BaseAIAdapter):
    # Digunakan KHUSUS untuk: Step 7
    async def generate(self, ...) -> str:
        # Panggil xAI API (OpenAI-compatible)
        # Retry dengan exponential backoff
        # Return raw string response
```

**Router logic di `step_runner.py`:**

```python
def get_adapter_for_step(step: int) -> BaseAIAdapter:
    if step == 7:
        return GrokAdapter()          # Draft Generation — Grok ONLY
    elif step in (2, 3, 4, 6, 8):
        return GeminiAdapter()        # Semua step murah — Gemini
    else:
        raise ValueError(f"Step {step} tidak memerlukan AI adapter")
```

---

## 5. Session Data Flow

```
Session File: data/sessions/<uuid>.json

{
  "session_id": "uuid",
  "created_at": "ISO8601",
  "current_step": 7,
  "status": "in_progress",
  "revision_loop": null,
  "revision_count": { "small": 0, "large": 0 },
  "data": {
    "step_1": { ArticleInput },
    "step_2": { FactExtraction },
    "step_3": { GapAnalysis },
    "step_4": { AngleMapping },
    "step_5": { selected_angle_id },
    "step_6": { TitleOptions, selected_title },
    "step_7": { Draft },
    "step_8": { GroundingResult },
    "step_9": { review_status, editor_notes },
    "step_10": { PublishOutput }
  }
}
```

---

## 6. Revision Loop Mechanics

### LOOP_SMALL (Step 9 → Step 7)

```
Trigger: Editor request minor revision di Step 9
Kondisi: Angle masih valid, hanya perlu tweak draft

Action:
  1. Set session.revision_loop = "SMALL"
  2. Increment session.revision_count.small
  3. Simpan editor_notes dari Step 9
  4. Re-run Step 7 dengan context: angle + title + editor_notes
  5. Re-run Step 8 (grounding check wajib ulang)
  6. Kembali ke Step 9
```

### LOOP_LARGE (Step 9 → Step 4)

```
Trigger: Editor request ganti angle di Step 9
Kondisi: Angle saat ini salah arah atau tidak sesuai

Action:
  1. Set session.revision_loop = "LARGE"
  2. Increment session.revision_count.large
  3. Clear: step_4, step_5, step_6, step_7, step_8, step_9 data
  4. Re-run Step 4 (angle mapping) dengan context baru
  5. Kembali ke Step 5 (editor pilih angle lagi)
```

---

## 7. Error Handling & Retry Strategy

```
Semua AI calls:
  - Max retry: lihat env GEMINI_MAX_RETRY / GROK_MAX_RETRY
  - Backoff: exponential dengan base RETRY_DELAY_BASE detik
  - Jitter: ±10% dari delay untuk menghindari thundering herd

LLM Output Validation:
  - Parse JSON dari response
  - Validasi terhadap schema/ yang relevan
  - Jika invalid → retry dengan prompt yang diperkuat
  - Jika tetap gagal → return error ke frontend, step tidak advance

HTTP Errors dari AI API:
  - 429 (Rate Limit) → retry dengan backoff lebih panjang
  - 500/503 → retry normal
  - 401/403 → fatal error (API key invalid), tidak retry
```

---

## 8. Grounding Constraint (Step 8)

Ini adalah **constraint paling kritis** di seluruh pipeline.

```
Input Step 8:
  - draft.content (string)
  - fact_extraction.facts (list of Fact objects)

Proses:
  1. Ekstrak setiap klaim dari draft
  2. Untuk setiap klaim, cari dukungan di facts
  3. Hitung grounding_score = klaim_didukung / total_klaim

Output:
  - grounding_score: float (0.0 - 1.0)
  - ungrounded_claims: list of string
  - claim_evidence_map: dict[klaim → fact_id]

Decision:
  score >= GROUNDING_THRESHOLD_PASS (0.85) → PASS → lanjut ke Step 9
  score >= GROUNDING_THRESHOLD_WARN (0.70) → WARN → Step 9 dengan warning
  score <  GROUNDING_THRESHOLD_WARN (0.70) → FAIL → otomatis LOOP_SMALL
```

---

## 9. Environment & Configuration

Lihat `.env.example` untuk daftar lengkap variabel.

**Separation of concerns:**

```
Frontend env (prefix VITE_):
  VITE_API_BASE_URL=http://localhost:8000

Backend env (tanpa prefix):
  GEMINI_API_KEY=...
  GROK_API_KEY=...
  GEMINI_MODEL=...
  GROK_MODEL=...
  (semua konfigurasi AI, storage, logging)
```

> ⚠️ API keys **TIDAK PERNAH** dikirim ke frontend. Semua AI calls hanya dari backend.
