/**
 * useSessionStore — Zustand store untuk stateless 8-step pipeline
 * State disimpan di client-side (memory + localStorage)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

// Helper: Generate UUID
function generateId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: Get initial session structure
function createEmptySession(id = null) {
  return {
    session_id: id || generateId(),
    status: 'draft', // draft | completed
    current_step: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    step_statuses: {
      step_1: 'pending',
      step_2: 'pending',
      step_3: 'pending',
      step_4: 'pending',
      step_5: 'pending',
      step_6: 'pending',
      step_7: 'pending',
      step_8: 'pending',
    },
    data: {},
    revision_count: {
      small: 0,
      large: 0,
    },
  };
}

export const useSessionStore = create(
  persist(
    (set, get) => ({
      // State
      currentSession: null,
      sessions: [], // List of all sessions (stored in localStorage)
      isLoading: false,
      isRunning: false,
      error: null,

      // ── Actions ──────────────────────────────────────────────────────

      clearError: () => set({ error: null }),

      /** Buat session baru (client-side only) */
      createSession: () => {
        const newSession = createEmptySession();
        const { sessions } = get();
        set({
          currentSession: newSession,
          sessions: [newSession, ...sessions],
        });
        return newSession;
      },

      /** Load session by ID dari localStorage */
      loadSession: (id) => {
        const { sessions } = get();
        const session = sessions.find((s) => s.session_id === id);
        if (session) {
          set({ currentSession: session, error: null });
          return Promise.resolve(session);
        } else {
          set({ error: 'Session tidak ditemukan' });
          return Promise.reject(new Error('Session tidak ditemukan'));
        }
      },

      /** List semua session dari localStorage */
      listSessions: () => {
        // Sessions sudah ada di state dari persist middleware
        return Promise.resolve();
      },

      /** Delete session dari localStorage */
      deleteSession: (sessionId) => {
        const { sessions, currentSession } = get();
        const updatedSessions = sessions.filter((s) => s.session_id !== sessionId);
        set({
          sessions: updatedSessions,
          currentSession: currentSession?.session_id === sessionId ? null : currentSession,
        });
        return Promise.resolve({ success: true });
      },

      /** Update current session helper */
      updateSession: (updates) => {
        const { currentSession, sessions } = get();
        if (!currentSession) return;

        const updatedSession = {
          ...currentSession,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        // Update di sessions list
        const updatedSessions = sessions.map((s) =>
          s.session_id === currentSession.session_id ? updatedSession : s
        );

        set({ currentSession: updatedSession, sessions: updatedSessions });
      },

      // ══════════════════════════════════════════════════════════════════
      // STEP 1: Submit Artikel (User Input)
      // ══════════════════════════════════════════════════════════════════

      submitArticle: async (articleData) => {
        const { currentSession, updateSession } = get();
        if (!currentSession) throw new Error('No active session');

        set({ isLoading: true, error: null });
        try {
          // Simpan data step 1 di client
          updateSession({
            data: {
              ...currentSession.data,
              step_1: {
                ...articleData,
                submitted_at: new Date().toISOString(),
              },
            },
            step_statuses: {
              ...currentSession.step_statuses,
              step_1: 'done',
            },
            current_step: 2,
          });

          set({ isLoading: false });
          return { success: true };
        } catch (err) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      // ══════════════════════════════════════════════════════════════════
      // STEP 2: Fact Extraction (AI)
      // ══════════════════════════════════════════════════════════════════

      runStep2: async () => {
        const { currentSession, updateSession } = get();
        if (!currentSession) throw new Error('No active session');

        const step1 = currentSession.data.step_1;
        if (!step1) throw new Error('Step 1 data missing');

        set({ isRunning: true, error: null });
        try {
          const result = await api.extractFacts(step1.body);

          updateSession({
            data: {
              ...currentSession.data,
              step_2: {
                facts: result.facts || [],
                total_facts: result.total_facts || 0,
                summary: result.summary || '',
                model_used: 'Groq (Llama 3.3 70B)',
                completed_at: new Date().toISOString(),
              },
            },
            step_statuses: {
              ...currentSession.step_statuses,
              step_2: 'done',
            },
            current_step: 3,
          });

          set({ isRunning: false });
          return { success: true };
        } catch (err) {
          set({ error: err.message, isRunning: false });
          updateSession({
            step_statuses: {
              ...currentSession.step_statuses,
              step_2: 'error',
            },
          });
          throw err;
        }
      },

      // ══════════════════════════════════════════════════════════════════
      // STEP 3: Gap Analysis & Angle Mapping (AI)
      // ══════════════════════════════════════════════════════════════════

      runStep3: async () => {
        const { currentSession, updateSession } = get();
        if (!currentSession) throw new Error('No active session');

        const step1 = currentSession.data.step_1;
        const step2 = currentSession.data.step_2;
        if (!step1 || !step2) throw new Error('Previous step data missing');

        set({ isRunning: true, error: null });
        try {
          const result = await api.generateGapAnalysis(step1.body, step2.facts);

          updateSession({
            data: {
              ...currentSession.data,
              step_3: {
                gaps: result.gaps || [],
                angles: result.angles || [],
                analysis_notes: result.analysis_notes || '',
                model_used: 'Groq (Llama 3.3 70B)',
                completed_at: new Date().toISOString(),
              },
            },
            step_statuses: {
              ...currentSession.step_statuses,
              step_3: 'done',
            },
            current_step: 4,
          });

          set({ isRunning: false });
          return { success: true };
        } catch (err) {
          set({ error: err.message, isRunning: false });
          updateSession({
            step_statuses: {
              ...currentSession.step_statuses,
              step_3: 'error',
            },
          });
          throw err;
        }
      },

      // ══════════════════════════════════════════════════════════════════
      // STEP 4: Pilih Angle & Generate Titles (User + AI)
      // ══════════════════════════════════════════════════════════════════

      selectAngleAndGenerateTitle: async (angleId) => {
        const { currentSession, updateSession } = get();
        if (!currentSession) throw new Error('No active session');

        const step3 = currentSession.data.step_3;
        if (!step3) throw new Error('Step 3 data missing');

        const selectedAngle = step3.angles.find((a) => a.id === angleId);
        if (!selectedAngle) throw new Error('Angle not found');

        set({ isRunning: true, error: null });
        try {
          // Generate title recommendations via AI
          const result = await api.generateTitles(
            selectedAngle.angle_title,
            selectedAngle.angle_hook,
            currentSession.data.step_2.facts
          );

          updateSession({
            data: {
              ...currentSession.data,
              step_4: {
                selected_angle_id: angleId,
                selected_angle: selectedAngle,
                titles: result.titles || [],
                model_used: 'Groq (Llama 3.3 70B)',
                completed_at: new Date().toISOString(),
              },
            },
            step_statuses: {
              ...currentSession.step_statuses,
              step_4: 'done',
            },
            current_step: 5,
          });

          set({ isRunning: false });
          return { success: true };
        } catch (err) {
          set({ error: err.message, isRunning: false });
          throw err;
        }
      },

      // ══════════════════════════════════════════════════════════════════
      // STEP 5: Pilih Judul (User Input)
      // ══════════════════════════════════════════════════════════════════

      selectTitle: async (titleId, customTitle) => {
        const { currentSession, updateSession } = get();
        if (!currentSession) throw new Error('No active session');

        const step4 = currentSession.data.step_4;
        if (!step4) throw new Error('Step 4 data missing');

        let selectedTitle;
        if (customTitle) {
          selectedTitle = customTitle;
        } else {
          const titleObj = step4.titles.find((t) => t.id === titleId);
          if (!titleObj) throw new Error('Title not found');
          selectedTitle = titleObj.text;
        }

        updateSession({
          data: {
            ...currentSession.data,
            step_4: {
              ...step4,
              selected_title_id: customTitle ? null : titleId,
              selected_title: selectedTitle,
            },
          },
          current_step: 5,
        });

        return Promise.resolve({ success: true });
      },

      // ══════════════════════════════════════════════════════════════════
      // STEP 6: Draft Generation (AI)
      // ══════════════════════════════════════════════════════════════════

      runStep5: async () => {
        const { currentSession, updateSession } = get();
        if (!currentSession) throw new Error('No active session');

        const step2 = currentSession.data.step_2;
        const step4 = currentSession.data.step_4;
        if (!step2 || !step4) throw new Error('Previous step data missing');

        set({ isRunning: true, error: null });
        try {
          const result = await api.generateDraft(
            step4.selected_angle.angle_title,
            step4.selected_title,
            step2.facts
          );

          updateSession({
            data: {
              ...currentSession.data,
              step_5: {
                content: result.content || '',
                paragraphs: result.paragraphs || [],
                word_count: result.word_count || 0,
                label_stats: result.label_stats || {},
                model_used: 'Groq (Llama 3.3 70B)',
                completed_at: new Date().toISOString(),
              },
            },
            step_statuses: {
              ...currentSession.step_statuses,
              step_5: 'done',
            },
            current_step: 6,
          });

          set({ isRunning: false });
          return { success: true };
        } catch (err) {
          set({ error: err.message, isRunning: false });
          updateSession({
            step_statuses: {
              ...currentSession.step_statuses,
              step_5: 'error',
            },
          });
          throw err;
        }
      },

      // ══════════════════════════════════════════════════════════════════
      // STEP 7: Grounding Check (AI)
      // ══════════════════════════════════════════════════════════════════

      runStep6: async () => {
        const { currentSession, updateSession } = get();
        if (!currentSession) throw new Error('No active session');

        const step2 = currentSession.data.step_2;
        const step5 = currentSession.data.step_5;
        if (!step2 || !step5) throw new Error('Previous step data missing');

        set({ isRunning: true, error: null });
        try {
          const result = await api.checkGrounding(step5.content, step2.facts);

          updateSession({
            data: {
              ...currentSession.data,
              step_6: {
                grounding_score: result.grounding_score || 0,
                total_claims: result.total_claims || 0,
                grounded_claims: result.grounded_claims || 0,
                ungrounded_claims: result.ungrounded_claims || [],
                status: result.status || 'PASS',
                recommendation: result.recommendation || '',
                model_used: 'Groq (Llama 3.3 70B)',
                completed_at: new Date().toISOString(),
              },
            },
            step_statuses: {
              ...currentSession.step_statuses,
              step_6: 'done',
            },
            current_step: 7,
          });

          set({ isRunning: false });
          return { success: true };
        } catch (err) {
          set({ error: err.message, isRunning: false });
          updateSession({
            step_statuses: {
              ...currentSession.step_statuses,
              step_6: 'error',
            },
          });
          throw err;
        }
      },

      // ══════════════════════════════════════════════════════════════════
      // STEP 8: Editorial Review (User Input)
      // ══════════════════════════════════════════════════════════════════

      submitReview: async (reviewStatus, editorNotes, editedContent = null) => {
        const { currentSession, updateSession } = get();
        if (!currentSession) throw new Error('No active session');

        set({ isLoading: true, error: null });
        try {
          // Update step 7 dengan review
          updateSession({
            data: {
              ...currentSession.data,
              step_7: {
                review_status: reviewStatus,
                editor_notes: editorNotes,
                edited_content: editedContent,
                reviewed_at: new Date().toISOString(),
              },
            },
            step_statuses: {
              ...currentSession.step_statuses,
              step_7: 'done',
            },
            current_step: reviewStatus === 'approved' ? 8 : currentSession.current_step,
          });

          // Handle revisions
          if (reviewStatus === 'revision_small') {
            // Back to Step 5 (Draft Generation)
            updateSession({
              current_step: 5,
              revision_count: {
                ...currentSession.revision_count,
                small: currentSession.revision_count.small + 1,
              },
            });
          } else if (reviewStatus === 'revision_large') {
            // Back to Step 3 (Gap Analysis)
            updateSession({
              current_step: 3,
              revision_count: {
                ...currentSession.revision_count,
                large: currentSession.revision_count.large + 1,
              },
            });
          }

          set({ isLoading: false });
          return { success: true };
        } catch (err) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      // ══════════════════════════════════════════════════════════════════
      // STEP 9: Publish (Final)
      // ══════════════════════════════════════════════════════════════════

      publishArticle: async () => {
        const { currentSession, updateSession } = get();
        if (!currentSession) throw new Error('No active session');

        set({ isLoading: true, error: null });
        try {
          const step4 = currentSession.data.step_4;
          const step5 = currentSession.data.step_5;
          const step6 = currentSession.data.step_6;
          const step7 = currentSession.data.step_7;

          // Create publish output
          const publishOutput = {
            article: {
              title: step4.selected_title,
              content: step7?.edited_content || step5.content,
              word_count: step5.word_count,
              excerpt: step5.content.substring(0, 200) + '...',
            },
            pipeline_summary: {
              total_facts_extracted: currentSession.data.step_2?.total_facts || 0,
              final_grounding_score: step6.grounding_score || 0,
              revision_small_count: currentSession.revision_count.small,
              revision_large_count: currentSession.revision_count.large,
            },
            published_at: new Date().toISOString(),
          };

          updateSession({
            data: {
              ...currentSession.data,
              step_8: publishOutput,
            },
            step_statuses: {
              ...currentSession.step_statuses,
              step_8: 'done',
            },
            status: 'completed',
            current_step: 8,
          });

          set({ isLoading: false });
          return { publish_output: publishOutput };
        } catch (err) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      // ══════════════════════════════════════════════════════════════════
      // Generic runStep router
      // ══════════════════════════════════════════════════════════════════

      runStep: async (stepNumber) => {
        const stepMap = {
          2: 'runStep2',
          3: 'runStep3',
          5: 'runStep5',
          6: 'runStep6',
        };

        const methodName = stepMap[stepNumber];
        if (!methodName) {
          throw new Error(`Invalid step number: ${stepNumber}`);
        }

        return get()[methodName]();
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
    }),
    {
      name: 'news-script-sessions', // localStorage key
      partialize: (state) => ({
        sessions: state.sessions,
        // currentSession juga disimpan untuk recovery
        currentSession: state.currentSession,
      }),
    }
  )
);
