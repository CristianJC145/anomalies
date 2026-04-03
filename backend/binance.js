const axios = require('axios');

const BASE_URL = 'https://fapi.binance.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

async function getAllPerpetualPairs() {
  const { data } = await api.get('/fapi/v1/exchangeInfo');
  return data.symbols
    .filter(s => s.contractType === 'PERPETUAL' && s.status === 'TRADING' && s.quoteAsset === 'USDT')
    .map(s => ({
      symbol: s.symbol,
      baseAsset: s.baseAsset,
      quoteAsset: s.quoteAsset,
    }));
}

async function getKlines(symbol, interval, limit = 21) {
  const { data } = await api.get('/fapi/v1/klines', {
    params: { symbol, interval, limit },
  });
  return data.map(k => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
    quoteVolume: parseFloat(k[7]),
    trades: parseInt(k[8]),
  }));
}

async function getTicker24h(symbol) {
  const { data } = await api.get('/fapi/v1/ticker/24hr', {
    params: { symbol },
  });
  return {
    priceChangePercent: parseFloat(data.priceChangePercent),
    lastPrice: parseFloat(data.lastPrice),
    volume: parseFloat(data.volume),
    quoteVolume: parseFloat(data.quoteVolume),
    highPrice: parseFloat(data.highPrice),
    lowPrice: parseFloat(data.lowPrice),
    count: parseInt(data.count),
  };
}

async function getAllTickers24h() {
  const { data } = await api.get('/fapi/v1/ticker/24hr');
  return data.reduce((acc, t) => {
    acc[t.symbol] = {
      priceChangePercent: parseFloat(t.priceChangePercent),
      lastPrice: parseFloat(t.lastPrice),
      volume: parseFloat(t.volume),
      quoteVolume: parseFloat(t.quoteVolume),
      highPrice: parseFloat(t.highPrice),
      lowPrice: parseFloat(t.lowPrice),
    };
    return acc;
  }, {});
}

module.exports = { getAllPerpetualPairs, getKlines, getTicker24h, getAllTickers24h };
