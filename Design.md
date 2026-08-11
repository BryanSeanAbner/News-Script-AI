# Design.md — NewsScript AI React UI

Spesifikasi desain lengkap untuk implementasi React dengan **GitHub Light Design System**.

---

## 1. Design Philosophy

NewsScript AI adalah alat kerja seorang editor/jurnalis profesional. Desainnya mengikuti prinsip:

- **Functional First**: UI yang bersih, tidak mengganggu, mirip GitHub/Linear
- **Information Dense**: Editor butuh lihat banyak data sekaligus tanpa scroll berlebihan
- **Editorial Focus**: Teks adalah konten utama — tipografi harus prima
- **Status Clarity**: State pipeline selalu jelas terlihat (step mana, status apa)
- **Zero Surprise**: Setiap aksi punya konfirmasi visual yang jelas

---

## 2. Design Tokens — GitHub Light System

### 2.1 Color Palette

```css
:root {
  /* === Canvas (Background) === */
  --color-canvas-default:      #ffffff;    /* Background utama */
  --color-canvas-subtle:       #f6f8fa;    /* Background secondary, sidebar */
  --color-canvas-inset:        #f0f3f6;    /* Background tertiary, code block */
  --color-canvas-overlay:      #ffffff;    /* Modal, dropdown */

  /* === Foreground (Text) === */
  --color-fg-default:          #1f2328;    /* Teks utama */
  --color-fg-muted:            #656d76;    /* Teks sekunder, placeholder */
  --color-fg-subtle:           #6e7781;    /* Teks tersier, label kecil */
  --color-fg-on-emphasis:      #ffffff;    /* Teks di atas warna emphasis */

  /* === Borders === */
  --color-border-default:      #d0d7de;    /* Border umum */
  --color-border-muted:        #d8dee4;    /* Border tipis */
  --color-border-subtle:       #eaeef2;    /* Border sangat tipis */

  /* === Accent (Blue) === */
  --color-accent-fg:           #0969da;    /* Link, icon aktif */
  --color-accent-muted:        #ddf4ff;    /* Background badge info */
  --color-accent-subtle:       #ddf4ff;    /* Background hover state */
  --color-accent-emphasis:     #0550ae;    /* Button primary, active */

  /* === Success (Green) === */
  --color-success-fg:          #1a7f37;    /* Teks success, PASS grounding */
  --color-success-muted:       #dafbe1;    /* Background badge success */
  --color-success-emphasis:    #2da44e;    /* Button success */

  /* === Attention (Yellow) === */
  --color-attention-fg:        #9a6700;    /* Teks warning, WARN grounding */
  --color-attention-muted:     #fff8c5;    /* Background badge warning */
  --color-attention-emphasis:  #bf8700;    /* Warning emphasis */

  /* === Danger (Red) === */
  --color-danger-fg:           #d1242f;    /* Teks error, FAIL grounding */
  --color-danger-muted:        #ffebe9;    /* Background badge error */
  --color-danger-emphasis:     #cf222e;    /* Button danger */

  /* === Done/Purple === */
  --color-done-fg:             #8250df;    /* Human gate badge */
  --color-done-muted:          #fbefff;    /* Background done badge */

  /* === Shadows === */
  --shadow-sm:    0 1px 0 rgba(31, 35, 40, 0.04);
  --shadow-md:    0 3px 6px rgba(140, 149, 159, 0.15);
  --shadow-lg:    0 8px 24px rgba(140, 149, 159, 0.20);
  --shadow-xl:    0 12px 28px rgba(140, 149, 159, 0.30);
}
```

### 2.2 Typography

```css
:root {
  /* Font Stack */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans",
               Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
               "Liberation Mono", monospace;
  --font-editorial: "Inter", "Noto Serif", Georgia, serif; /* Untuk preview artikel */

  /* Font Sizes */
  --text-xs:   11px;
  --text-sm:   12px;
  --text-base: 14px;   /* Default — GitHub menggunakan 14px */
  --text-md:   16px;
  --text-lg:   18px;
  --text-xl:   20px;
  --text-2xl:  24px;
  --text-3xl:  32px;

  /* Font Weights */
  --font-normal:    400;
  --font-medium:    500;
  --font-semibold:  600;
  --font-bold:      700;

  /* Line Heights */
  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}
```

### 2.3 Spacing

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### 2.4 Border Radius

```css
:root {
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   12px;
  --radius-full: 9999px;  /* Pill/badge */
}
```

---

## 3. Layout System

