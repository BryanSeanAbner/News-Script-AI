# NewsScript AI 📰🤖

Aplikasi Pembuatan Naskah Berita Berbasis Agentic AI (Gemini 1.5 Flash) dengan tampilan **GitHub Light Design System**.

---

## 🌟 Fitur Utama

1. **Paste Teks Berita**: Cukup copy-paste teks berita dari media online manapun.
2. **Agentic AI Multi-Step Reasoning**:
   - **Step 1: Ekstraksi Fakta Kunci (5W+1H)** & Deteksi Bahasa Otomatis.
   - **Step 2: Analisis Sentimen & Tone** (Positif, Negatif, Netral, Emosi Dominan).
   - **Step 3: Scoring & Rekomendasi Angle (Top 3)** dengan kriteria Viral, Emosi, Relevansi, dan Novelty.
   - **Step 4: Naskah Multi-Platform** (TV/Radio, Artikel Online, Instagram Caption, TikTok Script, YouTube Shorts Script).
3. **Regenerate dengan Angle Pilihan**: Pilih angle favorit dari Top 3 untuk menyesuaikan fokus naskah secara instan.
4. **Kolaborasi Tim Redaksi**:
   - Multi-user dengan Role-Based Access Control (Admin, Editor, Reporter).
   - Shared Workspace (Semua naskah tim tersimpan dan dapat diakses bersama).
5. **Export Naskah**: Download ke format `.txt` atau `.docx` (Microsoft Word) secara langsung.
6. **Desain GitHub Light**: Antarmuka bersih, cepat, presisi tinggi bergaya GitHub Primer design system.

---

## 🚀 Panduan Memulai (Cara Menjalankan)

### 1. Dapatkan Gemini API Key Gratis
1. Buka [Google AI Studio](https://aistudio.google.com/).
2. Login menggunakan akun Google Anda.
3. Klik **Get API key** → **Create API key**.
4. Salin API key tersebut.

### 2. Konfigurasi Environment File
1. Buka file `backend/.env`.
2. Masukkan API key Anda pada baris `GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY=AIzaSy...
   SECRET_KEY=super_secret_jwt_key_12345
   DATABASE_URL=sqlite:///./newsscript.db
   ALLOWED_ORIGINS=http://localhost:3000
   ```

### 3. Menjalankan Aplikasi di Windows

#### Menjalankan Backend (Python FastAPI)
Klik dua kali pada file `start-backend.bat` ATAU jalankan perintah berikut di PowerShell/Command Prompt:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend akan berjalan di **`http://localhost:8000`** (Dokumentasi API di `http://localhost:8000/docs`).

#### Menjalankan Frontend (Next.js)
Klik dua kali pada file `start-frontend.bat` ATAU jalankan perintah berikut di jendela terminal kedua:
```bash
cd frontend
npm run dev
```
Frontend akan berjalan di **`http://localhost:3000`**.

---

## 🔑 Penyiapan Akun Pertama Kali (First Admin Setup)

1. Buka browser dan akses **`http://localhost:3000`**.
2. Anda akan diarahkan ke halaman Login. Klik **"Setup admin pertama"** atau langsung buka **`http://localhost:3000/setup`**.
3. Buat akun Admin pertama (Username, Email, Password).
4. Setelah terdaftar, login menggunakan akun tersebut.
5. Anda dapat mengundang/menambahkan anggota tim redaksi lainnya (Editor/Reporter) melalui menu **Anggota Tim**.

---

## 🛠️ Stack Teknologi

- **Frontend**: Next.js 14 / 16 (App Router), TypeScript, Tailwind CSS, GitHub Primer Light System, Lucide Icons.
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, SQLite, python-jose (JWT), python-docx.
- **AI Agent**: Google Gemini Flash (`google-generativeai` SDK).
- **Deployment**: Vercel (Next.js + Python Serverless).
