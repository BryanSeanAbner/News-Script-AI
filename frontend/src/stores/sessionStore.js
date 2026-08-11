/**
 * useSessionStore — Zustand store untuk 8-step pipeline
 */

import { create } from 'zustand';
import { api } from '../services/api';

export const useSessionStore = create((set, get) => ({
  // State
  currentSession: null,
  sessions: [],
  isLoading: false,
  isRunning: false,
  error: null,

  // ── Actions ──────────────────────────────────────────────────────

  clearError: () => set({ error: null }),

  /** Buat session baru */
  createSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.createSession();
      set({ currentSession: session, isLoading: false });
      return session;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /** Load session by ID */
  loadSession: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.getSession(id);
      set({ currentSession: session, isLoading: false });
      return session;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /** List semua session */
  listSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.listSessions();
      set({ sessions: data.sessions || [], isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  /** Delete session */
  deleteSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteSession(sessionId);
      // Update local sessions list (remove the deleted session)
      const { sessions } = get();
      const updatedSessions = sessions.filter(s => s.session_id !== sessionId);
      set({ sessions: updatedSessions, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /** Step 1 — Submit artikel */
  submitArticle: async (articleData) => {
    const { currentSession } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await api.submitArticle(currentSession.session_id, articleData);
      set({ currentSession: res.session, isLoading: false });
      return res;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /** AI Steps (2, 3, 5, 6) */
  runStep: async (stepNumber) => {
    const { currentSession } = get();
    set({ isRunning: true, error: null });
    try {
      const res = await api.runStep(currentSession.session_id, stepNumber);
      set({ currentSession: res.session, isRunning: false });
      return res;
    } catch (err) {
      set({ error: err.message, isRunning: false });
      throw err;
    }
  },

  /** Step 4 — Pilih angle + generate title recommendations (Groq) */
  selectAngleAndGenerateTitle: async (angleId) => {
    const { currentSession } = get();
    set({ isRunning: true, error: null });
    try {
      const res = await api.selectAngleAndGenerateTitle(currentSession.session_id, angleId);
      set({ currentSession: res.session, isRunning: false });
      return res;
    } catch (err) {
      set({ error: err.message, isRunning: false });
      throw err;
    }
  },

  /** Step 4 — Konfirmasi pilihan judul */
  selectTitle: async (titleId, customTitle) => {
    const { currentSession } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await api.selectTitle(currentSession.session_id, titleId, customTitle);
      set({ currentSession: res.session, isLoading: false });
      return res;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /** Step 7 — Editorial review */
  submitReview: async (reviewStatus, editorNotes, editedContent = null) => {
    const { currentSession } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await api.submitReview(currentSession.session_id, reviewStatus, editorNotes, editedContent);
      set({ currentSession: res.session, isLoading: false });
      return res;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /** Step 8 — Publish */
  publishArticle: async () => {
    const { currentSession } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await api.publishArticle(currentSession.session_id);
      // Update current session to reflect published status
      const updatedSession = { ...currentSession };
      updatedSession.status = 'completed';
      updatedSession.step_statuses = { ...updatedSession.step_statuses, step_8: 'done' };
      updatedSession.current_step = 8;
      if (res.publish_output) {
        updatedSession.data = { ...updatedSession.data, step_8: res.publish_output };
      }
      set({ currentSession: updatedSession, isLoading: false });
      return res;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // ── Helpers ──────────────────────────────────────────────────────

  getStepData: (step) => {
    const { currentSession } = get();
    return currentSession?.data?.[`step_${step}`] ?? null;
  },

  getStepStatus: (step) => {
    const { currentSession } = get();
    return currentSession?.step_statuses?.[`step_${step}`] ?? 'pending';
  },
}));