### 3.1 App Shell

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOPBAR (height: 48px, border-bottom)                                   │
│  [Logo] NewsScript AI          [Sessions] [Help]                        │
├────────────────────┬────────────────────────────────────────────────────┤
│  SIDEBAR           │  MAIN CONTENT AREA                                 │
│  (width: 260px)    │  (flex-grow: 1)                                     │
│                    │                                                    │
│  Pipeline Steps    │  ┌──────────────────────────────────────────────┐  │
│  ─────────────     │  │ PAGE HEADER                                  │  │
│  ○ Step 1  ✓       │  │ Title + subtitle + step badge                │  │
│  ○ Step 2  ✓       │  └──────────────────────────────────────────────┘  │
│  ● Step 3  ←aktif  │                                                    │
│  ○ Step 4          │  ┌──────────────────────────────────────────────┐  │
│  ○ Step 5          │  │ CONTENT AREA                                 │  │
│  ○ Step 6          │  │ (scrollable, max-width: 800px, centered)     │  │
│  ○ Step 7          │  │                                              │  │
│  ○ Step 8          │  │  Step-specific content                       │  │
│  ○ Step 9          │  │                                              │  │
│  ○ Step 10         │  └──────────────────────────────────────────────┘  │
│                    │                                                    │
│  ─────────────     │  ┌──────────────────────────────────────────────┐  │
│  Session Info      │  │ ACTION BAR (sticky bottom)                   │  │
│                    │  │ [Back] ................... [Continue →]       │  │
└────────────────────┴──┴──────────────────────────────────────────────┴──┘
```

### 3.2 Responsive Breakpoints

```css
/* Mobile Portrait */
@media (max-width: 479px) {
  /* Sidebar: hidden (drawer toggle) */
  /* Main: full width */
  /* Topbar: compact, hamburger menu */
}

/* Mobile Landscape / Small Tablet */
@media (min-width: 480px) and (max-width: 767px) {
  /* Sidebar: hidden (drawer), accessible via toggle */
  /* Main: full width */
  /* Content max-width: 100% */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Sidebar: collapsible icon-only mode (60px) */
  /* Main: flex-grow */
  /* Content max-width: 680px */
}

/* Small Desktop / Laptop */
@media (min-width: 1024px) and (max-width: 1279px) {
  /* Sidebar: full (260px) */
  /* Main: flex-grow */
  /* Content max-width: 720px */
}

/* Large Desktop */
@media (min-width: 1280px) {
  /* Sidebar: full (260px) */
  /* Main: flex-grow */
  /* Content max-width: 800px */
}
```

---

## 4. Core Components

### 4.1 Topbar

```
Height: 48px
Background: var(--color-canvas-default)
Border-bottom: 1px solid var(--color-border-default)
Position: sticky top: 0, z-index: 100

Contents:
  Left:  Logo (16x16 icon) + "NewsScript AI" text (semibold, 16px)
  Right: Sessions button + Help icon button

Mobile: Tambahkan hamburger button di left (sebelum logo)
```

### 4.2 Sidebar — Pipeline Progress

```
Width: 260px (desktop), 60px (tablet collapsed), drawer (mobile)
Background: var(--color-canvas-subtle)
Border-right: 1px solid var(--color-border-default)
Padding: 16px

Pipeline Step Item (per step):
  ┌──────────────────────────────────────┐
  │ [●] Step 3 — Gap Analysis            │
  │     ↳ status indicator + label       │
  └──────────────────────────────────────┘

  States:
  - pending:   circle outline, fg-muted text
  - running:   circle with spinner animation, accent text
  - done:      filled green checkmark, fg-default
  - error:     filled red X, danger text
  - waiting:   purple dot, "Menunggu review" label [HUMAN GATE]
  - active:    bold text, accent border-left 2px

  On hover: background var(--color-canvas-inset)
  On click: navigate to that step's page (if accessible)
```

### 4.3 StepCard

```
Background: var(--color-canvas-default)
Border: 1px solid var(--color-border-default)
Border-radius: var(--radius-lg)
Padding: 24px
Box-shadow: var(--shadow-sm)
Margin-bottom: 16px

Header:
  - Step badge (pill): "Step 2 / 10"
  - Title (semibold, 20px)
  - Subtitle (fg-muted, 14px)
  - Status badge (right-aligned): PASS/WARN/FAIL/RUNNING/DONE

Body:
  - Content area (step-specific)

Footer (optional):
  - Timestamp, model used, token count (fg-subtle, 12px)
