# Frontend Update Required

## Issue
Backend pipeline telah diperbaiki dengan Step 4 yang proper, tetapi frontend masih menggunakan flow lama. Frontend perlu diupdate untuk match dengan backend yang baru.

## Backend Changes (Already Fixed)
- Step 4: Angle Selection (User Input) - **NEW**
- Step 5: Title Generation (AI) - dipindah dari Step 6
- Step 6: Title Selection (User Input) - dipindah dari Step 4
- Step 7: Draft Article (AI)
- Step 8: Grounding Check (AI)

## Frontend Files Yang Perlu Diupdate

### 1. `AIStepPage.jsx`
**Current Issues:**
- STEP_CONFIG hanya define step 2, 3, 7, 8
- Tidak ada config untuk step 5 (Title Generation)
- Navigation setelah step 3 langsung ke step 4 (harusnya ke angle selection page)

**Required Changes:**
```javascript
const STEP_CONFIG = {
  2: { ... },
  3: { 
    nextStep: 4,  // Go to angle selection
    nextLabel: 'Pilih Angle →',
  },
  5: {  // NEW - Title Generation
    title: 'Title Generation',
    subtitle: 'AI generates title recommendations',
    model: 'Groq (Llama 3.3 70B)',
    nextStep: 6,
    nextLabel: 'Pilih Judul →',
  },
  7: { ... },
  8: { 
    nextStep: null,
    nextLabel: 'Review & Publish →',
  },
};
```

### 2. `Step5Page.jsx` (Angle & Title Selection)
**Current Issues:**
- Menggabungkan angle selection dan title selection dalam 1 page
- Endpoint masih menggunakan `/steps/4/select-and-generate-title`

**Required Changes:**
- Split menjadi 2 pages terpisah:
  - `Step4Page.jsx` - Angle Selection only
  - `Step6Page.jsx` - Title Selection only
- Update endpoints:
  - Angle selection: `POST /steps/4/select-angle`
  - Title generation: `POST /steps/5/run` (AI, automatic)
  - Title selection: `POST /steps/6/select-title`

### 3. Router Configuration (`App.jsx` atau router file)
**Required Changes:**
```javascript
<Route path="/session/:id/step/4" element={<Step4Page />} /> // Angle Selection
<Route path="/session/:id/step/5" element={<AIStepPage />} /> // Title Generation (AI)
<Route path="/session/:id/step/6" element={<Step6Page />} /> // Title Selection
```

### 4. `sessionStore.js`
**Required Changes:**
- Update `runStep()` untuk handle step 5 dan 7 dengan benar
- Update endpoint mapping sesuai backend baru:
  - Step 2, 3, 7, 8: `POST /{session_id}/steps/{step}/run`
  - Step 5: `POST /{session_id}/steps/5/run`

## Recommended Approach

### Option A: Quick Fix (Recommended)
1. Rename `Step5Page.jsx` → `Step4Page.jsx` (angle selection only)
2. Create new `Step5Page.jsx` (redirect ke AIStepPage for title generation)
3. Create new `Step6Page.jsx` (title selection only, copy from old Step5Page)
4. Update STEP_CONFIG in AIStepPage.jsx
5. Update router and sessionStore

### Option B: Proper Refactor
1. Create separate pages: `AngleSelectionPage.jsx` dan `TitleSelectionPage.jsx`
2. Update all navigation logic
3. Update sessionStore API calls
4. Test full flow

## Testing Checklist After Update
- [ ] Step 3 → Navigate to Step 4 (Angle Selection)
- [ ] Step 4 → Select angle → Auto run Step 5 (Title Generation AI)
- [ ] Step 5 → Navigate to Step 6 (Title Selection)
- [ ] Step 6 → Select title → Navigate to Step 7
- [ ] Step 7 → Draft generated → Navigate to Step 8
- [ ] Step 8 → Grounding check → Navigate to review/publish
- [ ] All badges and progress indicators show correct step numbers

## API Endpoint Reference (Backend)

```
POST /{session_id}/steps/1/submit          # Step 1: Input Artikel
POST /{session_id}/steps/2/run             # Step 2: Fact Extraction (AI)
POST /{session_id}/steps/3/run             # Step 3: Gap Analysis (AI)
POST /{session_id}/steps/4/select-angle    # Step 4: Angle Selection (User)
POST /{session_id}/steps/5/run             # Step 5: Title Generation (AI)
POST /{session_id}/steps/6/select-title    # Step 6: Title Selection (User)
POST /{session_id}/steps/7/run             # Step 7: Draft Article (AI)
POST /{session_id}/steps/8/run             # Step 8: Grounding Check (AI)
POST /{session_id}/editorial-review        # Editorial Review
POST /{session_id}/publish                 # Publish
```

## Notes
- Frontend masih dalam kondisi **NOT UPDATED**
- Backend sudah fix dan ready to use
- Setelah frontend diupdate, test end-to-end flow untuk memastikan tidak ada step yang diskip
