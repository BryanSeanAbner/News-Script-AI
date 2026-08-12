/**
 * Step 8 — Publish Page (8-step pipeline)
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { Badge, Spinner } from '../components/UI';
import { Check, Eye, Edit2, X } from 'lucide-react';

export default function Step10Page() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loadSession, publishArticle, currentSession, isLoading, getStepData } = useSessionStore();
  const [published, setPublished] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!currentSession || currentSession.session_id !== id) {
      loadSession(id);
    }
  }, [id]);

  const step8 = getStepData(8);

  useEffect(() => {
    if (step8) { setPublished(step8); return; }

    const step7 = getStepData(7);
    if (step7?.review_status === 'approved' && !step8 && !isLoading) {
      publishArticle().then(res => setPublished(res.publish_output));
    }
  }, [currentSession]);

  if (isLoading && !published) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-16)' }}>
        <Spinner size="lg" />
        <p style={{ marginLeft: 'var(--space-4)', color: 'var(--color-fg-muted)' }}>Publishing...</p>
      </div>
    );
  }

  if (!published) return null;

  const summary = published.pipeline_summary || {};

  return (
    <div className="page-container">
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: 'var(--space-8)' }}>

        {/* Success Icon */}
        <div style={{ width: '64px', height: '64px', background: 'var(--color-success-muted)', border: '2px solid var(--color-success-emphasis)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
          <Check size={32} style={{ color: 'var(--color-success-fg)' }} />
        </div>

        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)', color: 'var(--color-fg-default)' }}>
          Artikel Berhasil Dipublish!
        </h1>

        <div style={{ padding: 'var(--space-4)', background: 'var(--color-canvas-subtle)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-default)', marginBottom: 'var(--space-6)', textAlign: 'left' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>
            "{published.article?.title}"
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-4)' }}>
            {published.article?.excerpt}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Badge variant="neutral">{published.article?.word_count?.toLocaleString()} kata</Badge>
            <Badge variant="pass">Grounding {Math.round((summary.final_grounding_score || 0) * 100)}%</Badge>
            <Badge variant="neutral">{summary.total_facts_extracted} fakta</Badge>
            {summary.revision_small_count > 0 && <Badge variant="warn">{summary.revision_small_count} revisi kecil</Badge>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => navigate(`/article/${id}`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Eye size={18} /> Lihat Lengkap
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setEditMode(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit2 size={18} /> Edit Naskah
          </button>
          <button
            className="btn btn-ghost btn-lg"
            onClick={() => navigate('/')}
          >
            + Buat Artikel Baru
          </button>
        </div>

        {/* Edit Confirmation */}
        {editMode && (
          <div className="modal-overlay" onClick={() => setEditMode(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit Naskah</h3>
                <button className="modal-close" onClick={() => setEditMode(false)}><X size={20} /></button>
              </div>
              <div className="modal-body">
                <p>
                  Anda akan melanjutkan ke <strong>Editorial Review (Step 7)</strong> untuk melakukan revisi pada naskah ini.
                </p>
                <p>
                  Perubahan yang Anda buat akan diproses kembali melalui sistem grounding check dan validasi.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setEditMode(false)}>
                  Batal
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setEditMode(false);
                    navigate(`/session/${id}/step/7`);
                  }}
                >
                  Lanjut ke Revisi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