```

### 4.4 Buttons

```css
/* Primary Button */
.btn-primary {
  background: var(--color-accent-emphasis);
  color: var(--color-fg-on-emphasis);
  border: 1px solid rgba(31, 35, 40, 0.15);
  border-radius: var(--radius-md);
  padding: 5px 16px;
  font-size: 14px;
  font-weight: var(--font-medium);
  height: 32px;
  cursor: pointer;
  transition: background 0.1s ease, box-shadow 0.1s ease;
}
.btn-primary:hover {
  background: #0550ae;
  box-shadow: var(--shadow-sm);
}

/* Secondary Button */
.btn-secondary {
  background: var(--color-canvas-default);
  color: var(--color-fg-default);
  border: 1px solid var(--color-border-default);
  /* same sizing as primary */
}
.btn-secondary:hover {
  background: var(--color-canvas-subtle);
}

/* Danger Button */
.btn-danger {
  background: var(--color-danger-emphasis);
  color: var(--color-fg-on-emphasis);
}

/* Ghost/Icon Button */
.btn-ghost {
  background: transparent;
  border: none;
  color: var(--color-fg-muted);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}
.btn-ghost:hover {
  background: var(--color-canvas-subtle);
  color: var(--color-fg-default);
}
```

### 4.5 Status Badges

```css
/* Pill badges untuk grounding score, step status, dll */

.badge { border-radius: var(--radius-full); font-size: 12px; padding: 2px 8px; font-weight: 500; }

.badge-pass    { background: var(--color-success-muted); color: var(--color-success-fg); }
.badge-warn    { background: var(--color-attention-muted); color: var(--color-attention-fg); }
.badge-fail    { background: var(--color-danger-muted); color: var(--color-danger-fg); }
.badge-info    { background: var(--color-accent-muted); color: var(--color-accent-fg); }
.badge-human   { background: var(--color-done-muted); color: var(--color-done-fg); }
.badge-neutral { background: var(--color-canvas-subtle); color: var(--color-fg-muted); }
.badge-running { background: var(--color-accent-muted); color: var(--color-accent-fg);
                 /* animated pulsing dot */ }
```

### 4.6 Grounding Score Display

```
┌─────────────────────────────────────────┐
│  Grounding Score                        │
│                                         │
│  ████████████████████░░░░  87%         │
│                                         │
│  ● 87 dari 100 klaim grounded           │
│  ⚠ 13 klaim memerlukan perhatian        │
└─────────────────────────────────────────┘

Progress bar:
  - PASS (≥85%): green fill
  - WARN (70-84%): yellow fill
  - FAIL (<70%): red fill
  - Track background: var(--color-border-subtle)
  - Height: 8px, border-radius: full
  - Animated: fill animates from 0 on mount
```

### 4.7 JSON Viewer (Facts/Gaps display)

```
Collapsible tree view untuk menampilkan extracted facts dan gaps.
Background: var(--color-canvas-inset)
Font: var(--font-mono), 12px
Border: 1px solid var(--color-border-muted)
Border-radius: var(--radius-md)

Setiap fact item:
  ┌────────────────────────────────────────┐
  │ fact_001  [who]                        │
  │ Presiden Jokowi mengumumkan kebijakan  │
  │ baru pada 8 Agustus 2025.              │
  │ ─────────────────────────────────────  │
  │ Source: "Presiden Jokowi..."           │
  └────────────────────────────────────────┘
```

---

## 5. Page Specifications (Per Step)

### Page 1 — Editor Input Artikel

```
Layout: Single column, centered, max-width 680px

Components:
  - PageHeader: "Input Artikel Referensi"
  - Form fields:
    ┌─────────────────────────────────────────┐
    │ Judul Artikel *                         │
    │ [________________________________]      │
    │                                         │
    │ Isi Artikel *                           │
    │ [                                ]      │
    │ [    Textarea (min 8 rows)        ]      │
    │ [                                ]      │
    │                        xxx karakter     │
    │                                         │
    │ Sumber Artikel *                        │
    │ [URL ____________________] [+ Tambah]   │
    │ [URL ____________________] [✕]          │
    │                                         │
    │ Metadata (opsional) ▼                   │
    │  Topik: [_______] Tanggal: [__/___/__]  │
    │  Penulis: [_________]                   │
    │  Catatan Editor: [_______________]      │
    │                                         │
    │            [Mulai Analisis →]           │
    └─────────────────────────────────────────┘

