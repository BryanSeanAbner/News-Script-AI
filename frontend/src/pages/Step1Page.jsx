/**
 * Step 1 — Editor Input Artikel
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { PageHeader, Alert, StepCard } from '../components/UI';

export default function Step1Page() {
  const navigate = useNavigate();
  const { createSession, submitArticle, isLoading, error, clearError } = useSessionStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sources, setSources] = useState([{ url: '', label: '' }]);
  const [metadata, setMetadata] = useState({ topic: '', language: 'id', notes: '' });
  const [errors, setErrors] = useState({});

  function addSource() { setSources(s => [...s, { url: '', label: '' }]); }
  function removeSource(i) { setSources(s => s.filter((_, idx) => idx !== i)); }
  function updateSource(i, field, val) {
    setSources(s => s.map((src, idx) => idx === i ? { ...src, [field]: val } : src));
  }

  function validate() {
    const e = {};
    if (!title.trim()) e.title = 'Judul wajib diisi';
    if (title.length > 300) e.title = 'Judul maksimal 300 karakter';
    if (body.trim().length < 100) e.body = 'Isi artikel minimal 100 karakter';
    if (sources.every(s => !s.url.trim())) e.sources = 'Minimal 1 sumber URL wajib diisi';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    try {
      // Buat session baru jika belum ada
      const session = await createSession();
      // Submit artikel
      const validSources = sources.filter(s => s.url.trim()).map(s => ({
        url: s.url.trim(),
        label: s.label.trim() || undefined,
      }));
      await submitArticle({ title: title.trim(), body: body.trim(), sources: validSources, metadata });
      navigate(`/session/${session.session_id}/step/2`);
    } catch (err) {
      // error sudah tersimpan di store
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Input Artikel Referensi"
        subtitle="Masukkan artikel referensi yang akan dianalisis oleh pipeline AI"
      />

      {error && <Alert type="danger">{error}</Alert>}

      <Alert type="human">
        <strong>Human Gate</strong> — Langkah ini memerlukan input manual dari editor.
        Tidak ada AI yang terlibat di tahap ini.
      </Alert>

      <form onSubmit={handleSubmit} noValidate>
        <StepCard step={1} title="Artikel Referensi" subtitle="Teks lengkap artikel yang akan menjadi dasar analisis">

          {/* Judul */}
          <div className="form-group">
            <label className="form-label form-label-required" htmlFor="article-title">
              Judul Artikel
            </label>
            <input
              id="article-title"
              type="text"
              className={`form-input ${errors.title ? 'error' : ''}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Judul artikel referensi..."
              maxLength={300}
            />
            <div className={`char-counter ${title.length > 280 ? 'warn' : ''} ${title.length > 300 ? 'over' : ''}`}>
              {title.length}/300
            </div>
            {errors.title && <div className="form-error">{errors.title}</div>}
          </div>

          {/* Isi Artikel */}
          <div className="form-group">
            <label className="form-label form-label-required" htmlFor="article-body">
              Isi Artikel
            </label>
            <textarea
              id="article-body"
              className={`form-input form-textarea ${errors.body ? 'error' : ''}`}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Paste teks lengkap artikel di sini..."
              rows={12}
            />
            <div className="char-counter">{body.length} karakter</div>
            {errors.body && <div className="form-error">{errors.body}</div>}
          </div>

          {/* Sumber */}
          <div className="form-group">
            <label className="form-label form-label-required">Sumber Artikel</label>
            {sources.map((src, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <input
                  type="url"
                  className="form-input"
                  value={src.url}
                  onChange={e => updateSource(i, 'url', e.target.value)}
                  placeholder="https://..."
                  style={{ flex: 2 }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={src.label}
                  onChange={e => updateSource(i, 'label', e.target.value)}
                  placeholder="Label (opsional)"
                  style={{ flex: 1 }}
                />
                {sources.length > 1 && (
                  <button type="button" className="btn btn-ghost" onClick={() => removeSource(i)} aria-label="Hapus sumber">
                    ✕
                  </button>
                )}
              </div>
            ))}
            {errors.sources && <div className="form-error">{errors.sources}</div>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addSource} style={{ marginTop: 'var(--space-2)' }}>
              + Tambah Sumber
            </button>
          </div>

          {/* Metadata (collapsible) */}
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-3)', userSelect: 'none' }}>
              Metadata Tambahan (opsional)
            </summary>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="meta-topic">Topik</label>
                <input
                  id="meta-topic"
                  type="text"
                  className="form-input"
                  value={metadata.topic}
                  onChange={e => setMetadata(m => ({ ...m, topic: e.target.value }))}
                  placeholder="Politik, Ekonomi, dll."
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="meta-lang">Bahasa</label>
                <select
                  id="meta-lang"
                  className="form-input form-select"
                  value={metadata.language}
                  onChange={e => setMetadata(m => ({ ...m, language: e.target.value }))}
                >
                  <option value="id">Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="meta-notes">Catatan Editor</label>
              <textarea
                id="meta-notes"
                className="form-input form-textarea"
                value={metadata.notes}
                onChange={e => setMetadata(m => ({ ...m, notes: e.target.value }))}
                placeholder="Catatan atau konteks tambahan untuk AI..."
                rows={3}
                style={{ minHeight: 'unset' }}
              />
            </div>
          </details>
        </StepCard>

        <div className="action-bar">
          <div />
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isLoading}
          >
            {isLoading ? 'Memproses...' : 'Mulai Analisis →'}
          </button>
        </div>
      </form>
    </div>
  );
}
