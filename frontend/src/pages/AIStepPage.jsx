/**
 * Step 2, 3, 5, 6 — Generic AI Step Page (8-step pipeline)
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import {
  PageHeader, Alert, StepCard, Badge, GroundingScoreBar,
  FactItem, RunningState, Spinner
} from '../components/UI';
import { ArrowRight, MessageCircle, Check, X, AlertTriangle, ArrowLeft } from 'lucide-react';

// ── Config per step (8-step pipeline) ──────────────────────────────────────
const STEP_CONFIG = {
  2: {
    title: 'Fact Extraction',
    subtitle: 'Groq Cloud (Llama 3.3 70B) mengekstrak fakta terstruktur dari artikel referensi',
    model: 'Groq (Llama 3.3 70B)',
    nextStep: 3,
    nextLabel: 'Lanjut ke Gap Analysis',
  },
  3: {
    title: 'Gap Analysis',
    subtitle: 'Groq Cloud (Llama 3.3 70B) mengidentifikasi gap editorial dari artikel referensi',
    model: 'Groq (Llama 3.3 70B)',
    nextStep: 4,
    nextLabel: 'Pilih Angle & Judul',
  },
  5: {
    title: 'Draft Generation',
    subtitle: 'Groq Cloud (Llama 3.3 70B) menulis draft artikel investigatif ber-label [FACT/CONTEXT/OPINI]',
    model: 'Groq (Llama 3.3 70B)',
    nextStep: 6,
    nextLabel: 'Lanjut ke Grounding Check',
  },
  6: {
    title: 'Grounding Check',
    subtitle: 'Groq Cloud (Llama 3.3 70B) memverifikasi setiap klaim draft vs fakta',
    model: 'Groq (Llama 3.3 70B)',
    nextStep: 7,
    nextLabel: 'Lanjut ke Editorial Review',
  },
};

export default function AIStepPage() {
  const { id, stepNumber } = useParams();
  const step = parseInt(stepNumber, 10);
  const navigate = useNavigate();
  const config = STEP_CONFIG[step] || {
    title: `Step ${step}`,
    subtitle: 'Processing...',
    model: 'Groq (Llama 3.3 70B)',
    nextStep: step + 1,
    nextLabel: 'Lanjut'
  };

  const { loadSession, runStep, currentSession, isRunning, error, clearError, getStepData, getStepStatus } = useSessionStore();

  const [autoRan, setAutoRan] = useState(false);

  const stepData = getStepData(step);
  const stepStatus = getStepStatus(step);

  useEffect(() => {
    loadSession(id).catch(() => navigate('/sessions'));
  }, [id, step]);

  useEffect(() => {
    if (!currentSession) return;
    if (currentSession.session_id !== id) return;
    if (stepStatus === 'done') { setAutoRan(true); return; }
    if (autoRan || isRunning) return;
    setAutoRan(true);
    clearError();
    runStep(step).catch(() => {});
  }, [currentSession, step]);

  async function handleNext() {
    if (step === 6) {
      const grounding = getStepData(6);
      if (grounding?.trigger_loop === 'LOOP_SMALL') {
        await loadSession(id);
        navigate(`/session/${id}/step/5`);
      } else {
        navigate(`/session/${id}/step/7`);
      }
    } else {
      navigate(`/session/${id}/step/${config.nextStep}`);
    }
  }

  async function retry() {
    clearError();
    setAutoRan(false);
    await runStep(step).catch(() => {});
  }

  if (!currentSession) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-16)' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const isDone = stepStatus === 'done';
  const isError = stepStatus === 'error';
  const badgeVariant = isDone ? 'pass' : isRunning ? 'running' : isError ? 'fail' : 'neutral';
  const badgeLabel = isDone ? 'Selesai' : isRunning ? 'Memproses...' : isError ? 'Error' : 'Menunggu';

  return (
    <div className="page-container">
      <PageHeader title={config.title} subtitle={config.subtitle} />

      {error && (
        <Alert type="danger">
          {error}{' '}
          <button className="btn btn-ghost btn-sm" onClick={retry}>Coba lagi</button>
        </Alert>
      )}

      <StepCard
        step={step}
        title={config.title}
        badge={badgeLabel}
        badgeVariant={badgeVariant}
        footer={isDone && stepData && (
          <>
            <span>Model: {stepData.model_used || config.model}</span>
            {stepData.token_usage && (
              <span>
                Token: {stepData.token_usage.input_tokens?.toLocaleString()} in,{' '}
                {stepData.token_usage.output_tokens?.toLocaleString()} out
              </span>
            )}
          </>
        )}
      >
        {/* Loading state */}
        {isRunning && (
          <RunningState model={config.model} message={`${config.model} sedang memproses...`} />
        )}

        {/* Step 2 — Facts */}
        {step === 2 && isDone && stepData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <strong>{stepData.total_facts} fakta diekstrak</strong>
              <Badge variant="info">{stepData.summary?.slice(0, 80)}...</Badge>
            </div>
            <div className="fact-list">
              {stepData.facts?.slice(0, 10).map(f => <FactItem key={f.id} fact={f} />)}
              {stepData.facts?.length > 10 && (
                <div style={{ textAlign: 'center', color: 'var(--color-fg-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-3)' }}>
                  + {stepData.facts.length - 10} fakta lainnya
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && isDone && stepData && (
          <div>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <strong>Gap Analysis Selesai</strong>
              {stepData.analysis_notes && (
                <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-fg-muted)', fontSize: 'var(--text-sm)' }}>
                  {stepData.analysis_notes}
                </p>
              )}
            </div>

            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginBottom: 'var(--space-2)' }}>
              Gap Editorial ({stepData.gaps?.length || 0} gap ditemukan):
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {stepData.gaps?.map((gap) => {
                const isTop = stepData.top_gaps?.includes(gap.id);
                return (
                  <div key={gap.id} className="card" style={{ border: isTop ? '2px solid var(--color-accent-fg)' : undefined }}>
                    <div className="card-body" style={{ padding: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                        <Badge variant="neutral">{gap.id}</Badge>
                        <Badge variant="neutral">{gap.gap_type}</Badge>
                        {isTop && <Badge variant="info">Top Gap</Badge>}
                      </div>
                      <strong>{gap.title}</strong>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)', margin: '4px 0 0' }}>
                        {gap.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-canvas-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-fg-muted)' }}>
              💡 {stepData.angles?.length || 3} angle berita telah dipetakan — pilih di langkah berikutnya.
            </div>
          </div>
        )}

        {/* Step 5 — Draft Generation */}
        {step === 5 && isDone && stepData && (
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge variant="neutral" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}>
                📖 {stepData.word_count || 0} kata
              </Badge>

              {stepData.label_stats && (
                <>
                  <Badge variant="pass" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}>
                    [FACT] {stepData.label_stats.FACT || 0} paragraf
                  </Badge>
                  <Badge variant="info" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}>
                    [CONTEXT] {stepData.label_stats.CONTEXT || 0} paragraf
                  </Badge>
                  <Badge variant="warn" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}>
                    [OPINI] {stepData.label_stats.OPINI || 0} paragraf
                  </Badge>
                </>
              )}

              {stepData.revision_context?.is_revision && (
                <Badge variant="danger">Revisi #{stepData.revision_context.revision_number}</Badge>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {stepData.paragraphs && stepData.paragraphs.length > 0 ? (
                stepData.paragraphs.map((p, idx) => {
                  const type = p.type || 'CONTEXT';
                  const isFact = type === 'FACT';
                  const isContext = type === 'CONTEXT';

                  const badgeVar = isFact ? 'pass' : isContext ? 'info' : 'warn';
                  const labelHint = isFact ? 'Fakta Terverifikasi' : isContext ? 'Konteks (Perlu Validasi AI)' : 'Opini (Konfirmasi Penulis)';

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: `4px solid ${
                          isFact ? 'var(--color-success-fg)' : isContext ? 'var(--color-accent-fg)' : 'var(--color-attention-fg)'
                        }`,
                        backgroundColor: 'var(--color-canvas-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                          <Badge variant={badgeVar}>[{type}]</Badge>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>{labelHint}</span>
                        </div>
                        {p.source_fact_id && (
                          <Badge variant="neutral">Sumber: {p.source_fact_id}</Badge>
                        )}
                      </div>

                      <p style={{
                        fontSize: 'var(--text-base)',
                        lineHeight: 'var(--leading-relaxed)',
                        color: 'var(--color-fg-default)',
                        marginBottom: p.quote ? 'var(--space-3)' : 0
                      }}>
                        {p.text}
                      </p>

                      {p.quote && (
                        <blockquote style={{
                          margin: 0,
                          padding: 'var(--space-2) var(--space-3)',
                          backgroundColor: 'var(--color-canvas-default)',
                          borderLeft: '2px solid var(--color-border-default)',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-fg-muted)',
                          fontStyle: 'italic',
                          display: 'flex',
                          alignItems: 'start',
                          gap: '6px'
                        }}>
                          <MessageCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} /> Kutipan Asli: &ldquo;{p.quote}&rdquo;
                        </blockquote>
                      )}
                    </div>
                  );
                })
              ) : stepData.content ? (
                // Fallback: tampilkan content biasa jika paragraphs tidak ada
                <div className="article-content" style={{
                  padding: 'var(--space-4)',
                  background: 'var(--color-canvas-subtle)',
                  borderRadius: 'var(--radius-md)',
                  lineHeight: 'var(--leading-relaxed)'
                }}>
                  {stepData.content.split('\n\n').filter(Boolean).map((p, i) => (
                    <p key={i} style={{ marginBottom: 'var(--space-3)' }}>{p}</p>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-fg-muted)', padding: 'var(--space-8)' }}>
                  Draft belum tersedia
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 6 — Grounding Result */}
        {step === 6 && isDone && stepData && (
          <div>
            <GroundingScoreBar score={stepData.grounding_score} status={stepData.status} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', margin: 'var(--space-4) 0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-fg-default)' }}>
                  {stepData.total_claims || 0}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>Total Klaim</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success-fg)' }}>
                  {stepData.grounded_claims || 0}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>Grounded</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-danger-fg)' }}>
                  {(stepData.ungrounded_claims?.length || 0)}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>Ungrounded</div>
              </div>
            </div>

            {stepData.ungrounded_claims?.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <strong style={{ display: 'block', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                  Klaim yang perlu perhatian ({stepData.ungrounded_claims.length}):
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {stepData.ungrounded_claims.map((c, i) => (
                    <div 
                      key={i} 
                      style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: `4px solid ${
                          c.severity === 'critical' ? 'var(--color-danger-fg)' 
                          : c.severity === 'major' ? 'var(--color-attention-fg)' 
                          : 'var(--color-attention-muted)'
                        }`,
                        backgroundColor: 'var(--color-canvas-subtle)',
                        fontSize: 'var(--text-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                        <Badge variant={c.severity === 'critical' ? 'fail' : c.severity === 'major' ? 'warn' : 'neutral'}>
                          {c.severity?.toUpperCase() || 'MINOR'}
                        </Badge>
                        <span style={{ flex: 1 }}>{c.claim_text}</span>
                      </div>
                      {c.suggestion && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border-default)' }}>
                          💡 <strong>Saran:</strong> {c.suggestion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stepData.claim_evidence_map?.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-canvas-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)' }}>
                <strong style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Pemetaan Bukti Klaim:</strong>
                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {stepData.claim_evidence_map.slice(0, 5).map((item, i) => (
                    <div key={i} style={{ padding: 'var(--space-2)', background: 'var(--color-canvas-default)', borderRadius: 'var(--radius-sm)', borderLeft: `2px solid ${item.is_grounded ? 'var(--color-success-fg)' : 'var(--color-danger-fg)'}` }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.is_grounded ? <Check size={14} /> : <X size={14} />} {item.claim_text?.slice(0, 80)}...
                      </div>
                      {item.supporting_fact_ids?.length > 0 && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
                          Dari: {item.supporting_fact_ids.join(', ')}
                        </div>
                      )}
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
                        Confidence: {Math.round((item.confidence || 0) * 100)}%
                      </div>
                    </div>
                  ))}
                  {stepData.claim_evidence_map?.length > 5 && (
                    <div style={{ textAlign: 'center', color: 'var(--color-fg-muted)', fontSize: 'var(--text-xs)', padding: 'var(--space-2)' }}>
                      + {stepData.claim_evidence_map.length - 5} klaim lainnya
                    </div>
                  )}
                </div>
              </div>
            )}

            {stepData.recommendation && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: stepData.status === 'PASS' ? 'var(--color-success-muted)' : stepData.status === 'WARN' ? 'var(--color-attention-muted)' : 'var(--color-danger-muted)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', borderLeft: `4px solid ${stepData.status === 'PASS' ? 'var(--color-success-fg)' : stepData.status === 'WARN' ? 'var(--color-attention-fg)' : 'var(--color-danger-fg)'}` }}>
                <strong>Rekomendasi:</strong> {stepData.recommendation}
              </div>
            )}

            {stepData.trigger_loop === 'LOOP_SMALL' && (
              <Alert type="warning" style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> Skor grounding terlalu rendah ({Math.round((stepData.grounding_score || 0) * 100)}%). Sistem akan otomatis mengulangi draft generation untuk perbaikan.
              </Alert>
            )}
          </div>
        )}
      </StepCard>

      {/* Action bar */}
      {isDone && (
        <div className="action-bar">
          <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={16} /> Kembali
          </button>
          <button className="btn btn-primary btn-lg" onClick={handleNext} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {step === 6 && stepData?.trigger_loop === 'LOOP_SMALL' ? 'Ulangi Draft Generation...' : <><span>{config.nextLabel}</span> <ArrowRight size={16} /></>}
          </button>
        </div>
      )}
    </div>
  );
}
