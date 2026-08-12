/**
 * Step 4 — Editor Pilih Angle & Judul Artikel [HUMAN GATE]
 * Editor memilih angle dari Step 3, AI Groq langsung men-generate rekomendasi judul, dan editor memilih judul final.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { PageHeader, Alert, Badge, Spinner } from '../components/UI';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function Step5Page() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    loadSession,
    selectAngleAndGenerateTitle,
    selectTitle,
    currentSession,
    isLoading,
    isRunning,
    error,
    clearError,
    getStepData
  } = useSessionStore();

  const [selectedAngleId, setSelectedAngleId] = useState(null);
  const [selectedTitleId, setSelectedTitleId] = useState(null);
  const [customTitle, setCustomTitle] = useState('');
  const [useCustomTitle, setUseCustomTitle] = useState(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  useEffect(() => {
    loadSession(id).catch(() => navigate('/sessions'));
  }, [id]);

  const step3Data = getStepData(3);  // Gap Analysis & Angles
  const step4Data = getStepData(4);  // Selected Angle & Titles
  const angles = step3Data?.angles || [];

  useEffect(() => {
    if (step4Data?.selected_angle_id) {
      setSelectedAngleId(step4Data.selected_angle_id);
    }
    if (step4Data?.titles && step4Data.titles.length > 0 && !selectedTitleId) {
      setSelectedTitleId(step4Data.titles[0].id);
    }
    if (step4Data?.selected_title) {
      const match = step4Data.titles?.find(t => t.text === step4Data.selected_title);
      if (match) {
        setSelectedTitleId(match.id);
      } else {
        setUseCustomTitle(true);
        setCustomTitle(step4Data.selected_title);
      }
    }
  }, [currentSession]);

  async function handleSelectAngle(angleId) {
    setSelectedAngleId(angleId);
    setSelectedTitleId(null);
    clearError();
    setIsGeneratingTitles(true);
    try {
      await selectAngleAndGenerateTitle(angleId);
    } catch (e) {
      // Error in store
    } finally {
      setIsGeneratingTitles(false);
    }
  }

  async function handleConfirmAll() {
    if (!selectedAngleId) return;
    if (!useCustomTitle && !selectedTitleId) return;
    if (useCustomTitle && !customTitle.trim()) return;

    clearError();
    try {
      await selectTitle(
        useCustomTitle ? null : selectedTitleId,
        useCustomTitle ? customTitle.trim() : null
      );
      navigate(`/session/${id}/step/5`); // Lanjut ke Step 5 (Draft Generation)
    } catch (e) {
      // Error in store
    }
  }

  const titles = step4Data?.titles || [];

  return (
    <div className="page-container">
      <PageHeader
        title="Pilih Angle & Judul Berita"
        subtitle="Step 4: Pilih angle berita terbaik, lalu tentukan rekomendasi judul yang dihasilkan Groq AI."
      />

      <Alert type="human">
        <strong>Human Gate (Step 4)</strong> — Pilih angle untuk men-generate opsi judul, lalu pilih judul atau tulis judul kustom Anda.
      </Alert>

      {error && <Alert type="danger">{error}</Alert>}

      {/* SECTION 1: PILIH ANGLE */}
      <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>
        1. Pilih Angle Berita ({angles.length} opsi dipetakan)
      </h3>

      <div className="angle-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {angles.map((angle, i) => {
          const isSelected = selectedAngleId === angle.id;
          return (
            <div
              key={angle.id}
              className={`angle-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelectAngle(angle.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleSelectAngle(angle.id)}
              aria-pressed={isSelected}
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--color-accent-fg)' : undefined,
                boxShadow: isSelected ? '0 0 0 2px var(--color-accent-fg)' : undefined
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <Badge variant={isSelected ? 'accent' : 'info'}>Angle {i + 1}</Badge>
                <Badge variant="neutral">{angle.angle_type}</Badge>
                <Badge variant="neutral">{angle.tone}</Badge>
              </div>

              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)', lineHeight: 'var(--leading-tight)' }}>
                {angle.angle_title}
              </h2>

              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-fg-muted)', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-4)' }}>
                <em>"{angle.angle_hook}"</em>
              </p>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-subtle)', margin: 'var(--space-3) 0' }} />

              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-subtle)' }}>
                <div>Target: {angle.target_audience}</div>
                <div>~{angle.estimated_word_count?.toLocaleString()} kata</div>
                <div>{angle.supporting_fact_ids?.length} fakta digunakan</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 2: REKOMENDASI JUDUL (GROQ) */}
      {selectedAngleId && (
        <div style={{
          backgroundColor: 'var(--color-canvas-subtle)',
          padding: 'var(--space-5)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-muted)',
          marginBottom: 'var(--space-6)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                2. Opsi Judul Artikel (Dihasilkan Groq AI)
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
                Rekomendasi judul SEO disesuaikan dengan angle yang Anda pilih di atas.
              </p>
            </div>
            {isGeneratingTitles && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-accent-fg)' }}>
                <Spinner size="sm" /> Generasi rekomendasi judul...
              </div>
            )}
          </div>

          {isGeneratingTitles && titles.length === 0 ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <Spinner size="md" />
              <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-fg-muted)', fontSize: 'var(--text-sm)' }}>
                Groq AI (Llama 3.3 70B) sedang meracik 5 variasi judul artikel terbaik...
              </p>
            </div>
          ) : titles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {titles.map(t => {
                const isSelected = !useCustomTitle && selectedTitleId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setUseCustomTitle(false);
                      setSelectedTitleId(t.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isSelected ? 'var(--color-accent-fg)' : 'var(--color-border-default)'}`,
                      backgroundColor: isSelected ? 'var(--color-accent-subtle)' : 'var(--color-canvas-default)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="title_selection"
                      checked={isSelected}
                      onChange={() => {
                        setUseCustomTitle(false);
                        setSelectedTitleId(t.id);
                      }}
                      style={{ marginTop: '4px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-base)', color: 'var(--color-fg-default)' }}>
                        {t.text}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
                        <span style={{ color: 'var(--color-success-fg)', fontWeight: 'var(--font-medium)' }}>
                          SEO Score: {Math.round((t.seo_score || 0.85) * 100)}%
                        </span>
                        <span>Style: {t.style}</span>
                        <span>{t.char_count} karakter</span>
                      </div>
                      {t.notes && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-subtle)', marginTop: '4px', fontStyle: 'italic' }}>
                          "{t.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* CUSTOM TITLE */}
              <div
                onClick={() => setUseCustomTitle(true)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${useCustomTitle ? 'var(--color-accent-fg)' : 'var(--color-border-default)'}`,
                  backgroundColor: useCustomTitle ? 'var(--color-accent-subtle)' : 'var(--color-canvas-default)',
                  cursor: 'pointer',
                  marginTop: 'var(--space-2)'
                }}
              >
                <input
                  type="radio"
                  name="title_selection"
                  checked={useCustomTitle}
                  onChange={() => setUseCustomTitle(true)}
                  style={{ marginTop: '10px' }}
                />
                <div style={{ flex: 1 }}>
                  <label style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)', display: 'block', marginBottom: 'var(--space-2)' }}>
                    Tulis Judul Kustom Sendiri
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ketik judul artikel berita versi Anda sendiri..."
                    value={customTitle}
                    onChange={e => {
                      setCustomTitle(e.target.value);
                      setUseCustomTitle(true);
                    }}
                    onFocus={() => setUseCustomTitle(true)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--color-fg-muted)', fontSize: 'var(--text-sm)' }}>
              Klik salah satu angle di atas untuk mendapatkan rekomendasi judul.
            </p>
          )}
        </div>
      )}

      {/* ACTION BAR */}
      <div className="action-bar" style={{ marginTop: 'var(--space-6)' }}>
        <button className="btn btn-secondary" onClick={() => navigate(`/session/${id}/step/3`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={16} /> Kembali ke Step 3
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleConfirmAll}
          disabled={!selectedAngleId || (useCustomTitle ? !customTitle.trim() : !selectedTitleId) || isGeneratingTitles || isLoading || isRunning}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          {isLoading || isRunning ? 'Menyimpan...' : <><span>Lanjut ke Step 5: Draft Generation</span> <ArrowRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}
