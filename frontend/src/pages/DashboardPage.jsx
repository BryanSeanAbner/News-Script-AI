/**
 * DashboardPage â€” Landing page utama
 * Menampilkan statistik naskah dan daftar artikel yang telah dipublish
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { Badge, Spinner } from '../components/UI';

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.748 1.748 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/>
    </svg>
  );
}

function ConfirmModal({ isOpen, title, children, onConfirm, onCancel, confirmText = 'Hapus', isDestructive = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel} aria-label="Tutup">Ã—</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>
            Batal
          </button>
          <button 
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ session, onClick, onDelete }) {
  const step8 = session?.data?.step_8;
  const step1 = session?.data?.step_1;
  const step4 = session?.data?.step_4;
  const step6 = session?.data?.step_6;
  
  // Logic judul berdasarkan status
  const title = session.status === 'completed' 
    ? (step4?.selected_title || step6?.selected_title || step1?.title || 'Tanpa Judul')
    : (step1?.title || 'Tanpa Judul');
    
  const topic = step1?.metadata?.topic || step8?.publication_meta?.topic || '';
  const excerpt = step8?.article?.excerpt || '';
  const wordCount = step8?.article?.word_count || 0;
  const grounding = step8?.pipeline_summary?.final_grounding_score || 0;
  const facts = step8?.pipeline_summary?.total_facts_extracted || 0;
  const publishedAt = step8?.published_at || session?.updated_at;

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(session);
  };

  return (
    <div
      className="article-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="article-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="article-card-title">{title}</h3>
          {topic && (
            <div style={{ marginTop: 'var(--space-1)' }}>
              <Badge variant="neutral" style={{ fontSize: 'var(--text-xs)' }}>
                📌 {topic}
              </Badge>
            </div>
          )}
        </div>
        <div className="article-card-actions">
          <Badge variant={session.status === 'completed' ? 'pass' : session.status === 'in_progress' ? 'info' : 'neutral'}>
            {session.status === 'completed' ? 'Dipublish' : session.status === 'in_progress' ? 'Draft' : 'Pending'}
          </Badge>
          <button
            className="btn btn-ghost btn-sm article-delete-btn"
            onClick={handleDelete}
            title="Hapus naskah"
            aria-label="Hapus naskah"
          >
            <DeleteIcon />
          </button>
        </div>
      </div>
      {excerpt && (
        <p className="article-card-excerpt">{excerpt}</p>
      )}
      <div className="article-card-meta">
        {wordCount > 0 && <span>{wordCount.toLocaleString()} kata</span>}
        {grounding > 0 && (
          <span style={{ color: 'var(--color-success-fg)' }}>
            Grounding {Math.round(grounding * 100)}%
          </span>
        )}
        {facts > 0 && <span>{facts} fakta</span>}
        {publishedAt && (
          <span>{new Date(publishedAt).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
          })}</span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { listSessions, sessions, isLoading, deleteSession } = useSessionStore();
  const [filter, setFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, session: null });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    listSessions();
  }, []);

  const total = sessions.length;
  const published = sessions.filter(s => s.status === 'completed').length;
  const inProgress = sessions.filter(s => s.status === 'in_progress' || s.status === 'draft').length;

  // Ambil session yang statusnya completed untuk artikel cards
  // Diurutkan berdasarkan updated_at terbaru
  const publishedSessions = sessions
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const filteredSessions = filter === 'published'
    ? sessions.filter(s => s.status === 'completed')
    : filter === 'in_progress'
    ? sessions.filter(s => s.status === 'in_progress' || s.status === 'draft')
    : sessions;

  const lastCreated = sessions.length > 0
    ? new Date(Math.max(...sessions.map(s => new Date(s.created_at)))).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handleDeleteClick = (session) => {
    setDeleteModal({ isOpen: true, session });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.session) return;
    
    setIsDeleting(true);
    try {
      await deleteSession(deleteModal.session.session_id);
      setDeleteModal({ isOpen: false, session: null });
    } catch (error) {
      console.error('Error deleting session:', error);
      // Error sudah di-handle di store
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, session: null });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Selamat datang di NewsScript AI â€” platform jurnalisme berbantuan AI</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/new')}
        >
          + Buat Naskah Baru
        </button>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard
          icon="ðŸ“„"
          label="Total Naskah"
          value={isLoading ? 'â€”' : total}
          sub={lastCreated ? `Terakhir: ${lastCreated}` : 'Belum ada naskah'}
        />
        <StatCard
          icon="âœ…"
          label="Dipublish"
          value={isLoading ? 'â€”' : published}
          sub={total > 0 ? `${Math.round((published / total) * 100)}% dari total` : 'â€”'}
        />
        <StatCard
          icon="âš™ï¸"
          label="Sedang Diproses"
          value={isLoading ? 'â€”' : inProgress}
          sub={inProgress > 0 ? 'Lanjutkan pengerjaan' : 'Tidak ada draft aktif'}
        />
      </div>

      {/* Recent Articles */}
      <div className="section-header">
        <h2 className="section-title">Naskah Terbaru</h2>
        <div className="filter-tabs">
          {[['all', 'Semua'], ['published', 'Dipublish'], ['in_progress', 'Draft']].map(([val, label]) => (
            <button
              key={val}
              className={`filter-tab ${filter === val ? 'active' : ''}`}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="dashboard-empty">
          <div className="dashboard-empty-icon">ðŸ“°</div>
          <h3>Belum ada naskah</h3>
          <p>Mulai buat naskah pertama Anda dengan pipeline AI kami</p>
          <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => navigate('/new')}>
            + Buat Naskah Pertama
          </button>
        </div>
      ) : (
        <div className="articles-grid">
          {filteredSessions.map(session => (
            <ArticleCard
              key={session.session_id}
              session={session}
              onClick={() => navigate(`/article/${session.session_id}`)}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Quick Actions (hanya jika ada draft in-progress) */}
      {inProgress > 0 && (
        <div className="quick-actions-banner">
          <div>
            <strong>{inProgress} naskah</strong> masih dalam proses pengerjaan
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setFilter('in_progress');
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }}
          >
            Lihat Draft â†’
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Hapus Naskah"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText={isDeleting ? 'Menghapus...' : 'Hapus'}
        isDestructive={true}
      >
        <p>
          Apakah Anda yakin ingin menghapus naskah <strong>"{
            deleteModal.session?.data?.step_4?.selected_title || 
            deleteModal.session?.data?.step_6?.selected_title || 
            deleteModal.session?.data?.step_1?.title || 
            'Tanpa Judul'
          }"</strong>?
        </p>
        <p style={{ color: 'var(--color-danger-fg)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
          Tindakan ini tidak dapat dibatalkan.
        </p>
      </ConfirmModal>
    </div>
  );
}

