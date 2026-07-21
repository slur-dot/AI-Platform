import React from 'react';

const StatusBadge = ({ status }) => {
  const styles = {
    pending: { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)' },
    running: { bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--running)', border: '1px solid rgba(59, 130, 246, 0.3)' },
    success: { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)' },
    failed: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.3)' },
  };

  const currentStyle = styles[status] || styles.pending;
  const isRunning = status === 'running';

  return (
    <span 
      style={{
        backgroundColor: currentStyle.bg,
        color: currentStyle.color,
        border: currentStyle.border,
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem'
      }}
    >
      {isRunning && (
        <span 
          className="animate-pulse" 
          style={{
            width: '6px',
            height: '6px',
            backgroundColor: 'var(--running)',
            borderRadius: '50%',
            display: 'inline-block'
          }}
        />
      )}
      {status}
    </span>
  );
};

export default StatusBadge;
