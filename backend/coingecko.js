const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  timeout: 15000,
});

// Cache: refresh every 5 minutes (market cap doesn't change by the second)
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

// Returns map: lowercase symbol -> { marketCap, fullyDilutedValuation, marketCapRank }
async function getMarketCaps() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache;

  const result = {};
  // Fetch top 500 coins across 2 pages to cover all Binance USDT futures
  const pages = [1, 2];
  const responses = await Promise.allSettled(
    pages.map(page =>
      api.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 250,
          page,
          sparkline: false,
        },
      })
    )
  );

  for (const r of responses) {
    if (r.status !== 'fulfilled') continue;
    for (const coin of r.value.data) {
      result[coin.symbol.toUpperCase()] = {
        marketCap: coin.market_cap || 0,
        fullyDilutedValuation: coin.fully_diluted_valuation || 0,
        marketCapRank: coin.market_cap_rank || null,
      };
    }
  }

  cache = result;
  cacheTime = Date.now();
  return result;
}

module.exports = { getMarketCaps };
