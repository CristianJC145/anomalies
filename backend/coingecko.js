const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  timeout: 15000,
});

// Cache: refresh every 5 minutes (market cap doesn't change by the second)
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

// Returns map: SYMBOL -> { marketCap, marketCapRank }
// Never throws — returns stale cache or empty object on failure
async function getMarketCaps() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache;

  const result = {};
  try {
    const responses = await Promise.allSettled(
      [1, 2].map(page =>
        api.get('/coins/markets', {
          params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: 250, page, sparkline: false },
        })
      )
    );

    for (const r of responses) {
      if (r.status !== 'fulfilled') continue;
      for (const coin of r.value.data) {
        result[coin.symbol.toUpperCase()] = {
          marketCap: coin.market_cap || 0,
          marketCapRank: coin.market_cap_rank || null,
        };
      }
    }

    cache = result;
    cacheTime = Date.now();
  } catch (e) {
    console.warn('[CoinGecko] Failed to fetch market caps:', e.message);
    // Return stale cache if available, otherwise empty
    return cache || {};
  }

  return result;
}

module.exports = { getMarketCaps };
