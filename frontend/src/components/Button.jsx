import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  icon,
  type = 'button',
  onClick,
  disabled,
  className,
  style,
  ...rest
}) => {
  const sizes = {
    sm: { padding: '0.52rem 1rem',  fontSize: '0.8rem'  },
    md: { padding: '0.74rem 1.35rem', fontSize: '0.9rem' },
    lg: { padding: '0.92rem 2rem',  fontSize: '1rem'    },
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
      color: 'white',
      boxShadow: '0 8px 24px rgba(59,130,246,0.28)',
      border: 'none',
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.05)',
      color: 'var(--text-main)',
      border: '1px solid var(--glass-border)',
      boxShadow: 'none',
    },
    accent: {
      background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
      color: 'white',
      boxShadow: '0 8px 24px rgba(139,92,246,0.28)',
      border: 'none',
    },
    danger: {
      background: 'linear-gradient(135deg, var(--danger), #dc2626)',
      color: 'white',
      boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-muted)',
      border: 'none',
      boxShadow: 'none',
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.45rem',
        borderRadius: 'var(--radius-md)',
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        width: fullWidth ? '100%' : 'auto',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
      onMouseOver={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseOut={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(0)'; }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(0) scale(0.99)'; }}
      onMouseUp={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onFocus={e => { if (!disabled) e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.28), ' + (variants[variant]?.boxShadow || 'none'); }}
      onBlur={e => { if (!disabled) e.currentTarget.style.boxShadow = variants[variant]?.boxShadow || 'none'; }}
      {...rest}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;