import React from 'react';

// ── Card component ────────────────────────────────────────────────────────────
const Card = ({ title, action, children, noPad = false }) => {
  return (
    <div
      className="glass"
      style={{
        padding: noPad ? 0 : '0.85rem',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        minHeight: 0,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 10px 34px rgba(2,6,23,0.24)'
      }}
    >
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '-0.2px', margin: 0, color: 'var(--text-main)' }}>{title}</h3>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
};

export default Card;