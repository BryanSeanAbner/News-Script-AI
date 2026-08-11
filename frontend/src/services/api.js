/**
 * API Client — komunikasi dengan FastAPI backend (8-step pipeline)
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch (err) {
    throw new Error(`Tidak dapat terhubung ke Backend Server (${BASE_URL}). Pastikan server backend FastAPI sedang berjalan.`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  // Handle 204 No Content (DELETE operations) — no body to parse
  if (res.status === 204) {
    return null;
  }

  return res.json();
}

export const api = {
  // Session management
  createSession: () => request('/api/sessions', { method: 'POST' }),
  getSession: (id) => request(`/api/sessions/${id}`),
  listSessions: () => request('/api/sessions'),
  deleteSession: (id) => request(`/api/sessions/${id}`, { method: 'DELETE' }),

  // Step 1 — Submit artikel referensi
  submitArticle: (id, articleData) =>
    request(`/api/sessions/${id}/steps/1/submit`, {
      method: 'POST', body: JSON.stringify(articleData),
    }),

  // AI Steps (2, 3, 5, 6)
  runStep: (id, step) =>
    request(`/api/sessions/${id}/steps/${step}/run`, { method: 'POST' }),

  // Step 4 — Pilih angle + generate title recommendations
  selectAngleAndGenerateTitle: (id, angleId) =>
    request(`/api/sessions/${id}/steps/4/select-and-generate-title`, {
      method: 'POST', body: JSON.stringify({ selected_angle_id: angleId }),
    }),

  // Step 4 — Konfirmasi judul
  selectTitle: (id, titleId, customTitle) =>
    request(`/api/sessions/${id}/steps/4/select-title`, {
      method: 'POST', body: JSON.stringify({ selected_title_id: titleId, custom_title: customTitle }),
    }),

  // Step 7 — Editorial review
  submitReview: (id, reviewStatus, editorNotes, editedContent = null) =>
    request(`/api/sessions/${id}/steps/7/review`, {
      method: 'POST', body: JSON.stringify({ 
        review_status: reviewStatus, 
        editor_notes: editorNotes,
        edited_content: editedContent 
      }),
    }),

  // Step 8 — Publish
  publishArticle: (id) =>
    request(`/api/sessions/${id}/steps/8/publish`, { method: 'POST' }),

  // Health check
  healthCheck: () => request('/api/health'),
};
