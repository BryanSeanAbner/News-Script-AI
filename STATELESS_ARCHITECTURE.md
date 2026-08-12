# Stateless Pipeline Architecture

## Overview

Pipeline 8-step ini sekarang **fully stateless** — backend tidak menyimpan session apapun, semua state disimpan di **client-side** (React Zustand + localStorage).

## Perubahan Arsitektur

### **SEBELUM (Stateful)**
```
Frontend → POST /sessions → Backend simpan di session_store.py
Frontend → GET /sessions/{id} → Backend return dari database
Backend menyimpan state session di server
```

### **SESUDAH (Stateless)**
```
Frontend → Generate UUID → Simpan di localStorage
Frontend → POST /api/ai/extract-facts {article_text} → Backend return {facts}
Frontend → Simpan hasil di sessionStore (Zustand + localStorage)
Backend TIDAK tahu tentang "session" — hanya terima input, return output
```

---

## Pipeline Flow (8 Steps)

### **Step 1: Input Artikel (User)**
- **Frontend**: User submit artikel (title, body, topic)
- **State**: Disimpan di `currentSession.data.step_1` (localStorage)
- **Backend**: Tidak ada endpoint (pure client-side)

### **Step 2: Fact Extraction (AI)**
- **Frontend**: Kirim `{article_text}` ke `/api/ai/extract-facts`
- **Backend**: Return `{facts: Array, total_facts: number}`
- **State**: Disimpan di `currentSession.data.step_2`

### **Step 3: Gap Analysis & Angle Mapping (AI)**
- **Frontend**: Kirim `{article_text, facts}` ke `/api/ai/gap-analysis`
- **Backend**: Return `{gaps: Array, angles: Array}`
- **State**: Disimpan di `currentSession.data.step_3`

### **Step 4: Pilih Angle & Generate Titles (User + AI)**
- **Frontend (User)**: User pilih angle dari 3 opsi
- **Frontend (AI)**: Kirim `{angle_title, angle_hook, facts}` ke `/api/ai/generate-titles`
- **Backend**: Return `{titles: Array}`
- **State**: Disimpan di `currentSession.data.step_4`

### **Step 5: Pilih Judul (User)**
- **Frontend**: User pilih judul atau custom title
- **State**: Update `currentSession.data.step_4.selected_title`
- **Backend**: Tidak ada endpoint (pure client-side)

### **Step 6: Draft Generation (AI)**
- **Frontend**: Kirim `{angle_title, article_title, facts}` ke `/api/ai/generate-draft`
- **Backend**: Return `{content: string, paragraphs: Array, word_count: number}`
- **State**: Disimpan di `currentSession.data.step_5`

### **Step 7: Grounding Check (AI)**
- **Frontend**: Kirim `{draft_content, facts}` ke `/api/ai/grounding-check`
- **Backend**: Return `{grounding_score: number, status: string}`
- **State**: Disimpan di `currentSession.data.step_6`

### **Step 8: Editorial Review & Publish (User)**
- **Frontend**: User approve/reject/revise
- **State**: Disimpan di `currentSession.data.step_7` dan `step_8`
- **Backend**: Tidak ada endpoint (pure client-side)

---

## File Changes

### **Frontend**

#### **1. `frontend/src/stores/sessionStore.js`** ✅ REWRITTEN
- **DIHAPUS**: `createSession()`, `loadSession()` yang manggil API
- **DITAMBAH**: 
  - Generate UUID di client dengan `generateId()`
  - `persist` middleware untuk simpan ke localStorage
  - Method per-step: `runStep2()`, `runStep3()`, `runStep5()`, `runStep6()`
  - Semua state update langsung di client, tidak hit backend

#### **2. `frontend/src/services/api.js`** ✅ REWRITTEN
- **DIHAPUS**: Semua endpoint session (`/sessions`, `/sessions/{id}`, dll)
- **DITAMBAH**: Stateless AI endpoints:
  - `POST /api/ai/extract-facts`
  - `POST /api/ai/gap-analysis`
  - `POST /api/ai/generate-titles`
  - `POST /api/ai/generate-draft`
  - `POST /api/ai/grounding-check`

#### **3. Frontend Pages** (TIDAK PERLU DIUBAH)
- `DashboardPage.jsx`, `Step1Page.jsx`, `AIStepPage.jsx`, dll sudah menggunakan `sessionStore`
- Karena interface sessionStore tetap sama, pages tidak perlu diubah

### **Backend**

#### **4. `api/ai_generate.py`** ✅ REWRITTEN
- **DIHAPUS**: Session tracking, `session_store.py` dependency
- **DITAMBAH**: 
  - 5 fungsi stateless: `extract_facts()`, `generate_gap_analysis()`, `generate_titles()`, `generate_draft()`, `check_grounding()`
  - Multi-provider fallback (Groq → Gemini → OpenRouter)
  - CORS headers untuk cross-origin requests

#### **5. `api/requirements.txt`** ✅ CREATED
- Minimal dependencies: `groq`, `google-generativeai`, `openai`
- Tidak perlu FastAPI, Pydantic, atau session storage libraries

#### **6. `backend/` folder** (DEPRECATED)
- File `backend/routers/pipeline.py`, `backend/storage/session_store.py` tidak dipakai lagi
- Bisa dihapus atau diabaikan untuk deployment Vercel

---

## Data Flow Example

### **Scenario: User submit artikel baru**

