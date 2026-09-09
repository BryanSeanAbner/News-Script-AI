/**
 * API Client — Stateless serverless backend
 * Semua endpoint menerima data lengkap di request body
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
  // ══════════════════════════════════════════════════════════════════
  // Health Check
  // ══════════════════════════════════════════════════════════════════

  healthCheck: () => request('/health'),

  // ══════════════════════════════════════════════════════════════════
  // Draft Generation (Google News 2026 SEO Formula)
  // ══════════════════════════════════════════════════════════════════

  generateDraft: async (angleTitle, articleTitle, facts) => {
    const response = await request('/draft', {
      method: 'POST',
      body: JSON.stringify({
        angle_title: angleTitle,
        article_title: articleTitle,
        facts,
      }),
    });
    return response.data || response;
  },

  // ══════════════════════════════════════════════════════════════════
  // QUICK NEWS (3-Slide Interview to 5W+1H Google 2026 SEO News)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Analisis wawancara/kutipan narsum: ekstrak 5W+1H, judul SEO, quotes
   */
  analyzeInterview: async (payload) => {
    const response = await request('/quick-news', {
      method: 'POST',
      body: JSON.stringify({
        action: 'analyze',
        ...payload,
      }),
    });
    return response.data || response;
  },

  /**
   * Generate naskah berita 5W+1H berformula 350-500 kata Google 2026
   */
  generateQuickNews: async (payload) => {
    const response = await request('/quick-news', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generate',
        ...payload,
      }),
    });
    return response.data || response;
  },
};

