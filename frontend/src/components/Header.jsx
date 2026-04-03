import React from 'react';

export default function Header({ connected, running, stats, onStart, onStop }) {
  const lastScan = stats.lastScan
    ? new Date(stats.lastScan).toLocaleTimeString()
    : 'Never';

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <div style={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L4 8v12l10 6 10-6V8L14 2z" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
            <path d="M14 7v7l5 3" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="14" cy="14" r="2" fill="#3b82f6"/>
          </svg>
          <div>
            <h1 style={styles.title}>Volume Spike Bot</h1>
            <p style={styles.subtitle}>Binance Futures Monitor</p>
          </div>
        </div>
      </div>

      <div style={styles.center}>
        <StatPill label="Pairs" value={stats.pairsScanned} color="cyan" />
        <StatPill label="Scans" value={stats.totalScans} color="purple" />
        <StatPill label="Alerts Today" value={stats.alertsToday} color="yellow" />
        <StatPill label="Last Scan" value={lastScan} color="green" mono />
      </div>

      <div style={styles.right}>
        <div style={styles.connBadge(connected)}>
          <span style={styles.connDot(connected)} />
          {connected ? 'Connected' : 'Reconnecting...'}
        </div>

        <button
          style={styles.btn(running)}
          onClick={running ? onStop : onStart}
        >
          {running ? (
            <>
              <span style={styles.runningDot} />
              Stop Bot
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Start Bot
            </>
          )}
        </button>
      </div>
    </header>
  );
}

function StatPill({ label, value, color, mono }) {
  const colors = {
    cyan: { bg: 'var(--cyan-dim)', text: 'var(--cyan)' },
    purple: { bg: 'var(--purple-dim)', text: 'var(--purple)' },
    yellow: { bg: 'var(--yellow-dim)', text: 'var(--yellow)' },
    green: { bg: 'var(--green-dim)', text: 'var(--green)' },
  };
  const c = colors[color];
  return (
    <div style={{ ...styles.pill, background: c.bg }}>
      <span style={styles.pillLabel}>{label}</span>
      <span style={{ ...styles.pillValue, color: c.text, fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>
        {value ?? '-'}
      </span>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(12px)',
    gap: 16,
  },
  left: { display: 'flex', alignItems: 'center', minWidth: 200 },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 },
  subtitle: { fontSize: 11, color: 'var(--text-muted)', marginTop: 1 },
  center: { display: 'flex', gap: 8, flex: 1, justifyContent: 'center', flexWrap: 'wrap' },
  right: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, justifyContent: 'flex-end' },
  connBadge: (c) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: c ? 'var(--green)' : 'var(--yellow)',
    background: c ? 'var(--green-dim)' : 'var(--yellow-dim)',
    padding: '4px 10px',
    borderRadius: 99,
  }),
  connDot: (c) => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: c ? 'var(--green)' : 'var(--yellow)',
    animation: 'pulse-dot 2s infinite',
  }),
  btn: (running) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    background: running
      ? 'rgba(239,68,68,0.15)'
      : 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: running ? 'var(--red)' : '#fff',
    transition: 'all 0.2s',
    boxShadow: running ? 'none' : '0 0 16px rgba(59,130,246,0.3)',
  }),
  runningDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--red)',
    animation: 'pulse-dot 1s infinite',
  },
  pill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 8,
    minWidth: 70,
  },
  pillLabel: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  pillValue: { fontSize: 13, fontWeight: 600, marginTop: 1 },
};