```javascript
// 1. User klik "Buat Naskah Baru"
const session = useSessionStore.createSession();
// → Generates: {session_id: "session_1234_abc", status: "draft", data: {}}

// 2. User submit artikel
await useSessionStore.submitArticle({
  title: "Judul Artikel",
  body: "Isi artikel...",
  topic: "Politik"
});
// → Saved to: currentSession.data.step_1 (localStorage)

// 3. Frontend auto-run Step 2 (Fact Extraction)
await useSessionStore.runStep(2);
// → API: POST /api/ai/extract-facts {article_text: "..."}
// → Response: {facts: [...], total_facts: 5}
// → Saved to: currentSession.data.step_2

// 4. Frontend auto-run Step 3 (Gap Analysis)
await useSessionStore.runStep(3);
// → API: POST /api/ai/gap-analysis {article_text: "...", facts: [...]}
// → Response: {gaps: [...], angles: [...]}
// → Saved to: currentSession.data.step_3

// 5. User pilih angle
await useSessionStore.selectAngleAndGenerateTitle("angle_1");
// → API: POST /api/ai/generate-titles {angle_title: "...", ...}
// → Response: {titles: [...]}
// → Saved to: currentSession.data.step_4

// ... dst sampai step 8
```

---

## LocalStorage Structure

```javascript
// localStorage key: "news-script-sessions"
{
  "state": {
    "sessions": [
      {
        "session_id": "session_1234_abc",
        "status": "draft",
        "created_at": "2025-01-10T10:00:00Z",
        "updated_at": "2025-01-10T10:30:00Z",
        "current_step": 5,
        "step_statuses": {
          "step_1": "done",
          "step_2": "done",
          "step_3": "done",
          "step_4": "done",
          "step_5": "running",
          // ...
        },
        "data": {
          "step_1": {
            "title": "Judul Artikel",
            "body": "Isi artikel...",
            "topic": "Politik"
          },
          "step_2": {
            "facts": [...],
            "total_facts": 5
          },
          // ... step_3 sampai step_8
        }
      }
    ],
    "currentSession": {/* session yang sedang aktif */}
  },
  "version": 0
}
```

---

## Deployment

### **Vercel Deployment**

1. **Frontend**:
   ```bash
   cd frontend
   npm run build
   # Deploy dist/ ke Vercel
   ```

2. **Backend** (Serverless Functions):
   ```bash
   # Vercel otomatis detect /api/*.py sebagai serverless functions
   # Pastikan api/requirements.txt ada
   vercel deploy
   ```

3. **Environment Variables** (Vercel Dashboard):
   ```
   GROK_API_KEY=gsk_xxx
   GEMINI_API_KEY=AIza_xxx
   OPENROUTER_API_KEY=sk-or-v1-xxx
   ```

### **Local Development**

```bash
# Frontend
cd frontend
npm run dev
# → http://localhost:5173

# Backend (simulasi serverless)
cd api
python -m http.server 8000
# → http://localhost:8000/api/health
```

---

## Benefits of Stateless Architecture

✅ **No Database Needed** — Perfect untuk serverless (Vercel, Netlify, Cloudflare)  
✅ **Scalable** — Setiap request independen, tidak ada session lock  
✅ **Demo-Ready** — Data disimpan di localStorage, bisa export/import  
✅ **Cost-Effective** — Tidak perlu Redis/MongoDB untuk session storage  
✅ **Offline-Capable** — Data tetap ada walau server mati (localStorage persist)  

---

## Migration Notes

Jika ada data lama di backend session_store.py, bisa di-export manual:
```python
# Script export (one-time)
import json
from backend.storage.session_store import SessionStore

store = SessionStore()
sessions = store.list_sessions()
with open('sessions_export.json', 'w') as f:
    json.dump(sessions, f)
```

Lalu import di frontend localStorage:
```javascript
// Import script (one-time)
const oldSessions = await fetch('/sessions_export.json').then(r => r.json());
localStorage.setItem('news-script-sessions', JSON.stringify({
  state: { sessions: oldSessions },
  version: 0
}));
```

---

## Testing Checklist

- [ ] Step 1: Submit artikel → Saved to localStorage
- [ ] Step 2: Fact extraction → API `/api/ai/extract-facts` works
- [ ] Step 3: Gap analysis → API `/api/ai/gap-analysis` works
- [ ] Step 4: Angle selection + titles → API `/api/ai/generate-titles` works
- [ ] Step 5: Title selection → Saved to localStorage
- [ ] Step 6: Draft generation → API `/api/ai/generate-draft` works
- [ ] Step 7: Grounding check → API `/api/ai/grounding-check` works
- [ ] Step 8: Editorial review + publish → Saved to localStorage
- [ ] Dashboard: List sessions from localStorage
- [ ] Refresh browser: Data persist
- [ ] Delete session: Removed from localStorage

---

## Troubleshooting

### **Frontend tidak bisa connect ke backend**
- Check `VITE_API_BASE_URL` di `.env.local`
- Default: `https://news-script-ai.vercel.app/api`
- Local dev: `http://localhost:8000/api`

### **Backend return "Module not found"**
- Pastikan `api/requirements.txt` sudah di-deploy
- Vercel Build Logs akan show install progress

### **LocalStorage penuh**
- Limit: ~5-10 MB per domain
- Hapus session lama dari Dashboard
- Atau export ke JSON file lalu clear localStorage

---

## Future Enhancements

1. **Export to JSON** — Button untuk download session sebagai file
2. **Import from JSON** — Upload session dari file backup
3. **Sync to Cloud** (Optional) — Firebase/Supabase untuk multi-device sync
4. **Share Session Link** — Generate shareable URL dengan session data di query param (compressed)

---

Dengan arsitektur stateless ini, pipeline 8-step tetap utuh dan berfungsi penuh, tapi 100% serverless-ready tanpa database!
