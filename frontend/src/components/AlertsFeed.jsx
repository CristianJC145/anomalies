import React, { useState } from 'react';

function fmt(n) {
  if (!n) return '-';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

function fmtPrice(p) {
  if (!p) return '-';
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
}

export default function AlertsFeed({ alerts }) {
  const [filter, setFilter] = useState('all');

  const filtered = alerts.filter(a => {
    if (filter === 'high') return a.multiplier >= 5;
    if (filter === 'medium') return a.multiplier >= 3 && a.multiplier < 5;
    return true;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h2 style={styles.title}>Alert History</h2>
          <span style={styles.count}>{alerts.length} total</span>
        </div>
        <div style={styles.filters}>
          {[['all', 'All'], ['high', 'High (≥5x)'], ['medium', 'Medium (3-5x)']].map(([v, l]) => (
            <button key={v} style={styles.filterBtn(filter === v)} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p>No alerts yet</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Start the bot and wait for volume spikes
          </p>
        </div>
      ) : (
        <div style={styles.feed}>
          {filtered.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert }) {
  const isHigh = alert.multiplier >= 5;
  const isMed = alert.multiplier >= 3 && alert.multiplier < 5;
  const spikeColor = isHigh ? 'var(--red)' : isMed ? 'var(--yellow)' : 'var(--accent)';
  const spikeBg = isHigh ? 'var(--red-dim)' : isMed ? 'var(--yellow-dim)' : 'var(--accent-dim)';
  const changeColor = alert.priceChange >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div style={{ ...styles.card, borderColor: `${spikeColor}33` }} className="animate-slide-in">
      <div style={{ ...styles.cardAccent, background: spikeColor }} />

      <div style={styles.cardTop}>
        <div style={styles.cardLeft}>
          <span style={styles.cardSymbol}>{alert.symbol.replace('USDT', '')}</span>
          <span style={styles.cardQuote}>USDT</span>
          <span style={{ ...styles.intervalTag, background: spikeBg, color: spikeColor }}>
            {alert.interval}
          </span>
        </div>
        <div style={styles.cardRight}>
          <div style={{ ...styles.spikeValue, color: spikeColor, background: spikeBg }}>
            {alert.multiplier.toFixed(2)}×
          </div>
        </div>
      </div>

      <div style={styles.cardBody}>
        <DataPoint label="Price" value={`$${fmtPrice(alert.price)}`} />
        <DataPoint label="24h Change" value={`${alert.priceChange >= 0 ? '+' : ''}${alert.priceChange.toFixed(2)}%`} color={changeColor} />
        {alert.candleChangePercent !== undefined && (
          <DataPoint
            label="Candle Δ"
            value={`${alert.candleChangePercent >= 0 ? '+' : ''}${alert.candleChangePercent.toFixed(2)}%`}
            color={alert.candleChangePercent >= 0 ? 'var(--green)' : 'var(--red)'}
          />
        )}
        <DataPoint label="Cur. Vol" value={`$${fmt(alert.currentVolume)}`} color="var(--yellow)" />
        <DataPoint label="Avg Vol" value={`$${fmt(alert.avgVolume)}`} />
        <DataPoint label="Candles" value={alert.candlesUsed} />
        <DataPoint label="Time" value={timeAgo(alert.timestamp)} />
      </div>
    </div>
  );
}

function DataPoint({ label, value, color }) {
  return (
    <div style={styles.dp}>
      <span style={styles.dpLabel}>{label}</span>
      <span style={{ ...styles.dpValue, color: color || 'var(--text-secondary)' }}>{value}</span>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%' },
  header: { marginBottom: 12 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' },
  count: { fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 99 },
  filters: { display: 'flex', gap: 6 },
  filterBtn: (active) => ({
    padding: '5px 12px',
    borderRadius: 7,
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: 11,
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
  }),
  feed: { display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 },
  card: {
    position: 'relative',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '12px 14px 12px 18px',
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: '10px 0 0 10px',
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardLeft: { display: 'flex', alignItems: 'center', gap: 6 },
  cardRight: {},
  cardSymbol: { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' },
  cardQuote: { fontSize: 10, color: 'var(--text-muted)' },
  intervalTag: {
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
  },
  spikeValue: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 800,
    fontSize: 20,
    padding: '2px 10px',
    borderRadius: 8,
  },
  cardBody: { display: 'flex', flexWrap: 'wrap', gap: 12 },
  dp: { display: 'flex', flexDirection: 'column', gap: 2 },
  dpLabel: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  dpValue: { fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 10,
    color: 'var(--text-secondary)',
    fontSize: 14,
  },
};