Validation: Real-time, tampilkan error di bawah field
```

### Page 2 — Fact Extraction

```
Layout: Two-column (split view, 50/50) — collapse ke single pada tablet

Left column:
  - Artikel asli (scrollable, read-only)
  - Highlight kalimat yang menjadi sumber fakta

Right column:
  - StepCard dengan status RUNNING/DONE
  - List fakta yang diekstrak (JsonViewer)
  - Setiap fakta: badge kategori (who/what/when/where/why/how)
  - Total count: "15 fakta diekstrak"
  - Token usage info (subtle)

Action bar:
  - [Lanjut ke Gap Analysis →] (setelah selesai)
```

### Page 3 — Gap Analysis

```
Layout: Single column, max-width 800px

Components:
  - StepCard dengan status
  - Top 3 Gap highlighted dengan border accent
  - Setiap gap item:
    ┌────────────────────────────────────────┐
    │ #1  gap_001                  [0.92] ●  │
    │ Dampak Kebijakan terhadap UKM          │
    │ Artikel tidak membahas bagaimana       │
    │ kebijakan ini mempengaruhi sektor...   │
    │ Type: [impact_analysis]  [follow_up]   │
    └────────────────────────────────────────┘

  - Gaps di luar top 3: ditampilkan lebih redup
  - [Lanjut ke Angle Mapping →]
```

### Page 4 — Angle Mapping

```
Layout: Single column dengan 3-column grid untuk angle cards (collapse ke 1-col mobile)

Header: "Pemetaan 3 Sudut Berita"

3 Angle Cards (grid):
  ┌─────────────────────────────────────────────────────┐
  │  ANGLE 1      ANGLE 2          ANGLE 3             │
  │ ┌───────┐   ┌───────┐        ┌───────┐             │
  │ │[icon] │   │[icon] │        │[icon] │             │
  │ │Title  │   │Title  │        │Title  │             │
  │ │─────  │   │─────  │        │─────  │             │
  │ │Hook.. │   │Hook.. │        │Hook.. │             │
  │ │       │   │       │        │       │             │
  │ │Target │   │Target │        │Target │             │
  │ │[Pilih]│   │[Pilih]│        │[Pilih]│             │
  │ └───────┘   └───────┘        └───────┘             │
  └─────────────────────────────────────────────────────┘
```

### Page 5 — Pilih Angle `[HUMAN GATE]`

```
Layout: Same as Page 4 tapi dengan focus mode

Purple banner di top:
  "⬡ Human Gate — Pilih satu sudut berita untuk dilanjutkan"

Setiap angle card:
  - Hover state: border accent, background subtle
  - Click: card terpilih (border accent bold, checkmark di corner)
  - Selected state persists sampai klik Konfirmasi

Action bar:
  - [Konfirmasi Pilihan →] (disabled sampai ada pilihan)
```

### Page 6 — Title Generation

```
Layout: Single column, max-width 680px

Title Options list:
  ┌────────────────────────────────────────────┐
  │ ○ title_001  [question]  [SEO: 0.88]       │
  │   "Mengapa Kebijakan Baru Ini Bisa..."     │
  │                                            │
  │ ○ title_002  [statement]  [SEO: 0.85]      │
  │   "Pemerintah Umumkan Kebijakan..."        │
  └────────────────────────────────────────────┘

  Custom title input (opsional):
  [___________________________] [Gunakan Custom →]

Action: [Konfirmasi Judul →]
```

### Page 7 — Draft Generation

```
Layout: Full width dengan split view (tablet+)

Left: Progress indicator (streaming effect — animated typing dots)
  Status card:
  ┌─────────────────────────────────────────┐
  │  ◉ Grok-3 sedang menulis draft...       │
  │  ────────────────────────────────       │
  │  Menggunakan 15 fakta terverifikasi     │
  │  Angle: "Dampak terhadap UKM"           │
  │  Judul: "Mengapa Kebijakan..."          │
  └─────────────────────────────────────────┘

Right (setelah selesai): Draft preview (artikel typography)
  - Font: var(--font-editorial), 16px, leading-relaxed
  - Background: white
  - Padding: 32px
```

### Page 8 — Grounding Check

```
Layout: Two-column (70/30)

Left (70%): Draft dengan highlight
  - Klaim grounded: highlight hijau transparan
  - Klaim ungrounded: highlight merah transparan + underline
  - Hover klaim: tooltip "Didukung oleh: fact_001, fact_003"

