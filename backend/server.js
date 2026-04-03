require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const http    = require('http');
const path    = require('path');
const WebSocket = require('ws');
const { getAllPerpetualPairs, getAllTickers24h } = require('./binance');
const { getMarketCaps } = require('./coingecko');
const Scanner  = require('./scanner');
const telegram = require('./telegram');

const IS_PROD = process.env.NODE_ENV === 'production';
const PORT    = parseInt(process.env.PORT || '3001', 10);

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

// ── Middleware ────────────────────────────────────────────────────────────────
if (!IS_PROD) app.use(cors());   // dev only — in prod, same origin serves the UI
app.use(express.json());

// ── Static frontend (production) ──────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, 'public');
if (IS_PROD) {
  app.use(express.static(PUBLIC_DIR));
}

// ── WebSocket broadcast ───────────────────────────────────────────────────────
function broadcast(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

// ── Scanner + Telegram + Trading init ────────────────────────────────────────
const scanner = new Scanner(broadcast);

if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
  telegram.init(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID);
}


// ── WebSocket handler ─────────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[WS] Client connected — ${ip}`);

  ws.send(JSON.stringify({ type: 'config',         data: scanner.getConfig() }));
  ws.send(JSON.stringify({ type: 'status',         data: { running: scanner.running } }));
  ws.send(JSON.stringify({ type: 'pairs_update',   data: scanner.getPairsData() }));
  ws.send(JSON.stringify({ type: 'alerts_history', data: scanner.getAlerts() }));
  ws.send(JSON.stringify({ type: 'stats',          data: scanner.getStats() }));

  ws.on('close', () => console.log(`[WS] Client disconnected — ${ip}`));
  ws.on('error', (err) => console.error('[WS] Error:', err.message));
});

// ── API Routes ────────────────────────────────────────────────────────────────

app.get('/api/pairs', async (_req, res) => {
  try {
    res.json({ success: true, data: await getAllPerpetualPairs() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/pairs-with-tickers', async (_req, res) => {
  try {
    // Binance calls are required; CoinGecko is optional (never throws)
    const [pairsResult, tickersResult] = await Promise.allSettled([
      getAllPerpetualPairs(),
      getAllTickers24h(),
    ]);

    if (pairsResult.status === 'rejected')
      return res.status(500).json({ success: false, error: 'Binance pairs: ' + pairsResult.reason.message });
    if (tickersResult.status === 'rejected')
      return res.status(500).json({ success: false, error: 'Binance tickers: ' + tickersResult.reason.message });

    const pairs      = pairsResult.value;
    const tickers    = tickersResult.value;
    const marketCaps = await getMarketCaps(); // never throws

    const data = pairs.map(p => {
      const ticker = tickers[p.symbol] || {};
      const mc     = marketCaps[p.baseAsset] || {};
      return { ...p, ...ticker, marketCap: mc.marketCap || 0, marketCapRank: mc.marketCapRank || null };
    });
    data.sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/config', (_req, res) => {
  res.json({ success: true, data: scanner.getConfig() });
});

app.post('/api/config', (req, res) => {
  try {
    scanner.updateConfig(req.body);
    res.json({ success: true, data: scanner.getConfig() });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.post('/api/scanner/start', (_req, res) => {
  if (scanner.getConfig().selectedPairs.length === 0)
    return res.status(400).json({ success: false, error: 'No pairs selected' });
  scanner.start();
  res.json({ success: true, running: true });
});

app.post('/api/scanner/stop', (_req, res) => {
  scanner.stop();
  res.json({ success: true, running: false });
});

app.get('/api/scanner/status', (_req, res) => {
  res.json({ success: true, running: scanner.running, stats: scanner.getStats() });
});

app.get('/api/alerts', (_req, res) => {
  res.json({ success: true, data: scanner.getAlerts() });
});

app.get('/api/pairs-data', (_req, res) => {
  res.json({ success: true, data: scanner.getPairsData() });
});

app.post('/api/telegram/test', async (req, res) => {
  const { token, chatId } = req.body;
  telegram.init(token, chatId);
  try {
    await telegram.sendAlert({
      symbol: 'BTCUSDT', price: 65000, priceChange: 2.5, candleChangePercent: 1.8,
      currentVolume: 5000000, avgVolume: 1000000, multiplier: 5.0,
      interval: '5m', candlesUsed: 10, timestamp: Date.now(),
    });
    res.json({ success: true, message: 'Test alert sent!' });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.post('/api/telegram/config', (req, res) => {
  const { token, chatId } = req.body;
  telegram.init(token, chatId);
  res.json({ success: true, configured: telegram.isConfigured() });
});

// ── SPA catch-all (production) ────────────────────────────────────────────────
if (IS_PROD) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[Server] ${signal} received — shutting down...`);
  scanner.stop();
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT} (${IS_PROD ? 'production' : 'development'})`);
  console.log(`[Telegram] Configured: ${telegram.isConfigured()}`);
});
