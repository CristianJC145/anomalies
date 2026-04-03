import React, { useState } from 'react';

const INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h'];
const CANDLE_OPTIONS = [5, 10, 15, 20, 30, 50];
const MULTIPLIER_PRESETS = [2, 2.5, 3, 4, 5, 7, 10];
const COOLDOWN_OPTIONS = [5, 10, 15, 20, 30, 60];
const CHANGE_PRESETS = [0, 0.5, 1, 2, 3, 5, 10];

export default function BotConfig({ config, onUpdate }) {
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgStatus, setTgStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [localMultiplier, setLocalMultiplier] = useState(config.volumeMultiplier);
  const [localChange, setLocalChange]         = useState(config.priceChangeThreshold ?? 0);

  const handleIntervalChange = (v) => onUpdate({ interval: v });
  const handleCandlesChange = (v) => onUpdate({ candlesForAvg: parseInt(v) });
  const handleCooldownChange = (v) => onUpdate({ cooldownMinutes: parseInt(v) });
  const handleMultiplierBlur = () => {
    const val = Math.max(1, Math.min(100, parseFloat(localMultiplier) || 3));
    setLocalMultiplier(val);
    onUpdate({ volumeMultiplier: val });
  };

  const handleChangeBlur = () => {
    const val = Math.max(0, Math.min(100, parseFloat(localChange) || 0));
    setLocalChange(val);
    onUpdate({ priceChangeThreshold: val });
  };

  const handleTestTelegram = async () => {
    setTesting(true);
    setTgStatus(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tgToken, chatId: tgChatId }),
      });
      const json = await res.json();
      setTgStatus(json.success ? 'success' : 'error');
    } catch {
      setTgStatus('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveTelegram = async () => {
    await fetch('/api/telegram/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tgToken, chatId: tgChatId }),
    });
    setTgStatus('saved');
  };

  return (
    <div style={styles.container}>
      <SectionTitle icon="⚙️" title="Bot Configuration" />

      {/* Scanner Settings */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Scanner Settings</div>

        <div style={styles.row}>
          <ConfigItem label="Candle Interval" hint="Timeframe for volume analysis">
            <div style={styles.btnGroup}>
              {INTERVALS.map(i => (
                <button
                  key={i}
                  style={styles.toggleBtn(config.interval === i)}
                  onClick={() => handleIntervalChange(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </ConfigItem>
        </div>

        <div style={styles.row}>
          <ConfigItem label="Candles for Average" hint="Number of previous candles to calculate baseline">
            <div style={styles.btnGroup}>
              {CANDLE_OPTIONS.map(n => (
                <button
                  key={n}
                  style={styles.toggleBtn(config.candlesForAvg === n)}
                  onClick={() => handleCandlesChange(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </ConfigItem>
        </div>

        <div style={styles.threeCol}>
          <ConfigItem label="Volume Multiplier" hint="Alert when volume exceeds avg × multiplier">
            <div style={styles.multiplierRow}>
              <div style={styles.btnGroup}>
                {MULTIPLIER_PRESETS.map(m => (
                  <button
                    key={m}
                    style={styles.toggleBtn(config.volumeMultiplier === m)}
                    onClick={() => { setLocalMultiplier(m); onUpdate({ volumeMultiplier: m }); }}
                  >
                    {m}x
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={localMultiplier}
                onChange={e => setLocalMultiplier(e.target.value)}
                onBlur={handleMultiplierBlur}
                min={1} max={100} step={0.5}
                style={styles.input}
                placeholder="Custom"
              />
            </div>
          </ConfigItem>

          <ConfigItem label="Change Threshold" hint="Min candle % move required (0 = disabled)">
            <div style={styles.multiplierRow}>
              <div style={styles.btnGroup}>
                {CHANGE_PRESETS.map(p => (
                  <button
                    key={p}
                    style={styles.toggleBtn((config.priceChangeThreshold ?? 0) === p)}
                    onClick={() => { setLocalChange(p); onUpdate({ priceChangeThreshold: p }); }}
                  >
                    {p === 0 ? 'Off' : `${p}%`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={localChange}
                onChange={e => setLocalChange(e.target.value)}
                onBlur={handleChangeBlur}
                min={0} max={100} step={0.5}
                style={styles.input}
                placeholder="Custom"
              />
            </div>
          </ConfigItem>

          <ConfigItem label="Alert Cooldown" hint="Min minutes between alerts for same pair">
            <div style={styles.btnGroup}>
              {COOLDOWN_OPTIONS.map(c => (
                <button
                  key={c}
                  style={styles.toggleBtn(config.cooldownMinutes === c)}
                  onClick={() => handleCooldownChange(c)}
                >
                  {c}m
                </button>
              ))}
            </div>
          </ConfigItem>
        </div>
      </div>

      {/* Alert Summary */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryRow}>
          <SummaryItem label="Interval" value={config.interval} color="cyan" />
          <SummaryItem label="Avg. Candles" value={config.candlesForAvg} color="purple" />
          <SummaryItem label="Vol. Trigger" value={`≥ ${config.volumeMultiplier}x`} color="yellow" />
          <SummaryItem label="Candle Δ" value={(config.priceChangeThreshold ?? 0) === 0 ? 'Off' : `≥ ${config.priceChangeThreshold}%`} color="red" />
          <SummaryItem label="Cooldown" value={`${config.cooldownMinutes}m`} color="green" />
        </div>
      </div>

      {/* Telegram Config */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>Telegram Alerts</span>
          <span style={styles.tgIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.69 7.97c-.12.57-.46.71-.93.44l-2.59-1.91-1.25 1.2c-.14.14-.26.26-.52.26l.19-2.65 4.84-4.37c.21-.19-.05-.29-.33-.1L7.93 14.5l-2.54-.8c-.55-.17-.56-.55.12-.81l9.93-3.83c.46-.17.86.11.2.74z"/>
            </svg>
          </span>
        </div>

        <div style={styles.tgFields}>
          <div style={styles.field}>
            <label style={styles.label}>Bot Token</label>
            <input
              type="password"
              value={tgToken}
              onChange={e => setTgToken(e.target.value)}
              placeholder="123456789:ABCdef..."
              style={styles.textInput}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Chat ID</label>
            <input
              type="text"
              value={tgChatId}
              onChange={e => setTgChatId(e.target.value)}
              placeholder="-100123456789"
              style={styles.textInput}
            />
          </div>
        </div>

        <div style={styles.tgActions}>
          <button
            style={styles.tgBtn('outline')}
            onClick={handleTestTelegram}
            disabled={!tgToken || !tgChatId || testing}
          >
            {testing ? 'Sending...' : 'Test Alert'}
          </button>
          <button
            style={styles.tgBtn('solid')}
            onClick={handleSaveTelegram}
            disabled={!tgToken || !tgChatId}
          >
            Save Config
          </button>
          {tgStatus && (
            <span style={styles.tgStatus(tgStatus)}>
              {tgStatus === 'success' ? '✓ Test sent!' : tgStatus === 'saved' ? '✓ Saved' : '✗ Failed'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h2>
    </div>
  );
}

function ConfigItem({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
        {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SummaryItem({ label, value, color }) {
  const colors = { cyan: 'var(--cyan)', purple: 'var(--purple)', yellow: 'var(--yellow)', green: 'var(--green)', red: 'var(--red)' };
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: colors[color], fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tgIcon: { display: 'flex', alignItems: 'center' },
  row: { marginBottom: 4 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  threeCol: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
  btnGroup: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  toggleBtn: (active) => ({
    padding: '5px 10px',
    borderRadius: 6,
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent-dim)' : 'var(--bg-elevated)',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
    cursor: 'pointer',
  }),
  multiplierRow: { display: 'flex', flexDirection: 'column', gap: 8 },
  input: {
    width: 80,
    padding: '5px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    outline: 'none',
  },
  summaryCard: {
    background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: 12,
    padding: '14px 20px',
  },
  summaryRow: { display: 'flex', justifyContent: 'space-around', alignItems: 'center' },
  tgFields: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  textInput: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
  },
  tgActions: { display: 'flex', gap: 8, alignItems: 'center' },
  tgBtn: (v) => ({
    padding: '7px 14px',
    borderRadius: 7,
    border: v === 'solid' ? 'none' : '1px solid var(--accent)',
    background: v === 'solid' ? 'var(--accent)' : 'transparent',
    color: v === 'solid' ? '#fff' : 'var(--accent)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  }),
  tgStatus: (s) => ({
    fontSize: 12,
    color: s === 'error' ? 'var(--red)' : 'var(--green)',
    fontWeight: 500,
  }),
};
