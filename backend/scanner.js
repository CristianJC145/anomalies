const { getKlines, getAllTickers24h } = require('./binance');
const telegram = require('./telegram');

const INTERVAL_MAP = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
};

class Scanner {
  constructor(broadcast) {
    this.broadcast = broadcast;
    this.running = false;
    this.timer = null;
    this.alertCooldowns = new Map(); // symbol -> last alert timestamp

    this.config = {
      interval: '5m',
      candlesForAvg: 10,
      volumeMultiplier: 3.0,
      priceChangeThreshold: 0,   // % candle change required (0 = disabled)
      cooldownMinutes: 15,
      selectedPairs: [],
      excludedPairs: [],
    };

    this.alerts = [];
    this.pairsData = {};
    this.scanStats = {
      lastScan: null,
      totalScans: 0,
      alertsToday: 0,
      pairsScanned: 0,
    };
  }

  updateConfig(newConfig) {
    const wasRunning = this.running;
    if (wasRunning) this.stop();
    this.config = { ...this.config, ...newConfig };
    if (wasRunning) this.start();
    this.broadcast({ type: 'config', data: this.config });
  }

  getConfig() {
    return this.config;
  }

  getAlerts() {
    return this.alerts.slice(0, 100);
  }

  getPairsData() {
    return this.pairsData;
  }

  getStats() {
    return this.scanStats;
  }

  start() {
    if (this.running) return;
    this.running = true;
    console.log('[Scanner] Started');
    this.runScan();
    const intervalMs = INTERVAL_MAP[this.config.interval] || INTERVAL_MAP['5m'];
    this.timer = setInterval(() => this.runScan(), intervalMs);
    this.broadcast({ type: 'status', data: { running: true } });
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[Scanner] Stopped');
    this.broadcast({ type: 'status', data: { running: false } });
  }

  async runScan() {
    const pairs = this.getPairsToScan();
    if (pairs.length === 0) return;

    console.log(`[Scanner] Scanning ${pairs.length} pairs on ${this.config.interval}...`);

    let tickers = {};
    try {
      tickers = await getAllTickers24h();
    } catch (e) {
      console.error('[Scanner] Failed to fetch tickers:', e.message);
    }

    const results = [];
    const batchSize = 10;

    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);
      const promises = batch.map(symbol => this.analyzePair(symbol, tickers[symbol]));
      const batchResults = await Promise.allSettled(promises);
      batchResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
      });
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < pairs.length) {
        await sleep(200);
      }
    }

    this.scanStats.lastScan = Date.now();
    this.scanStats.totalScans++;
    this.scanStats.pairsScanned = pairs.length;

    this.broadcast({ type: 'pairs_update', data: this.pairsData });
    this.broadcast({ type: 'stats', data: this.scanStats });
  }

  async analyzePair(symbol, ticker24h) {
    try {
      const limit = this.config.candlesForAvg + 1;
      const klines = await getKlines(symbol, this.config.interval, limit);
      if (klines.length < 2) return null;

      const prevCandles = klines.slice(0, -1);
      const currentCandle = klines[klines.length - 1];
      const avgVolume = prevCandles.reduce((s, c) => s + c.quoteVolume, 0) / prevCandles.length;
      const currentVolume = currentCandle.quoteVolume;
      const multiplier = avgVolume > 0 ? currentVolume / avgVolume : 0;

      // % change of the current candle (open → close)
      const candleChangePercent = currentCandle.open > 0
        ? ((currentCandle.close - currentCandle.open) / currentCandle.open) * 100
        : 0;

      const volumeOk = multiplier >= this.config.volumeMultiplier;
      const changeOk = this.config.priceChangeThreshold === 0
        || Math.abs(candleChangePercent) >= this.config.priceChangeThreshold;

      const pairInfo = {
        symbol,
        price: ticker24h?.lastPrice || currentCandle.close,
        priceChange: ticker24h?.priceChangePercent || 0,
        volume24h: ticker24h?.quoteVolume || 0,
        high24h: ticker24h?.highPrice || currentCandle.high,
        low24h: ticker24h?.lowPrice || currentCandle.low,
        currentVolume,
        avgVolume,
        multiplier,
        candleChangePercent,
        lastUpdate: Date.now(),
        isSpike: volumeOk && changeOk,
      };

      this.pairsData[symbol] = pairInfo;

      if (volumeOk && changeOk && this.checkCooldown(symbol)) {
        const alert = {
          id: Date.now() + Math.random(),
          symbol,
          price: pairInfo.price,
          priceChange: pairInfo.priceChange,
          candleChangePercent,
          currentVolume,
          avgVolume,
          multiplier,
          interval: this.config.interval,
          candlesUsed: this.config.candlesForAvg,
          timestamp: Date.now(),
        };

        this.alerts.unshift(alert);
        if (this.alerts.length > 200) this.alerts.pop();
        this.scanStats.alertsToday++;
        this.alertCooldowns.set(symbol, Date.now());

        this.broadcast({ type: 'alert', data: alert });

        if (telegram.isConfigured()) {
          telegram.sendAlert(alert);
        }
      }

      return pairInfo;
    } catch (e) {
      // Silently skip failed pairs
      return null;
    }
  }

  checkCooldown(symbol) {
    const last = this.alertCooldowns.get(symbol);
    if (!last) return true;
    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    return Date.now() - last > cooldownMs;
  }

  getPairsToScan() {
    const { selectedPairs, excludedPairs } = this.config;
    if (selectedPairs.length > 0) {
      return selectedPairs.filter(p => !excludedPairs.includes(p));
    }
    return [];
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = Scanner;
