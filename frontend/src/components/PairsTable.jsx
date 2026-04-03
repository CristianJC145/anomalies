import React, { useState, useMemo } from 'react';

const SORT_OPTIONS = [
  { key: 'multiplier', label: 'Spike' },
  { key: 'volume24h', label: 'Volume 24h' },
  { key: 'priceChange', label: 'Change' },
  { key: 'symbol', label: 'Symbol' },
];

function fmt(n, decimals = 2) {
  if (n === undefined || n === null) return '-';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(decimals);
}

function fmtPrice(p) {
  if (!p) return '-';
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
}

export default function PairsTable({ pairsData, selectedPairs, running }) {
  const [sortKey, setSortKey] = useState('multiplier');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    let list = selectedPairs
      .map(sym => pairsData[sym] || { symbol: sym, loading: true })
      .filter(p => !search || p.symbol.toUpperCase().includes(search.toUpperCase()));

    list.sort((a, b) => {
      if (a.loading) return 1;
      if (b.loading) return -1;
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [pairsData, selectedPairs, sortKey, sortDir, search]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (selectedPairs.length === 0) {
    return (
      <div style={styles.empty}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
        </svg>
        <p>No pairs selected</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Select pairs in the Pair Selection tab</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.info}>
          <span style={styles.pairCount}>{selectedPairs.length} pairs</span>
          {running && <span style={styles.liveTag}><span style={styles.liveDot}/>LIVE</span>}
        </div>
        <div style={styles.sortBtns}>
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} style={styles.sortBtn(sortKey === opt.key)} onClick={() => toggleSort(opt.key)}>
              {opt.label}
              {sortKey === opt.key && <span style={{ fontSize: 10, marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>
        <div style={styles.searchWrap}>
          <svg style={styles.searchIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            style={styles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter..."
          />
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <Th>Pair</Th>
              <Th align="right">Price</Th>
              <Th align="right">24h %</Th>
              <Th align="right">Vol 24h</Th>
              <Th align="right">Cur. Vol</Th>
              <Th align="right">Avg Vol</Th>
              <Th align="right">Spike</Th>
              <Th align="center">Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => <PairRow key={p.symbol} pair={p} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PairRow({ pair }) {
  if (pair.loading) {
    return (
      <tr style={styles.row(false)}>
        <td style={styles.td}><span style={styles.symbol}>{pair.symbol}</span></td>
        {[...Array(7)].map((_, i) => (
          <td key={i} style={{ ...styles.td, textAlign: 'right' }}>
            <div style={styles.skeleton} />
          </td>
        ))}
      </tr>
    );
  }

  const isSpike = pair.isSpike;
  const changeColor = pair.priceChange > 0 ? 'var(--green)' : pair.priceChange < 0 ? 'var(--red)' : 'var(--text-muted)';
  const spikeColor = pair.multiplier >= 5 ? 'var(--red)' : pair.multiplier >= 3 ? 'var(--yellow)' : 'var(--text-secondary)';

  return (
    <tr style={styles.row(isSpike)} className={isSpike ? 'spike-row' : ''}>
      <td style={styles.td}>
        <div style={styles.symbolCell}>
          {isSpike && <span style={styles.spikeDot} />}
          <span style={styles.symbol}>{pair.symbol.replace('USDT', '')}</span>
          <span style={styles.quoteLabel}>USDT</span>
        </div>
      </td>
      <td style={{ ...styles.td, textAlign: 'right' }}>
        <span style={styles.price}>${fmtPrice(pair.price)}</span>
      </td>
      <td style={{ ...styles.td, textAlign: 'right' }}>
        <span style={{ color: changeColor, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
          {pair.priceChange >= 0 ? '+' : ''}{pair.priceChange?.toFixed(2)}%
        </span>
      </td>
      <td style={{ ...styles.td, textAlign: 'right' }}>
        <span style={styles.volNum}>${fmt(pair.volume24h)}</span>
      </td>
      <td style={{ ...styles.td, textAlign: 'right' }}>
        <span style={{ ...styles.volNum, color: isSpike ? 'var(--yellow)' : 'var(--text-secondary)' }}>
          ${fmt(pair.currentVolume)}
        </span>
      </td>
      <td style={{ ...styles.td, textAlign: 'right' }}>
        <span style={styles.volNum}>${fmt(pair.avgVolume)}</span>
      </td>
      <td style={{ ...styles.td, textAlign: 'right' }}>
        <span style={{ color: spikeColor, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>
          {pair.multiplier?.toFixed(2)}x
        </span>
      </td>
      <td style={{ ...styles.td, textAlign: 'center' }}>
        {isSpike ? (
          <span style={styles.spikeBadge}>SPIKE</span>
        ) : (
          <span style={styles.normalBadge}>Normal</span>
        )}
      </td>
    </tr>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th style={{ ...styles.th, textAlign: align }}>{children}</th>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%' },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  info: { display: 'flex', alignItems: 'center', gap: 8 },
  pairCount: { fontSize: 13, color: 'var(--text-muted)' },
  liveTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--green)',
    background: 'var(--green-dim)',
    padding: '2px 8px',
    borderRadius: 99,
  },
  liveDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--green)',
    animation: 'pulse-dot 1.5s infinite',
  },
  sortBtns: { display: 'flex', gap: 4, flex: 1 },
  sortBtn: (active) => ({
    padding: '4px 10px',
    borderRadius: 6,
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: 11,
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
  }),
  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: 8, color: 'var(--text-muted)', pointerEvents: 'none' },
  searchInput: {
    padding: '5px 10px 5px 26px',
    borderRadius: 7,
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
    width: 130,
    fontFamily: 'var(--font-mono)',
  },
  tableWrap: { overflow: 'auto', flex: 1, borderRadius: 10, border: '1px solid var(--border)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    whiteSpace: 'nowrap',
  },
  row: (spike) => ({
    background: spike ? 'rgba(245,158,11,0.04)' : 'transparent',
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.2s',
  }),
  td: { padding: '9px 12px', verticalAlign: 'middle' },
  symbolCell: { display: 'flex', alignItems: 'center', gap: 6 },
  spikeDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--yellow)',
    flexShrink: 0,
    animation: 'pulse-dot 1s infinite',
  },
  symbol: { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' },
  quoteLabel: { fontSize: 10, color: 'var(--text-muted)' },
  price: { fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)' },
  volNum: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' },
  spikeBadge: {
    padding: '2px 8px',
    borderRadius: 99,
    background: 'rgba(245,158,11,0.15)',
    border: '1px solid rgba(245,158,11,0.4)',
    color: 'var(--yellow)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  normalBadge: {
    padding: '2px 8px',
    borderRadius: 99,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: 10,
  },
  skeleton: {
    height: 14,
    width: '60%',
    marginLeft: 'auto',
    borderRadius: 4,
    background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-hover) 50%, var(--bg-elevated) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    gap: 12,
    color: 'var(--text-secondary)',
    fontSize: 15,
  },
};
