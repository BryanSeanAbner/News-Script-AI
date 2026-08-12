import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { Spinner, Badge } from '../components/UI';
import { ArrowLeft, Edit2, FileText, Clipboard, Check, Circle, MessageCircle, X } from 'lucide-react';

// Warna dan label per tipe paragraf (sama seperti di Step9Page)
const TYPE_META = {
  FACT: {
    label: 'FACT',
    hint: 'Fakta terverifikasi dari sumber',
    border: 'var(--color-success-fg)',
    badge: 'pass',
  },
  CONTEXT: {
    label: 'CONTEXT',
    hint: 'Konteks &mdash; perlu divalidasi',
    border: 'var(--color-accent-fg)',
    badge: 'info',
  },
  OPINI: {
    label: 'OPINI',
    hint: 'Opini &mdash; perlu konfirmasi penulis',
    border: 'var(--color-attention-fg)',
    badge: 'warn',
  },
};

export default function ArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loadSession, currentSession, isLoading } = useSessionStore();
  const [showFullTextModal, setShowFullTextModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!currentSession || currentSession.session_id !== id) {
      loadSession(id);
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="page-container">
        <p>Artikel tidak ditemukan</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  const step1 = currentSession?.data?.step_1;
  const step2 = currentSession?.data?.step_2;
  const step4 = currentSession?.data?.step_4;
  const step5 = currentSession?.data?.step_5;
  const step6 = currentSession?.data?.step_6;
  const step7 = currentSession?.data?.step_7;
  const step8 = currentSession?.data?.step_8;

  const title = currentSession.status === 'completed' 
    ? (step4?.selected_title || step6?.selected_title || step1?.title || 'Tanpa Judul')
    : (step1?.title || 'Tanpa Judul');

  let content = '';
  let source = '';
  
  if (step8?.article?.content) {
    content = step8.article.content;
    source = 'Published Article';
  } else if (step5?.content) {
    content = step5.content;
    source = 'Draft Content';
  } else if (step1?.body) {
    content = step1.body;
    source = 'Original Input';
  }

  const excerpt = step8?.article?.excerpt || step5?.excerpt || '';
  const wordCount = step8?.article?.word_count || step5?.word_count || 0;
  const grounding = step8?.pipeline_summary?.final_grounding_score || 0;
  const facts = step8?.pipeline_summary?.total_facts_extracted || step2?.total_facts || 0;

  const handleEdit = () => {
    navigate(`/session/${id}/step/7`);
  };

  const copyFullText = async () => {
    const fullText = `${title}\n\n${content}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const getPlainText = () => {
    if (step5?.paragraphs || step8?.paragraphs) {
      const paragraphs = step5?.paragraphs || step8?.paragraphs || [];
      return paragraphs.map(p => p.text).join('\n\n');
    }
    return content;
  };

  return (
    <div className="article-detail-page">
      <div className="article-detail-header">
        <div className="breadcrumb">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={16} /> Dashboard
          </button>
          <span>/</span>
          <span>Naskah Berita</span>
        </div>
      </div>

      <div className="article-detail-container">
        <div className="article-header">
          <div>
            <h1 className="article-title">{title}</h1>
            <div className="article-meta">
              <span className="meta-item" style={{
                color: currentSession.status === 'completed' ? 'var(--color-success-fg)' : 'var(--color-fg-muted)',
                fontWeight: currentSession.status === 'completed' ? 'var(--font-semibold)' : 'normal',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {currentSession.status === 'completed' ? <><Check size={14} /> Dipublish</> : <><Circle size={14} /> Draft</>}
              </span>
              {wordCount > 0 && <span className="meta-item">{wordCount.toLocaleString()} kata</span>}
              {currentSession.updated_at && (
                <span className="meta-item">
                  {new Date(currentSession.updated_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Edit2 size={16} /> Edit Naskah
          </button>
        </div>

        <div className="article-stats">
          <div className="stat">
            <div className="stat-value">{Math.round((grounding || 0) * 100)}%</div>
            <div className="stat-label">Grounding Score</div>
          </div>
          <div className="stat">
            <div className="stat-value">{facts || 0}</div>
            <div className="stat-label">Fakta</div>
          </div>
          {source && (
            <div className="stat">
              <div className="stat-value" style={{ fontSize: 'var(--text-sm)' }}>{source}</div>
              <div className="stat-label">Sumber Konten</div>
            </div>
          )}
        </div>

        {excerpt && (
          <div className="article-excerpt-section">
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)', color: 'var(--color-fg-default)' }}>
              Ringkasan
            </h3>
            <p className="article-excerpt" style={{
              fontSize: 'var(--text-base)',
              lineHeight: 'var(--leading-relaxed)',
              color: 'var(--color-fg-muted)',
              fontStyle: 'italic',
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-canvas-subtle)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--color-accent-fg)'
            }}>
              {excerpt}
            </p>
          </div>
        )}

        {content && (
          <div className="article-content-section">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 'var(--space-4)' 
            }}>
              <h3 style={{ 
                fontSize: 'var(--text-lg)', 
                fontWeight: 'var(--font-semibold)', 
                color: 'var(--color-fg-default)',
                margin: 0
              }}>
                Konten Lengkap
              </h3>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowFullTextModal(true)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--space-1)',
                  fontSize: 'var(--text-sm)'
                }}
              >
                <FileText size={16} /> Lihat Full Text
              </button>
            </div>

            {(step5?.paragraphs || step8?.paragraphs) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {Object.entries(TYPE_META).map(([type, meta]) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.border, display: 'inline-block' }} />
                      <Badge variant={meta.badge}>[{meta.label}]</Badge>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>{meta.hint}</span>
                    </div>
                  ))}
                </div>

                {(step5?.paragraphs || step8?.paragraphs || []).map((p, idx) => {
                  const type = p.type || 'CONTEXT';
                  const meta = TYPE_META[type] || TYPE_META.CONTEXT;

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: `4px solid ${meta.border}`,
                        backgroundColor: 'var(--color-canvas-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                          <Badge variant={meta.badge}>[{meta.label}]</Badge>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>{meta.hint}</span>
                          {p.source_fact_id && (
                            <Badge variant="neutral">Sumber: {p.source_fact_id}</Badge>
                          )}
                        </div>
                      </div>

                      <p style={{
                        fontSize: 'var(--text-base)',
                        lineHeight: 'var(--leading-relaxed)',
                        color: 'var(--color-fg-default)',
                        marginBottom: p.quote ? 'var(--space-3)' : 0,
                        textAlign: 'justify',
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
                })}
              </div>
            ) : (
              <div className="article-content" style={{
                fontSize: 'var(--text-base)',
                lineHeight: 'var(--leading-relaxed)',
                color: 'var(--color-fg-default)',
                whiteSpace: 'pre-wrap'
              }}>
                {content.split('\n\n').map((paragraph, idx) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;
                  
                  if (trimmed.match(/^#+\s/)) {
                    return (
                      <h4 key={idx} style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: 'var(--font-semibold)',
                        marginTop: 'var(--space-6)',
                        marginBottom: 'var(--space-3)',
                        color: 'var(--color-fg-default)'
                      }}>
                        {trimmed.replace(/^#+\s/, '')}
                      </h4>
                    );
                  }
                  
                  if (trimmed.startsWith('*"') && trimmed.endsWith('"*')) {
                    return (
                      <blockquote key={idx} style={{
                        margin: 'var(--space-4) 0',
                        padding: 'var(--space-3) var(--space-4)',
                        backgroundColor: 'var(--color-canvas-subtle)',
                        borderLeft: '4px solid var(--color-accent-fg)',
                        fontStyle: 'italic',
                        color: 'var(--color-fg-muted)'
                      }}>
                        {trimmed.replace(/^\*"|"\*$/g, '')}
                      </blockquote>
                    );
                  }
                  
                  return (
                    <p key={idx} style={{ 
                      marginBottom: 'var(--space-4)',
                      textAlign: 'justify',
                      lineHeight: '1.8'
                    }}>
                      {trimmed}
                    </p>
                  );
                })}
                
                {source === 'Draft Content' && (
                  <details style={{ marginTop: 'var(--space-6)', fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
                    <summary style={{ cursor: 'pointer', marginBottom: 'var(--space-2)' }}>Debug: Lihat raw content</summary>
                    <pre style={{ 
                      padding: 'var(--space-3)', 
                      background: 'var(--color-canvas-subtle)', 
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'auto',
                      fontSize: '11px'
                    }}>
                      {content}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {!content && (
          <div className="article-empty" style={{
            textAlign: 'center',
            padding: 'var(--space-12)',
            color: 'var(--color-fg-muted)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>📝</div>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Konten Belum Tersedia</h3>
            <p>
              {currentSession.current_step < 5 
                ? 'Artikel masih dalam tahap persiapan. Lanjutkan proses untuk melihat draft.'
                : 'Draft artikel belum dihasilkan. Silakan periksa status pipeline.'
              }
            </p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: 'var(--space-4)' }}
              onClick={handleEdit}
            >
              Lanjutkan Pengeditan
            </button>
          </div>
        )}
      </div>

      <div className="article-footer">
        <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={16} /> Kembali ke Dashboard
        </button>
        <button className="btn btn-primary" onClick={handleEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Edit2 size={16} /> Edit Naskah
        </button>
      </div>

      {showFullTextModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-4)'
        }}>
          <div style={{
            backgroundColor: 'var(--color-canvas-default)',
            borderRadius: 'var(--radius-lg)',
            width: '90vw',
            maxWidth: '800px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              padding: 'var(--space-4) var(--space-6)',
              borderBottom: '1px solid var(--color-border-default)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 'var(--text-lg)', 
                  fontWeight: 'var(--font-semibold)' 
                }}>
                  Full Text
                </h3>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  fontSize: 'var(--text-sm)', 
                  color: 'var(--color-fg-muted)' 
                }}>
                  {title}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={copyFullText}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--space-1)',
                    backgroundColor: copySuccess ? 'var(--color-success-fg)' : undefined,
                    color: copySuccess ? 'white' : undefined
                  }}
                >
                  {copySuccess ? <><Check size={16} /> Copied!</> : <><Clipboard size={16} /> Copy</>}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowFullTextModal(false)}
                  style={{ padding: '4px 8px', minWidth: 'unset' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{
              padding: 'var(--space-6)',
              overflow: 'auto',
              flexGrow: 1,
              fontSize: 'var(--text-base)',
              lineHeight: 'var(--leading-relaxed)'
            }}>
              <h2 style={{ 
                fontSize: 'var(--text-xl)', 
                fontWeight: 'var(--font-semibold)', 
                marginBottom: 'var(--space-4)',
                color: 'var(--color-fg-default)'
              }}>
                {title}
              </h2>
              
              <div style={{ 
                whiteSpace: 'pre-wrap',
                textAlign: 'justify',
                color: 'var(--color-fg-default)'
              }}>
                {getPlainText()}
              </div>

              <div style={{ 
                marginTop: 'var(--space-6)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--color-border-muted)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-fg-muted)',
                display: 'flex',
                gap: 'var(--space-4)'
              }}>
                <span>{wordCount.toLocaleString()} kata</span>
                <span>•</span>
                <span>{getPlainText().length.toLocaleString()} karakter</span>
                {grounding > 0 && (
                  <>
                    <span>•</span>
                    <span>Grounding: {Math.round(grounding * 100)}%</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
