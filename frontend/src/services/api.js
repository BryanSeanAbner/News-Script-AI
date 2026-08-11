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

  // AI Endpoints (Serverless Functions)
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

