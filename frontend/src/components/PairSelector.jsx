import React, { useState, useMemo, useEffect, useCallback } from 'react';

const SORT_COLS = [
  { key: 'quoteVolume', label: 'Volume 24h' },
  { key: 'lastPrice',   label: 'Price' },
  { key: 'priceChangePercent', label: 'Change %' },
  { key: 'symbol',      label: 'Symbol' },
];

function fmtVol(n) {
  if (!n) return '-';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtPrice(p) {
  if (!p) return '-';
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1)     return p.toFixed(2);
  if (p >= 0.01)  return p.toFixed(4);
  return p.toFixed(6);
}

function VolumeBar({ value, max }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct > 66 ? 'var(--accent)' : pct > 33 ? 'var(--cyan)' : 'var(--purple)';
  return (
    <div style={barStyles.wrap}>
      <div style={{ ...barStyles.fill, width: `${pct}%`, background: color }} />
    </div>
  );
}
const barStyles = {
  wrap: { height: 3, background: 'var(--bg-elevated)', borderRadius: 99, width: 80, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99, transition: 'width 0.3s' },
};

export default function PairSelector({ selectedPairs, onUpdate }) {
  const [pairs, setPairs]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');
  const [sortKey, setSortKey]     = useState('quoteVolume');
  const [sortDir, setSortDir]     = useState('desc');
  const [lastFetch, setLastFetch] = useState(null);

  const fetchPairs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pairs-with-tickers');
      if (!res.ok) throw new Error(`Backend returned ${res.status} — is the backend server running on port 3001?`);
      const json = await res.json();
      if (json.success) { setPairs(json.data); setLastFetch(Date.now()); }
      else throw new Error(json.error || 'Unknown error');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPairs(); }, [fetchPairs]);

  const maxVol = useMemo(() => Math.max(...pairs.map(p => p.quoteVolume || 0)), [pairs]);

  const filtered = useMemo(() => {
    let list = [...pairs];
    if (search.trim()) {
      const q = search.toUpperCase();
      list = list.filter(p => p.symbol.includes(q) || p.baseAsset?.includes(q));
    }
    if (filter === 'selected')   list = list.filter(p => selectedPairs.includes(p.symbol));
    if (filter === 'unselected') list = list.filter(p => !selectedPairs.includes(p.symbol));

    list.sort((a, b) => {
      const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [pairs, search, filter, sortKey, sortDir, selectedPairs]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'symbol' ? 'asc' : 'desc'); }
  };

  const toggle = (symbol) => {
    const next = selectedPairs.includes(symbol)
      ? selectedPairs.filter(s => s !== symbol)
      : [...selectedPairs, symbol];
    onUpdate({ selectedPairs: next });
  };

  const selectFiltered  = () => {
    const syms = filtered.map(p => p.symbol);
    const rest = selectedPairs.filter(s => !filtered.find(p => p.symbol === s));
    onUpdate({ selectedPairs: [...rest, ...syms] });
  };
  const deselectFiltered = () => {
    const set = new Set(filtered.map(p => p.symbol));
    onUpdate({ selectedPairs: selectedPairs.filter(s => !set.has(s)) });
  };
  const selectAll  = () => onUpdate({ selectedPairs: pairs.map(p => p.symbol) });
  const clearAll   = () => onUpdate({ selectedPairs: [] });

  return (
    <div style={S.container}>

      {/* ── Header ── */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <h2 style={S.title}>Pair Selection</h2>
          <span style={S.badge}>
            <span style={S.badgeNum}>{selectedPairs.length}</span>
            <span style={S.badgeSep}>/</span>
            <span style={S.badgeTotal}>{pairs.length}</span>
          </span>
          {lastFetch && (
            <span style={S.refreshedAt}>
              Updated {new Date(lastFetch).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div style={S.actions}>
          <Btn color="green"  onClick={selectAll}>Select All ({pairs.length})</Btn>
          <Btn color="blue"   onClick={selectFiltered}>Select Filtered ({filtered.length})</Btn>
          <Btn color="red"    onClick={deselectFiltered}>Deselect Filtered</Btn>
          <Btn color="muted"  onClick={clearAll}>Clear All</Btn>
          <button style={S.refreshBtn} onClick={fetchPairs} disabled={loading} title="Refresh data">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}>
              <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
              <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={S.controls}>
        <div style={S.searchWrap}>
          <svg style={S.searchIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            style={S.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol or base asset..."
          />
          {search && <button style={S.clearBtn} onClick={() => setSearch('')}>×</button>}
        </div>
        <div style={S.filters}>
          {[['all','All'],['selected','Selected'],['unselected','Unselected']].map(([v,l]) => (
            <button key={v} style={S.filterBtn(filter === v)} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={S.tableWrap}>
        {error ? (
          <div style={S.errorBox}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>Failed to load pairs</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{error}</div>
              <button style={S.retryBtn} onClick={fetchPairs}>Retry</button>
            </div>
          </div>
        ) : loading && pairs.length === 0 ? (
          <div style={S.loadingRow}>
            <div style={S.spinner} />
            Fetching pairs from Binance...
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 36 }} />
                <SortTh label="Symbol"    col="symbol"             sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Price"     col="lastPrice"          sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortTh label="24h %"     col="priceChangePercent" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortTh label="Volume 24h (USDT)" col="quoteVolume" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <th style={{ ...S.th, minWidth: 90 }}>Vol. Bar</th>
                <SortTh label="Market Cap"   col="marketCap"       sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortTh label="High"      col="highPrice"          sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortTh label="Low"       col="lowPrice"           sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const sel = selectedPairs.includes(p.symbol);
                const chg = p.priceChangePercent || 0;
                const chgColor = chg > 0 ? 'var(--green)' : chg < 0 ? 'var(--red)' : 'var(--text-muted)';
                return (
                  <tr key={p.symbol} style={S.row(sel)} onClick={() => toggle(p.symbol)}>
                    <td style={S.td}>
                      <div style={S.checkbox(sel)}>
                        {sel && <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
                          <path d="M2 6l3 3 5-5"/>
                        </svg>}
                      </div>
                    </td>
                    <td style={S.td}>
                      <div style={S.symbolCell}>
                        <span style={S.symbolBase}>{p.baseAsset}</span>
                        <span style={S.symbolQuote}>USDT</span>
                      </div>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <span style={S.mono}>${fmtPrice(p.lastPrice)}</span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <span style={{ ...S.mono, color: chgColor, fontWeight: 700 }}>
                        {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <span style={{ ...S.mono, color: 'var(--text-primary)', fontWeight: 600 }}>
                        ${fmtVol(p.quoteVolume)}
                      </span>
                    </td>
                    <td style={{ ...S.td }}>
                      <VolumeBar value={p.quoteVolume || 0} max={maxVol} />
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <span style={{ ...S.mono, color: 'var(--purple)', fontWeight: 600 }}>
                          {p.marketCap ? `$${fmtVol(p.marketCap)}` : '—'}
                        </span>
                        {p.marketCapRank && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{p.marketCapRank}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <span style={{ ...S.mono, color: 'var(--green)', fontSize: 11 }}>${fmtPrice(p.highPrice)}</span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <span style={{ ...S.mono, color: 'var(--red)', fontSize: 11 }}>${fmtPrice(p.lowPrice)}</span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={S.emptyCell}>No pairs match your filter</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Selected tags ── */}
      {selectedPairs.length > 0 && (
        <div style={S.tagsBar}>
          <span style={S.tagsLabel}>Selected ({selectedPairs.length}):</span>
          <div style={S.tags}>
            {selectedPairs.slice(0, 30).map(s => (
              <span key={s} style={S.tag}>
                {s.replace('USDT', '')}
                <button style={S.tagX} onClick={e => { e.stopPropagation(); toggle(s); }}>×</button>
              </span>
            ))}
            {selectedPairs.length > 30 && (
              <span style={S.tagMore}>+{selectedPairs.length - 30} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SortTh({ label, col, sortKey, sortDir, onSort, align = 'left' }) {
  const active = sortKey === col;
  return (
    <th style={{ ...S.th, textAlign: align, cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort(col)}>
      <span style={{ color: active ? 'var(--accent)' : undefined }}>
        {label}
        {active
          ? <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
          : <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.3 }}>↕</span>
        }
      </span>
    </th>
  );
}

function Btn({ color, onClick, children }) {
  const colors = {
    green: { border: 'var(--green)', text: 'var(--green)' },
    blue:  { border: 'var(--accent)', text: 'var(--accent)' },
    red:   { border: 'var(--red)', text: 'var(--red)' },
    muted: { border: 'var(--border)', text: 'var(--text-muted)' },
  };
  const c = colors[color];
  return (
    <button
      style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent',
               color: c.text, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const S = {
  container: { display: 'flex', flexDirection: 'column', gap: 10, height: '100%' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  title: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' },
  badge: { display: 'flex', alignItems: 'center', gap: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 99, padding: '2px 10px', fontSize: 12 },
  badgeNum: { color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' },
  badgeSep: { color: 'var(--text-muted)' },
  badgeTotal: { color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  refreshedAt: { fontSize: 11, color: 'var(--text-muted)' },
  actions: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  refreshBtn: {
    width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--bg-elevated)', color: 'var(--text-muted)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  controls: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  searchWrap: { position: 'relative', flex: 1, minWidth: 220, display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: 10, color: 'var(--text-muted)', pointerEvents: 'none' },
  searchInput: {
    width: '100%', padding: '8px 12px 8px 30px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-elevated)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-mono)',
  },
  clearBtn: { position: 'absolute', right: 10, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 0 },
  filters: { display: 'flex', gap: 4 },
  filterBtn: (a) => ({ padding: '6px 12px', borderRadius: 7, border: a ? '1px solid var(--accent)' : '1px solid var(--border)', background: a ? 'var(--accent-dim)' : 'transparent', color: a ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: a ? 600 : 400 }),
  tableWrap: { flex: 1, overflow: 'auto', borderRadius: 10, border: '1px solid var(--border)' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { padding: '9px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, whiteSpace: 'nowrap' },
  row: (sel) => ({ background: sel ? 'rgba(59,130,246,0.06)' : 'transparent', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s' }),
  td: { padding: '8px 12px', verticalAlign: 'middle' },
  checkbox: (sel) => ({
    width: 16, height: 16, borderRadius: 4,
    border: sel ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
    background: sel ? 'var(--accent)' : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', flexShrink: 0,
  }),
  symbolCell: { display: 'flex', alignItems: 'baseline', gap: 4 },
  symbolBase: { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' },
  symbolQuote: { fontSize: 10, color: 'var(--text-muted)' },
  mono: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' },
  errorBox: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 24, color: 'var(--text-secondary)', fontSize: 13 },
  retryBtn: { marginTop: 10, padding: '5px 14px', borderRadius: 6, border: '1px solid var(--red)', background: 'transparent', color: 'var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  loadingRow: { display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', padding: 32, justifyContent: 'center', fontSize: 13 },
  spinner: { width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite', flexShrink: 0 },
  emptyCell: { textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: 13 },
  tagsBar: { background: 'var(--bg-elevated)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border)', flexShrink: 0 },
  tagsLabel: { fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 99, fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 },
  tagX: { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, opacity: 0.7 },
  tagMore: { padding: '2px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 99, fontSize: 11, color: 'var(--text-muted)' },
};
