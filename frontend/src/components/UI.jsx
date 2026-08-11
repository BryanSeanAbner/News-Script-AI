// Shared UI components

// ── Badge ──────────────────────────────────────────────────────────────────
export function Badge({ variant = 'neutral', children }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

// ── Step Badge (nomor step) ────────────────────────────────────────────────
export function StepBadge({ step, total = 10 }) {
  return <span className="step-badge">Step {step} / {total}</span>;
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = '' }) {
  return <span className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} aria-label="Memuat..." />;
}

// ── Alert Banner ───────────────────────────────────────────────────────────
const alertIcons = {
  info:    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Zm0 3.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm0 2.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 8.25Z"/></svg>,
  success: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm3.78 4.22a.75.75 0 0 0-1.06 0L7 8.94 5.28 7.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4-4a.75.75 0 0 0 0-1.06Z"/></svg>,
  warning: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8.22 1.754a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-.25-5.25a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0Z"/></svg>,
  danger:  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>,
  human:   <svg viewBox="0 0 16 16" fill="currentColor"><path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"/></svg>,
};

export function Alert({ type = 'info', children }) {
  return (
    <div className={`alert alert-${type}`} role="alert">
      {alertIcons[type]}
      <div>{children}</div>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function StepCard({ step, title, subtitle, badge, badgeVariant, footer, children }) {
  return (
    <div className="card step-card">
      <div className="card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <StepBadge step={step} />
            {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
          </div>
          <div className="card-title">{title}</div>
          {subtitle && <div className="card-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// ── Grounding Score Bar ────────────────────────────────────────────────────
export function GroundingScoreBar({ score, status }) {
  const pct = Math.round((score || 0) * 100);
  const fillClass = status === 'PASS' ? 'pass' : status === 'WARN' ? 'warn' : 'fail';
  const badgeVariant = status === 'PASS' ? 'pass' : status === 'WARN' ? 'warn' : 'fail';

  return (
    <div className="score-bar-container">
      <div className="score-bar-label">
        <span>Grounding Score</span>
        <Badge variant={badgeVariant}>{pct}% — {status}</Badge>
      </div>
      <div className="score-bar-track">
        <div
          className={`score-bar-fill ${fillClass}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// ── Page Header ────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-top">
        <h1 className="page-title">{title}</h1>
        {actions && <div style={{ display: 'flex', gap: 'var(--space-2)' }}>{actions}</div>}
      </div>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  );
}

// ── Fact Item ──────────────────────────────────────────────────────────────
const categoryColors = {
  who: 'info', what: 'neutral', when: 'warn', where: 'neutral',
  why: 'human', how: 'neutral', statistic: 'pass', quote: 'neutral',
};

export function FactItem({ fact }) {
  return (
    <div className="fact-item">
      <div className="fact-item-header">
        <span className="fact-id">{fact.id}</span>
        <Badge variant={categoryColors[fact.category] || 'neutral'}>{fact.category}</Badge>
      </div>
      <div className="fact-claim">{fact.claim}</div>
      {fact.source_sentence && (
        <div className="fact-source">"{fact.source_sentence}"</div>
      )}
    </div>
  );
}

// ── Running State Block ────────────────────────────────────────────────────
export function RunningState({ model, message = 'Memproses...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-6)', color: 'var(--color-fg-muted)' }}>
      <Spinner />
      <div>
        <div style={{ fontWeight: 'var(--font-medium)', color: 'var(--color-fg-default)' }}>{message}</div>
        {model && <div style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>Model: {model}</div>}
      </div>
    </div>
  );
}
