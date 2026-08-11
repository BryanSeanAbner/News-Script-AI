/**
 * Sidebar — Main Navigation + Pipeline Steps
 *
 * Struktur:
 *  - Main Nav: Dashboard | Buat Naskah | History
 *  - Pipeline Steps: hanya tampil ketika user berada di dalam session (/session/:id/...)
 */

import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';

// ── Icons ─────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1 1.75C1 1.336 1.336 1 1.75 1h4.5c.414 0 .75.336.75.75v4.5a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 1 6.25Zm0 7.5c0-.414.336-.75.75-.75h4.5c.414 0 .75.336.75.75v4.5a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 1 13.75Zm7.5-7.5c0-.414.336-.75.75-.75h4.5c.414 0 .75.336.75.75v4.5a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 8.5 6.25Zm0 7.5c0-.414.336-.75.75-.75h4.5c.414 0 .75.336.75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75Z"/>
    </svg>
  );
}

function IconPen() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Zm-2.262 2.262L8.726 6.19 9.5 6.963l1.44-1.44Zm-1.514 1.514-6.276 6.277-.65 2.276 2.275-.65 6.277-6.276Z"/>
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.643 3.143 .427 1.927A.25.25 0 0 0 0 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 0 0 .177-.427L2.715 4.215a6.5 6.5 0 1 1-1.18 4.458.75.75 0 1 0-1.493.154A8 8 0 1 0 1.643 3.143Zm7.644 9.357a.75.75 0 0 0 .75-.75V7.5a.75.75 0 0 0-1.5 0v4.25h-3.5a.75.75 0 0 0 0 1.5h4.25Z"/>
    </svg>
  );
}

// ── Pipeline Step Config ───────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { num: 1, label: 'Input Artikel', gate: false },
  { num: 2, label: 'Fact Extraction', gate: false },
  { num: 3, label: 'Gap Analysis', gate: false },
  { num: 4, label: 'Pilih Angle & Judul', gate: true },
  { num: 5, label: 'Draft Generation', gate: false },
  { num: 6, label: 'Grounding Check', gate: false },
  { num: 7, label: 'Editorial Review', gate: true },
  { num: 8, label: 'Publish', gate: false },
];

function getIconClass(status, isCurrent) {
  if (isCurrent) return 'active';
  if (status === 'done' || status === 'approved') return 'done';
  if (status === 'running') return 'running';
  if (status === 'error') return 'error';
  if (status === 'waiting' || status === 'revision_small' || status === 'revision_large') return 'human';
  return '';
}

function getStepClass(status, isCurrent, isGate) {
  if (isCurrent) return 'active';
  if (status === 'done' || status === 'approved') return 'done';
  if (status === 'pending' && !isCurrent) return 'disabled';
  if (isGate && (status === 'waiting' || status === 'pending')) return 'human-gate';
  return '';
}

function StepIcon({ num, iconClass }) {
  if (iconClass === 'done') return (
    <span className="step-icon done">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
        <path d="M10.28 2.28a.75.75 0 0 0-1.06 0L4.75 6.75 2.78 4.78a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l5-5a.75.75 0 0 0 0-1.06Z"/>
      </svg>
    </span>
  );
  if (iconClass === 'error') return <span className="step-icon error">!</span>;
  return <span className={`step-icon ${iconClass}`}>{num}</span>;
}

// ── Main Component ─────────────────────────────────────────────────────────

export function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const currentSession = useSessionStore(s => s.currentSession);
  const currentStep = currentSession?.current_step;

  // Deteksi apakah sedang dalam session (URL mengandung /session/:id/)
  const isInSession = /\/session\/[^/]+\/step\//.test(location.pathname);

  function navTo(path) {
    navigate(path);
    onClose?.();
  }

  function navigateToStep(step) {
    if (id) navigate(`/session/${id}/step/${step}`);
    onClose?.();
  }

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Overlay (mobile) */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Navigasi utama">

        {/* ── MAIN NAVIGATION ── */}
        <div className="sidebar-section">
          <div className="sidebar-header">Menu</div>
          <nav>
            <ul className="pipeline-steps" role="list">

              {/* Dashboard */}
              <li>
                <button
                  className={`pipeline-step nav-item ${isActive('/') ? 'active' : ''}`}
                  onClick={() => navTo('/')}
                  aria-current={isActive('/') ? 'page' : undefined}
                >
                  <span className="nav-icon"><IconDashboard /></span>
                  <span className="sidebar-label">Dashboard</span>
                </button>
              </li>

              {/* Buat Naskah */}
              <li>
                <button
                  className={`pipeline-step nav-item ${isActive('/new') || isInSession ? 'active' : ''}`}
                  onClick={() => navTo('/new')}
                  aria-current={(isActive('/new') || isInSession) ? 'page' : undefined}
                >
                  <span className="nav-icon"><IconPen /></span>
                  <span className="sidebar-label">Buat Naskah</span>
                </button>
              </li>

              {/* History */}
              <li>
                <button
                  className={`pipeline-step nav-item ${isActive('/sessions') ? 'active' : ''}`}
                  onClick={() => navTo('/sessions')}
                  aria-current={isActive('/sessions') ? 'page' : undefined}
                >
                  <span className="nav-icon"><IconHistory /></span>
                  <span className="sidebar-label">History</span>
                </button>
              </li>

            </ul>
          </nav>
        </div>

        {/* ── PIPELINE STEPS (hanya tampil saat dalam session) ── */}
        {isInSession && (
          <div className="sidebar-section sidebar-pipeline-section">
            <div className="sidebar-header">Pipeline (8 Steps)</div>
            <nav>
              <ul className="pipeline-steps" role="list">
                {PIPELINE_STEPS.map(({ num, label, gate }) => {
                  const statusKey = `step_${num}`;
                  const status = currentSession?.step_statuses?.[statusKey] ?? 'pending';
                  const isCurrent = currentStep === num;
                  const iconClass = getIconClass(status, isCurrent);
                  const stepClass = getStepClass(status, isCurrent, gate);

                  return (
                    <li key={num}>
                      <button
                        className={`pipeline-step ${stepClass}`}
                        onClick={() => navigateToStep(num)}
                        aria-current={isCurrent ? 'step' : undefined}
                        title={label}
                      >
                        <StepIcon num={num} iconClass={iconClass} />
                        <span className="sidebar-label">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        )}

        {/* ── SESSION INFO (hanya saat dalam session) ── */}
        {isInSession && currentSession && (
          <div className="sidebar-footer">
            <div className="session-info">
              <div style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-xs)', marginBottom: '4px' }}>
                Session aktif
              </div>
              <div className="session-id">{currentSession.session_id.slice(0, 8)}…</div>
              {currentSession.revision_count?.small > 0 && (
                <div style={{ marginTop: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-attention-fg)' }}>
                  Revisi kecil: {currentSession.revision_count.small}×
                </div>
              )}
            </div>
          </div>
        )}

      </aside>
    </>
  );
}
