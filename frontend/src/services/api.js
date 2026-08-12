/**
 * API Client — komunikasi dengan Vercel Serverless Backend
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://news-script-ai.vercel.app/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch (err) {
    throw new Error(`Tidak dapat terhubung ke Backend Serverless. Error: ${err.message}`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Health check
  healthCheck: () => request('/health'),

  // ── Session Management ──────────────────────────────────────────
  
  /** Create new session */
  createSession: () =>
    request('/sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /** Get session by ID */
  getSession: (sessionId) =>
    request(`/sessions/${sessionId}`),

  /** List all sessions */
  listSessions: () =>
    request('/sessions'),

  /** Delete session */
  deleteSession: (sessionId) =>
    request(`/sessions/${sessionId}`, {
      method: 'DELETE',
    }),

  // ── Pipeline Steps ──────────────────────────────────────────────

  /** Step 1: Submit article */
  submitArticle: (sessionId, articleData) =>
    request(`/pipeline/${sessionId}/step/1`, {
      method: 'POST',
      body: JSON.stringify(articleData),
    }),

  /** Steps 2, 3, 5, 6: Run AI step */
  runStep: (sessionId, stepNumber) =>
    request(`/pipeline/${sessionId}/step/${stepNumber}`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /** Step 4: Select angle and generate titles (Groq) */
  selectAngleAndGenerateTitle: (sessionId, angleId) =>
    request(`/pipeline/${sessionId}/step/4/select-angle`, {
      method: 'POST',
      body: JSON.stringify({ angle_id: angleId }),
    }),

  /** Step 4: Confirm title selection */
  selectTitle: (sessionId, titleId, customTitle) =>
    request(`/pipeline/${sessionId}/step/4/select-title`, {
      method: 'POST',
      body: JSON.stringify({ 
        title_id: titleId, 
        custom_title: customTitle 
      }),
    }),

  /** Step 7: Editorial review */
  submitReview: (sessionId, reviewStatus, editorNotes, editedContent) =>
    request(`/pipeline/${sessionId}/step/7`, {
      method: 'POST',
      body: JSON.stringify({
        review_status: reviewStatus,
        editor_notes: editorNotes,
        edited_content: editedContent,
      }),
    }),

  /** Step 8: Publish article */
  publishArticle: (sessionId) =>
    request(`/pipeline/${sessionId}/step/8`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  // ── Legacy AI Endpoints (Serverless Functions) ──────────────────
  
  extractFacts: (articleText) =>
    request('/facts', {
      method: 'POST',
      body: JSON.stringify({ article_text: articleText }),
    }),

  generateGapAnalysis: (articleText, facts) =>
    request('/gap-analysis', {
      method: 'POST',
      body: JSON.stringify({ article_text: articleText, facts }),
    }),

  generateDraft: (angleDescription, articleTitle, facts) =>
    request('/draft', {
      method: 'POST',
      body: JSON.stringify({
        angle_description: angleDescription,
        article_title: articleTitle,
        facts,
      }),
    }),
};

