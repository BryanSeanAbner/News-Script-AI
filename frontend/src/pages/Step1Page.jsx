/**
 * Step 1 � Editor Input Artikel (Simplified)
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
  const [topic, setTopic] = useState('');
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!title.trim()) e.title = 'Judul wajib diisi';
    if (title.length > 300) e.title = 'Judul maksimal 300 karakter';
    if (body.trim().length < 100) e.body = 'Isi artikel minimal 100 karakter';
    if (!topic.trim()) e.topic = 'Topik wajib diisi';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    try {
      const session = await createSession();
      await submitArticle({ 
        title: title.trim(), 
        body: body.trim(), 
        sources: [],
        metadata: { topic: topic.trim() }
      });
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
        <strong>Human Gate</strong> � Langkah ini memerlukan input manual dari editor.
        Tidak ada AI yang terlibat di tahap ini.
      </Alert>

      <form onSubmit={handleSubmit} noValidate>
        <StepCard step={1} title="Artikel Referensi" subtitle="Teks lengkap artikel yang akan menjadi dasar analisis">

          {/* Topik */}
          <div className="form-group">
            <label className="form-label form-label-required" htmlFor="article-topic">
              Topik
            </label>
            <input
              id="article-topic"
              type="text"
              className={`form-input ${errors.topic ? 'error' : ''}`}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Politik, Ekonomi, Teknologi, dll."
              maxLength={100}
            />
            {errors.topic && <div className="form-error">{errors.topic}</div>}
          </div>

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

        </StepCard>

        <div className="action-bar">
          <div />
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isLoading}
          >
            {isLoading ? 'Memproses...' : 'Mulai Analisis'}
          </button>
        </div>
      </form>
    </div>
  );
}
