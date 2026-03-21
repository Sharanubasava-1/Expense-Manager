import React from 'react';

const Input = ({ label, id, type = 'text', placeholder, icon, value, onChange, required }) => {
  const supportsNativePicker = type === 'date' || type === 'month' || type === 'time' || type === 'datetime-local';
  const showLeftIcon = Boolean(icon) && !supportsNativePicker;

  return (
  <div style={{ marginBottom: '1.1rem' }}>
    {label && (
      <label
        htmlFor={id}
        style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em' }}
      >
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
    )}
    <div style={{ position: 'relative' }}>
      {showLeftIcon && (
        <span style={{
          position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none',
        }}>
          {icon}
        </span>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        style={{
          width: '100%',
          padding: showLeftIcon ? '0.75rem 0.9rem 0.75rem 2.6rem' : '0.75rem 0.9rem',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-main)',
          fontSize: '0.9rem',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--primary)';
          e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--glass-border)';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  </div>
  );
};
export default Input;