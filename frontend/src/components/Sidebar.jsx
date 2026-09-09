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

// ── Main Component ─────────────────────────────────────────────────────────

export function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  function navTo(path) {
    navigate(path);
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
          <div className="sidebar-header">Menu Utama</div>
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

              {/* Generate Naskah berdasarkan 5W+1H (3 Slide) */}
              <li>
                <button
                  className={`pipeline-step nav-item ${isActive('/new') || isActive('/quick-news') ? 'active' : ''}`}
                  onClick={() => navTo('/new')}
                  aria-current={(isActive('/new') || isActive('/quick-news')) ? 'page' : undefined}
                >
                  <span className="nav-icon"><IconPen /></span>
                  <span className="sidebar-label">Generate Naskah berdasarkan 5W+1H</span>
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
                  <span className="sidebar-label">Riwayat Naskah</span>
                </button>
              </li>

            </ul>
          </nav>
        </div>

        {/* Footer info */}
        <div className="sidebar-footer">
          <div style={{ fontSize: '11px', color: 'var(--color-fg-muted)', padding: 'var(--space-2)' }}>
            Google News SEO 2026
            <div style={{ fontWeight: 600, color: 'var(--color-fg-default)' }}>NewsScript AI v2.0</div>
          </div>
        </div>
      </aside>
    </>
  );
}
