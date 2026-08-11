/**
 * Step 7 — Human Editorial Review [HUMAN GATE] (8-step pipeline)
 * Menampilkan paragraf berlabel [FACT/CONTEXT/OPINI] yang bisa diedit langsung.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { PageHeader, Alert, GroundingScoreBar, Badge } from '../components/UI';

// Warna dan label per tipe paragraf
const TYPE_META = {
  FACT: {
    label: 'FACT',
    hint: 'Fakta terverifikasi dari sumber',
    border: 'var(--color-success-fg)',
    badge: 'pass',
  },
  CONTEXT: {
    label: 'CONTEXT',
    hint: 'Konteks — perlu divalidasi',
    border: 'var(--color-accent-fg)',
    badge: 'info',
  },
  OPINI: {
    label: 'OPINI',
    hint: 'Opini — perlu konfirmasi penulis',
    border: 'var(--color-attention-fg)',
    badge: 'warn',
  },
};

export default function Step9Page() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loadSession, submitReview, publishArticle, currentSession, isLoading, error, clearError, getStepData } =
    useSessionStore();

  const [reviewStatus, setReviewStatus] = useState('');
  const [editorNotes, setEditorNotes] = useState('');

  // Daftar paragraf yang bisa diedit — diinisialisasi dari data draft
  const [editableParagraphs, setEditableParagraphs] = useState([]);
  const [editingIdx, setEditingIdx] = useState(null); // index paragraf yang sedang diedit

  useEffect(() => {
    if (!currentSession || currentSession.session_id !== id) loadSession(id);
  }, [id]);

  // Inisialisasi editableParagraphs saat data draft tersedia
  useEffect(() => {
    const draft = getStepData(5);
    if (!draft) return;
    if (draft.paragraphs?.length > 0) {
      setEditableParagraphs(draft.paragraphs.map(p => ({ ...p })));
    } else if (draft.content) {
      // Fallback: split by newline jika tidak ada paragraphs array
      const paras = draft.content.split('\n').filter(Boolean).map((text, i) => ({
        order: i + 1,
        type: 'CONTEXT',
        text,
        quote: null,
      }));
      setEditableParagraphs(paras);
    }
  }, [currentSession]);

  const step1 = getStepData(1);
  const step4 = getStepData(4);
  const draft = getStepData(5);
  const grounding = getStepData(6);
  const session = currentSession;

  async function handleSubmit() {
    if (!reviewStatus) return;
    if (reviewStatus !== 'approved' && !editorNotes.trim()) return;
    clearError();
    
    // Serialize edited paragraphs to content string if there are changes
    let editedContent = null;
    const originalParagraphs = draft?.paragraphs || [];
    const hasChanges = editableParagraphs.some((p, idx) => 
      p.text !== (originalParagraphs[idx]?.text || '')
    );
    
    if (hasChanges && editableParagraphs.length > 0) {
      editedContent = editableParagraphs.map(p => p.text).join('\n\n');
    }
    
    // Serialize edited paragraphs ke editor notes jika ada perubahan
    const editedParaCount = editableParagraphs.filter((p, idx) => 
      p.text !== (draft?.paragraphs?.[idx]?.text || '')
    ).length;
    
    let finalNotes = editorNotes;
    if (editedParaCount > 0) {
      finalNotes += `\n\n[EDITED] ${editedParaCount} paragraf telah diedit oleh editor.`;
    }
    
    await submitReview(reviewStatus, finalNotes, editedContent);
    
    if (reviewStatus === 'approved') {
      navigate(`/session/${id}/step/8`);
    } else if (reviewStatus === 'revision_small') {
      navigate(`/session/${id}/step/5`);
    } else {
      navigate(`/session/${id}/step/3`);
    }
  }

  function updateParagraph(idx, newText) {
    setEditableParagraphs(prev =>
      prev.map((p, i) => (i === idx ? { ...p, text: newText } : p))
    );
  }

  const title = step4?.selected_title || draft?.title || '';

  return (
    <div className="page-container">
      <PageHeader title="Editorial Review" subtitle="Step 7: Review final sebelum artikel dipublish" />

      <Alert type="human">
        <strong>Human Gate (Step 7)</strong> — Periksa akurasi faktual, etika jurnalistik, dan aspek hukum artikel.
        Klik teks paragraf untuk mengedit langsung. Keputusan berada sepenuhnya di tangan editor.
      </Alert>

      {error && <Alert type="danger">{error}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>

        {/* Artikel dengan paragraf berlabel */}
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{title}</div>
                {step1?.metadata?.topic && (
                  <div className="card-subtitle">{step1.metadata.topic}</div>
                )}
              </div>
              {grounding && <GroundingScoreBar score={grounding.grounding_score} status={grounding.status} />}
            </div>
            <div className="card-body">

              {/* Legend */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
                {Object.entries(TYPE_META).map(([type, meta]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: meta.border, display: 'inline-block' }} />
                    <Badge variant={meta.badge}>[{meta.label}]</Badge>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>{meta.hint}</span>
                  </div>
                ))}
              </div>

              {/* Paragraf berlabel — klik untuk edit */}
              {editableParagraphs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {editableParagraphs.map((p, idx) => {
                    const type = p.type || 'CONTEXT';
                    const meta = TYPE_META[type] || TYPE_META.CONTEXT;
                    const isEditing = editingIdx === idx;

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: 'var(--space-4)',
                          borderRadius: 'var(--radius-md)',
                          borderLeft: `4px solid ${meta.border}`,
                          backgroundColor: isEditing
                            ? 'var(--color-canvas-default)'
                            : 'var(--color-canvas-subtle)',
                          boxShadow: isEditing ? '0 0 0 2px ' + meta.border + '55' : 'none',
                          transition: 'box-shadow 0.15s',
                        }}
                      >
                        {/* Header baris */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                            <Badge variant={meta.badge}>[{meta.label}]</Badge>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>{meta.hint}</span>
                            {p.source_fact_id && (
                              <Badge variant="neutral">Sumber: {p.source_fact_id}</Badge>
                            )}
                          </div>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
                            onClick={() => setEditingIdx(isEditing ? null : idx)}
                          >
                            {isEditing ? '✓ Simpan' : '✏️ Edit'}
                          </button>
                        </div>

                        {/* Teks — textarea saat edit, paragraf biasa saat tidak */}
                        {isEditing ? (
                          <textarea
                            autoFocus
                            className="form-input form-textarea"
                            value={p.text}
                            onChange={e => updateParagraph(idx, e.target.value)}
                            rows={Math.max(3, Math.ceil(p.text.length / 80))}
                            style={{
                              width: '100%',
                              fontSize: 'var(--text-base)',
                              lineHeight: 'var(--leading-relaxed)',
                              minHeight: 'unset',
                              resize: 'vertical',
                            }}
                          />
                        ) : (
                          <p
                            style={{
                              fontSize: 'var(--text-base)',
                              lineHeight: 'var(--leading-relaxed)',
                              color: 'var(--color-fg-default)',
                              marginBottom: p.quote ? 'var(--space-3)' : 0,
                              cursor: 'text',
                            }}
                            onClick={() => setEditingIdx(idx)}
                            title="Klik untuk mengedit"
                          >
                            {p.text}
                          </p>
                        )}

                        {/* Kutipan verbatim (hanya FACT) */}
                        {p.quote && !isEditing && (
                          <blockquote style={{
                            margin: 0,
                            padding: 'var(--space-2) var(--space-3)',
                            backgroundColor: 'var(--color-canvas-default)',
                            borderLeft: '2px solid var(--color-border-default)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-fg-muted)',
                            fontStyle: 'italic',
                          }}>
                            💬 Kutipan Asli: "{p.quote}"
                          </blockquote>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Fallback jika tidak ada paragraphs array (format lama)
                <div className="article-content">
                  {draft?.content?.split('\n').filter(Boolean).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Review Panel */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 'calc(var(--topbar-height) + 16px)' }}>
            <div className="card-header">
              <div className="card-title">Keputusan Editorial</div>
            </div>
            <div className="card-body">

              {/* Summary */}
              <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-canvas-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <span>Fakta: {getStepData(2)?.total_facts || 0}</span>
                  <span>Grounding: {Math.round((grounding?.grounding_score || 0) * 100)}%</span>
                  <span>Revisi kecil: {session?.revision_count?.small || 0}×</span>
                  <span>Revisi besar: {session?.revision_count?.large || 0}×</span>
                  <span>Draft: {draft?.word_count?.toLocaleString()} kata</span>
                  {draft?.label_stats && (
                    <>
                      <span style={{ marginTop: 4, borderTop: '1px solid var(--color-border-muted)', paddingTop: 4 }}>
                        [FACT] {draft.label_stats.FACT || 0} paragraf
                      </span>
                      <span>[CONTEXT] {draft.label_stats.CONTEXT || 0} paragraf</span>
                      <span>[OPINI] {draft.label_stats.OPINI || 0} paragraf</span>
                    </>
                  )}
                  {editableParagraphs.filter(p => p.text !== draft?.paragraphs?.find((_, i2) => i2 === editableParagraphs.indexOf(p))?.text).length > 0 && (
                    <span style={{ color: 'var(--color-attention-fg)', marginTop: 4 }}>
                      ✏️ {editableParagraphs.length} paragraf diedit
                    </span>
                  )}
                </div>
              </div>

              {/* Catatan editor */}
              <div className="form-group">
                <label className="form-label" htmlFor="editor-notes">
                  Catatan Editor{reviewStatus !== 'approved' && <span style={{ color: 'var(--color-danger-fg)' }}> *</span>}
                </label>
                <textarea
                  id="editor-notes"
                  className="form-input form-textarea"
                  value={editorNotes}
                  onChange={e => setEditorNotes(e.target.value)}
                  placeholder="Catatan untuk keputusan ini..."
                  rows={4}
                  style={{ minHeight: 'unset' }}
                />
              </div>

              {/* Decision buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <button
                  className="btn btn-success btn-lg"
                  style={{ justifyContent: 'center' }}
                  onClick={async () => {
                    clearError();
                    try {
                      // Serialize edited content if there are changes
                      let editedContent = null;
                      const originalParagraphs = draft?.paragraphs || [];
                      const hasChanges = editableParagraphs.some((p, idx) => 
                        p.text !== (originalParagraphs[idx]?.text || '')
                      );
                      
                      if (hasChanges && editableParagraphs.length > 0) {
                        editedContent = editableParagraphs.map(p => p.text).join('\n\n');
                      }

                      // Step 1: Submit review sebagai approved with edited content
                      await submitReview('approved', editorNotes || 'Artikel disetujui untuk dipublish', editedContent);
                      // Step 2: Auto-publish artikel
                      await publishArticle();
                      // Step 3: Navigate to publish page
                      navigate(`/session/${id}/step/8`);
                    } catch (err) {
                      console.error('Publish error:', err);
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Mempublish...' : '✓ Approve & Publish'}
                </button>
                <button
                  className={`btn btn-lg ${reviewStatus === 'revision_small' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'center' }}
                  onClick={() => setReviewStatus('revision_small')}
                >
                  ↩ Revisi Draft (Step 5)
                </button>
                <button
                  className={`btn btn-lg ${reviewStatus === 'revision_large' ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ justifyContent: 'center' }}
                  onClick={() => setReviewStatus('revision_large')}
                >
                  ⟳ Ganti Angle (Step 3)
                </button>
              </div>

              {(reviewStatus === 'revision_small' || reviewStatus === 'revision_large') && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleSubmit}
                    disabled={isLoading || !editorNotes.trim()}
                  >
                    {isLoading ? 'Menyimpan...' : 'Konfirmasi Revisi →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
