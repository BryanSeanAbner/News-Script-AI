# CLAUDE.md — NewsScript AI v2.0

> Panduan konteks untuk AI coding assistant (Claude, Gemini, Copilot, dll).
> Versi: 2.0 (Google News 2026 SEO Formula & Mode Cepat 3-Slide)

---

## 📌 Project Overview

**NewsScript AI v2.0** adalah platform jurnalisme berbantuan AI yang mengubah transkrip wawancara, kutipan narasumber, atau siaran pers langsung menjadi naskah berita 5W+1H berformula **SEO Google 2026**.

**Fitur Utama:**
- **Rumus Jumlah Kata SEO Google 2026**: Target 350–500 kata (sweet spot ±400 kata), Lead 5W1H (40–50 kata), 3 Sub-judul H2 (Kronologi, Konteks & Bukti, Tanggapan Pejabat/Sanksi), 2 kutipan langsung narsum, penutup 30 kata, dan kaidah keterbacaan mobile (maksimal 3 kalimat per paragraf).
- **Alur Cepat 3-Slide**:
  - **Slide 1**: Input Kutipan / Wawancara Narsum
  - **Slide 2**: Pratinjau 5W+1H, Sudut Pandang (Angle) & Pilihan Judul SEO
  - **Slide 3**: Naskah Berita 5W+1H Jadi + Editorial Review Terintegrasi (inline edit) + Kalkulator Kata SEO Realtime
- **Kalkulator Kata & Skor SEO 2026**: Widget live yang menganalisis panjang kata, kerapatan kalimat mobile, dan skor SEO 0–100%.

---

## 🗂️ Struktur Direktori

```
news-script-ai/
├── CLAUDE.md                  ← Panduan project ini
├── package.json               ← Root scripts (dev, build, preview)
├── vercel.json                ← Konfigurasi Vercel deployment
├── .env.example               ← Template environment variables
│
├── api/                       ← Stateless Serverless Functions (Python)
│   ├── quick-news.py          ← Endpoint /api/quick-news (3-Slide generator)
│   ├── draft.py               ← Endpoint /api/draft (Google 2026 SEO formula)
│   ├── health.py              ← Endpoint /api/health
│   └── requirements.txt       ← Python dependencies
│
└── frontend/                  ← React 18 App (Vite)
    ├── src/
    │   ├── components/
    │   │   ├── WordCalculatorSEO.jsx ← Widget Kalkulator Kata & Skor SEO
    │   │   ├── Layout.jsx            ← App Shell
    │   │   ├── Sidebar.jsx           ← Navigasi utama
    │   │   └── UI.jsx                ← Reusable UI atoms
    │   ├── pages/
    │   │   ├── DashboardPage.jsx     ← Dashboard & Riwayat Naskah
    │   │   ├── QuickNewsPage.jsx     ← Halaman Alur 3-Slide
    │   │   ├── ArticleDetailPage.jsx ← Halaman Detail Naskah
    │   │   └── SessionsPage.jsx      ← Riwayat Session
    │   ├── stores/
    │   │   └── sessionStore.js       ← Zustand state store (client-side persist)
    │   ├── services/
    │   │   └── api.js                ← API client
    │   ├── styles/                   ← Vanilla CSS (GitHub Light Design System)
    │   └── App.jsx                   ← Routing
    └── package.json
```

---

## ⚙️ Tech Stack & AI Provider

### Frontend
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **State**: Zustand (localStorage persist)
- **Styling**: Vanilla CSS (GitHub Light Design System)

### Backend / Serverless
- **Runtime**: Python 3.9+ Vercel Serverless Functions
- **AI Multi-Provider Fallback**:
  - Primary: **Groq Cloud (Llama 3.3 70B)**
  - Secondary: **Google Gemini 2.0 Flash**
  - Fallback: **OpenRouter (Llama 3.3 70B)**

---

## 📏 Aturan Rumus SEO Google 2026

1. **Jumlah Kata**: 350–500 kata (ZONA AMAN PALING SEO).
2. **Struktur Wajib**:
   - Paragraf 1 (Lead 5W1H): 40–50 kata.
   - H2 #1 (Kronologi): 100–120 kata + kutipan #1.
   - H2 #2 (Konteks & Bukti): 100–120 kata.
   - H2 #3 (Tanggapan Pejabat & Hukuman): 80–100 kata + kutipan #2.
   - Penutup: ±30 kata dasar hukum/update.
3. **Mobile Friendly**: Maksimal 3 kalimat per paragraf.
