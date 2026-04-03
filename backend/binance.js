/**
 * Exchange adapter — Bybit V5 (Linear Perpetuals)
 * Drop-in replacement for Binance fapi.
 * Same exported functions, same return shapes.
 */
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.bybit.com',
  timeout: 10000,
});

// Bybit uses numeric interval strings; map from human format
const INTERVAL_MAP = {
  '1m': '1', '3m': '3', '5m': '5', '15m': '15',
  '30m': '30', '1h': '60', '2h': '120', '4h': '240',
};

function mapInterval(interval) {
  return INTERVAL_MAP[interval] || interval;
}

// ── Pairs ─────────────────────────────────────────────────────────────────────
async function getAllPerpetualPairs() {
  const { data } = await api.get('/v5/market/instruments-info', {
    params: { category: 'linear', limit: 1000 },
  });
  return data.result.list
    .filter(s => s.contractType === 'LinearPerpetual' && s.status === 'Trading' && s.quoteCoin === 'USDT')
    .map(s => ({
      symbol:     s.symbol,
      baseAsset:  s.baseCoin,
      quoteAsset: s.quoteCoin,
    }));
}

// ── Klines ────────────────────────────────────────────────────────────────────
// Bybit returns [startTime, open, high, low, close, volume, turnover] newest-first
async function getKlines(symbol, interval, limit = 21) {
  const { data } = await api.get('/v5/market/kline', {
    params: { category: 'linear', symbol, interval: mapInterval(interval), limit },
  });
  return data.result.list
    .slice()
    .reverse()                      // oldest → newest
    .map(k => ({
      openTime:    parseInt(k[0]),
      open:        parseFloat(k[1]),
      high:        parseFloat(k[2]),
      low:         parseFloat(k[3]),
      close:       parseFloat(k[4]),
      volume:      parseFloat(k[5]),
      closeTime:   parseInt(k[0]) + 60000,
      quoteVolume: parseFloat(k[6]), // turnover in USDT
      trades:      0,
    }));
}

// ── Single ticker ─────────────────────────────────────────────────────────────
async function getTicker24h(symbol) {
  const { data } = await api.get('/v5/market/tickers', {
    params: { category: 'linear', symbol },
  });
  const t = data.result.list[0];
  return {
    priceChangePercent: parseFloat(t.price24hPcnt) * 100,
    lastPrice:   parseFloat(t.lastPrice),
    volume:      parseFloat(t.volume24h),
    quoteVolume: parseFloat(t.turnover24h),
    highPrice:   parseFloat(t.highPrice24h),
    lowPrice:    parseFloat(t.lowPrice24h),
    count:       0,
  };
}

// ── All tickers (bulk) ────────────────────────────────────────────────────────
async function getAllTickers24h() {
  const { data } = await api.get('/v5/market/tickers', {
    params: { category: 'linear' },
  });
  return data.result.list.reduce((acc, t) => {
    acc[t.symbol] = {
      priceChangePercent: parseFloat(t.price24hPcnt) * 100,
      lastPrice:   parseFloat(t.lastPrice),
      volume:      parseFloat(t.volume24h),
      quoteVolume: parseFloat(t.turnover24h),
      highPrice:   parseFloat(t.highPrice24h),
      lowPrice:    parseFloat(t.lowPrice24h),
    };
    return acc;
  }, {});
}

module.exports = { getAllPerpetualPairs, getKlines, getTicker24h, getAllTickers24h };
