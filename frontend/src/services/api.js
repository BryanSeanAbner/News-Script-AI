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
  // STEP 2: Fact Extraction (AI)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Extract facts dari artikel
   * @param {string} articleText - Isi artikel lengkap
   * @returns {Promise<{facts: Array, total_facts: number}>}
   */
  extractFacts: async (articleText) => {
    const response = await request('/facts', {
      method: 'POST',
      body: JSON.stringify({ article_text: articleText }),
    });
    return response.data || response;
  },

  // ══════════════════════════════════════════════════════════════════
  // STEP 3: Gap Analysis & Angle Mapping (AI)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Generate gap analysis dan angle mapping
   * @param {string} articleText - Isi artikel
   * @param {Array} facts - Fakta dari step 2
   * @returns {Promise<{gaps: Array, angles: Array}>}
   */
  generateGapAnalysis: async (articleText, facts) => {
    const response = await request('/gap-analysis', {
      method: 'POST',
      body: JSON.stringify({ article_text: articleText, facts }),
    });
    return response.data || response;
  },

  // ══════════════════════════════════════════════════════════════════
  // STEP 4: Generate Title Recommendations (AI)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Generate title recommendations dari angle
   * @param {string} angleTitle - Judul angle
   * @param {string} angleHook - Hook angle
   * @param {Array} facts - Fakta dari step 2
   * @returns {Promise<{titles: Array}>}
   */
  generateTitles: async (angleTitle, angleHook, facts) => {
    const response = await request('/titles', {
      method: 'POST',
      body: JSON.stringify({
        angle_title: angleTitle,
        angle_hook: angleHook,
        facts,
      }),
    });
    return response.data || response;
  },

  // ══════════════════════════════════════════════════════════════════
  // STEP 5: Draft Generation (AI)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Generate draft artikel berlabel [FACT/CONTEXT/OPINI]
   * @param {string} angleTitle - Judul angle yang dipilih
   * @param {string} articleTitle - Judul artikel final
   * @param {Array} facts - Fakta dari step 2
   * @returns {Promise<{content: string, paragraphs: Array, word_count: number}>}
   */
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
  // STEP 6: Grounding Check (AI)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Verifikasi grounding score artikel vs fakta
   * @param {string} draftContent - Isi draft artikel
   * @param {Array} facts - Fakta dari step 2
   * @returns {Promise<{grounding_score: number, total_claims: number, status: string}>}
   */
  checkGrounding: async (draftContent, facts) => {
    const response = await request('/grounding', {
      method: 'POST',
      body: JSON.stringify({
        draft_content: draftContent,
        facts,
      }),
    });
    return response.data || response;
  },
};
