import React, { useState } from 'react';
import { useBot } from './hooks/useBot';
import Header from './components/Header';
import BotConfig from './components/BotConfig';
import PairSelector from './components/PairSelector';
import PairsTable from './components/PairsTable';
import AlertsFeed from './components/AlertsFeed';

const TABS = [
  { id: 'monitor', label: 'Monitor', icon: '📊' },
  { id: 'pairs', label: 'Pairs', icon: '🔍' },
  { id: 'config', label: 'Config', icon: '⚙️' },
  { id: 'alerts', label: 'Alerts', icon: '🔔' },
];

export default function App() {
  const [tab, setTab] = useState('monitor');
  const [startError, setStartError] = useState(null);

  const {
    config, running, pairsData, alerts, stats,
    connected, updateConfig, startBot, stopBot,
  } = useBot();

  const handleStart = async () => {
    setStartError(null);
    const result = await startBot();
    if (!result.success) {
      setStartError(result.error);
      setTimeout(() => setStartError(null), 4000);
    }
  };

  const alertCount = alerts.length;
  const spikeCount = Object.values(pairsData).filter(p => p.isSpike).length;

  return (
    <div style={styles.app}>
      <Header
        connected={connected}
        running={running}
        stats={stats}
        onStart={handleStart}
        onStop={stopBot}
      />

      {startError && (
        <div style={styles.errorBanner}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {startError}
        </div>
      )}

      <div style={styles.layout}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <nav style={styles.nav}>
            {TABS.map(t => (
              <button
                key={t.id}
                style={styles.navBtn(tab === t.id)}
                onClick={() => setTab(t.id)}
              >
                <span style={styles.navIcon}>{t.icon}</span>
                <span>{t.label}</span>
                {t.id === 'alerts' && alertCount > 0 && (
                  <span style={styles.badge}>{alertCount > 99 ? '99+' : alertCount}</span>
                )}
                {t.id === 'monitor' && spikeCount > 0 && (
                  <span style={{ ...styles.badge, background: 'var(--yellow)', color: '#000' }}>
                    {spikeCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Spike Activity */}
          {spikeCount > 0 && (
            <div style={styles.spikeBox}>
              <div style={styles.spikeBoxTitle}>
                <span style={styles.spikeDotAnim} />
                Active Spikes
              </div>
              {Object.values(pairsData)
                .filter(p => p.isSpike)
                .sort((a, b) => b.multiplier - a.multiplier)
                .slice(0, 5)
                .map(p => (
                  <div key={p.symbol} style={styles.spikeItem}>
                    <span style={styles.spikeSymbol}>{p.symbol.replace('USDT', '')}</span>
                    <span style={styles.spikeMulti}>{p.multiplier.toFixed(1)}×</span>
                  </div>
                ))}
            </div>
          )}

          {/* Bot Status */}
          <div style={styles.statusBox}>
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Status</span>
              <span style={styles.statusVal(running)}>
                <span style={styles.statusDot(running)} />
                {running ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Interval</span>
              <span style={styles.statusMono}>{config.interval}</span>
            </div>
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Trigger</span>
              <span style={styles.statusMono}>{config.volumeMultiplier}×</span>
            </div>
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Pairs</span>
              <span style={styles.statusMono}>{config.selectedPairs.length}</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main style={styles.main}>
          {tab === 'monitor' && (
            <PairsTable
              pairsData={pairsData}
              selectedPairs={config.selectedPairs}
              running={running}
            />
          )}
          {tab === 'pairs' && (
            <PairSelector
              selectedPairs={config.selectedPairs}
              onUpdate={updateConfig}
            />
          )}
          {tab === 'config' && (
            <BotConfig config={config} onUpdate={updateConfig} />
          )}
          {tab === 'alerts' && (
            <AlertsFeed alerts={alerts} />
          )}
        </main>
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'var(--bg-base)',
    overflow: 'hidden',
  },
  layout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: 200,
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 8px',
    gap: 8,
    overflowY: 'auto',
    flexShrink: 0,
  },
  nav: { display: 'flex', flexDirection: 'column', gap: 2 },
  navBtn: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    background: active
      ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))'
      : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
    position: 'relative',
  }),
  navIcon: { fontSize: 15 },
  badge: {
    marginLeft: 'auto',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 99,
    minWidth: 18,
    textAlign: 'center',
  },
  main: {
    flex: 1,
    padding: 20,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--red-dim)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: 'var(--red)',
    padding: '8px 20px',
    fontSize: 13,
  },
  spikeBox: {
    background: 'rgba(245,158,11,0.05)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: 10,
    padding: '10px 12px',
  },
  spikeBoxTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--yellow)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 8,
  },
  spikeDotAnim: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--yellow)',
    animation: 'pulse-dot 1s infinite',
  },
  spikeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    borderBottom: '1px solid rgba(245,158,11,0.1)',
  },
  spikeSymbol: { fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' },
  spikeMulti: { fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--yellow)' },
  statusBox: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 12px',
    marginTop: 'auto',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  statusLabel: { fontSize: 11, color: 'var(--text-muted)' },
  statusVal: (r) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    color: r ? 'var(--green)' : 'var(--text-muted)',
  }),
  statusDot: (r) => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: r ? 'var(--green)' : 'var(--text-muted)',
    animation: r ? 'pulse-dot 2s infinite' : 'none',
  }),
  statusMono: { fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)', fontWeight: 600 },
};
