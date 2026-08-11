/**
 * SessionsPage — History semua session (archive)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { PageHeader, Badge, Spinner } from '../components/UI';

const statusConfig = {
  draft: { label: 'Draft', variant: 'neutral' },
  in_progress: { label: 'In Progress', variant: 'info' },
  waiting_human: { label: 'Menunggu Review', variant: 'human' },
  completed: { label: 'Selesai', variant: 'pass' },
  failed: { label: 'Error', variant: 'fail' },
  archived: { label: 'Diarsipkan', variant: 'neutral' },
};

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.748 1.748 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/>
    </svg>
  );
}

function ConfirmModal({ isOpen, title, children, onConfirm, onCancel, confirmText = 'Hapus', isDestructive = false, isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel} aria-label="Tutup" disabled={isLoading}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel} disabled={isLoading}>
            Batal
          </button>
          <button 
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Menghapus...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const { listSessions, sessions, isLoading, error, deleteSession } = useSessionStore();
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, session: null });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { listSessions(); }, []);

  const handleDeleteClick = (e, session) => {
    e.stopPropagation();
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
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, session: null });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="History"
        subtitle="Daftar semua session pipeline yang pernah dibuat"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/new')}>
            + Buat Naskah Baru
          </button>
        }
      />

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/>
          </svg>
          <h3>Belum ada history session</h3>
          <p>Mulai dengan membuat naskah pertama Anda</p>
          <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => navigate('/new')}>
            + Buat Naskah Pertama
          </button>
        </div>
      )}

      {sessions.map(session => {
        const sc = statusConfig[session.status] || statusConfig.draft;
        const step1 = session?.data?.step_1;
        const step4 = session?.data?.step_4;
        const step6 = session?.data?.step_6;
        
        // Logic judul berdasarkan status:
        // - Published: gunakan judul yang dipilih (step_4 atau step_6)
        // - Draft: gunakan judul input awal (step_1)
        const title = session.status === 'completed' 
          ? (step4?.selected_title || step6?.selected_title || step1?.title || 'Tanpa Judul')
          : (step1?.title || 'Tanpa Judul');
        
        return (
          <div
            key={session.session_id}
            className="card session-card"
            style={{ marginBottom: 'var(--space-3)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onClick={() => navigate(`/session/${session.session_id}/step/${session.current_step}`)}
            onMouseOver={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
            onMouseOut={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
          >
            <div className="card-body" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {title}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)', display: 'flex', gap: 'var(--space-3)' }}>
                  <span>ID: {session.session_id.slice(0, 8)}</span>
                  <span>Step {session.current_step}/10</span>
                  <span>{new Date(session.updated_at).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Badge variant={sc.variant}>{sc.label}</Badge>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => handleDeleteClick(e, session)}
                  title="Hapus session"
                  aria-label="Hapus session"
                >
                  <DeleteIcon />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Hapus Session"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Hapus"
        isDestructive={true}
        isLoading={isDeleting}
      >
        <p>
          Apakah Anda yakin ingin menghapus session <strong>"{
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
