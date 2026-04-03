const TelegramBot = require('node-telegram-bot-api');

let bot = null;
let chatId = null;

function init(token, chat) {
  if (!token || !chat) return;
  chatId = chat;
  try {
    bot = new TelegramBot(token, { polling: false });
    console.log('[Telegram] Bot initialized');
  } catch (e) {
    console.error('[Telegram] Init error:', e.message);
  }
}

function isConfigured() {
  return bot !== null && chatId !== null;
}

async function sendAlert(alert) {
  if (!bot || !chatId) return;
  const direction = alert.priceChange >= 0 ? '🟢' : '🔴';
  const msg = [
    `🚨 *VOLUME SPIKE DETECTED*`,
    ``,
    `${direction} *${alert.symbol}*`,
    ``,
    `📊 *Volume Info:*`,
    `• Current Vol: \`${formatNumber(alert.currentVolume)}\` USDT`,
    `• Avg Vol (${alert.candlesUsed} candles): \`${formatNumber(alert.avgVolume)}\` USDT`,
    `• Spike: \`${alert.multiplier.toFixed(2)}x\``,
    ``,
    `💰 *Price:* \`$${alert.price.toFixed(alert.price < 1 ? 6 : 2)}\``,
    `📈 *24h Change:* \`${alert.priceChange >= 0 ? '+' : ''}${alert.priceChange.toFixed(2)}%\``,
    `🕯 *Candle Change:* \`${alert.candleChangePercent >= 0 ? '+' : ''}${alert.candleChangePercent.toFixed(2)}%\``,
    `⏱ *Interval:* \`${alert.interval}\``,
    `🕐 \`${new Date(alert.timestamp).toUTCString()}\``,
  ].join('\n');

  try {
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error('[Telegram] Send error:', e.message);
  }
}

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toFixed(2);
}

module.exports = { init, sendAlert, isConfigured };