Right (30%): Grounding Report
  - Score meter (animated progress bar)
  - Badge PASS/WARN/FAIL
  - Daftar ungrounded claims
  - Rekomendasi LLM

Action bar:
  - PASS/WARN: [Lanjut ke Review Editorial →]
  - FAIL: [Otomatis melakukan Revisi Draft...] (auto-trigger LOOP_SMALL)
```

### Page 9 — Human Editorial Review `[HUMAN GATE]`

```
Layout: Three-column pada desktop, single pada mobile

Left (60%): Artikel final untuk dibaca
  - Clean reading view, font editorial
  - Tampilkan grounding score di header

Middle (25%): Panel Review
  ┌──────────────────────────────────┐
  │ ⬡ HUMAN GATE — Review Editorial │
  │ ─────────────────────────────── │
  │ Catatan Editor:                  │
  │ [________________________]       │
  │ [________________________]       │
  │                                  │
  │ [✓ Approve & Publish]           │
  │ [↩ Revisi Minor (Step 7)]       │
  │ [⟳ Ganti Angle (Step 4)]        │
  └──────────────────────────────────┘

Right (15%): Pipeline Summary
  - Facts used: X
  - Grounding: X%
  - Revisi kecil: X kali
  - Revisi besar: X kali
```

### Page 10 — Publish

```
Layout: Centered, max-width 600px

Success state:
  ┌─────────────────────────────────────────────┐
  │                                             │
  │          ✓                                  │
  │    Artikel Berhasil Dipublish               │
  │                                             │
  │  "Judul Artikel Yang Dipublish"             │
  │                                             │
  │  Pipeline Summary:                          │
  │  15 fakta • Grounding 92% • 0 revisi        │
  │                                             │
  │  [Lihat Artikel] [Buat Artikel Baru]        │
  │                                             │
  └─────────────────────────────────────────────┘
```

---

## 6. Micro-animations & Transitions

```css
/* Step transitions */
.page-enter { opacity: 0; transform: translateY(8px); }
.page-enter-active { opacity: 1; transform: translateY(0);
                     transition: all 150ms ease-out; }

/* Loading spinner for AI steps */
@keyframes spin { to { transform: rotate(360deg); } }
.spinner { animation: spin 0.8s linear infinite; }

/* Grounding score bar */
.score-bar-fill { transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1); }

/* Fact highlight pulse */
@keyframes pulse-highlight {
  0%, 100% { background-color: rgba(26, 127, 55, 0.1); }
  50%       { background-color: rgba(26, 127, 55, 0.2); }
}

/* Button click feedback */
.btn:active { transform: scale(0.97); transition: transform 60ms ease; }

/* Badge appear */
.badge { animation: fadeIn 200ms ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

/* Sidebar step status change */
.step-item { transition: background 150ms ease, border-color 150ms ease; }
```

---

## 7. Accessibility Requirements

```
Keyboard navigation:
  - Semua interactive element accessible via Tab
  - Focus state: outline 2px solid var(--color-accent-fg) dengan offset 2px
  - Shortcut: Ctrl+Enter untuk submit form utama

Screen reader:
  - Setiap step harus punya aria-label yang deskriptif
  - Status badge harus punya aria-live="polite" untuk perubahan
  - Loading state: aria-busy="true" pada container

Color contrast:
  - Semua teks minimal WCAG AA (4.5:1 untuk teks normal, 3:1 untuk teks besar)
  - Jangan gunakan warna sebagai satu-satunya indikator status

Form:
  - Setiap input harus punya label (bukan hanya placeholder)
  - Error message dihubungkan via aria-describedby
```

---

## 8. File Structure Frontend

```
frontend/src/
├── styles/
│   ├── tokens.css          ← Semua CSS custom properties (design tokens)
│   ├── reset.css           ← CSS reset/normalize
│   ├── base.css            ← Base element styles (body, h1-h6, p, a)
│   ├── layout.css          ← App shell, sidebar, topbar, main layout
│   ├── components/
│   │   ├── button.css
│   │   ├── badge.css
│   │   ├── card.css
│   │   ├── form.css
│   │   ├── sidebar.css
│   │   ├── topbar.css
│   │   ├── grounding.css
│   │   ├── json-viewer.css
│   │   └── modal.css
│   └── pages/
│       ├── step-1.css
│       ├── step-7.css      ← Draft view (typography)
│       ├── step-8.css      ← Grounding highlight
│       └── step-9.css      ← Review layout
└── index.css               ← Entry, import all CSS files
```
