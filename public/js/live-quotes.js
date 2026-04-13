(function () {
  const API_URL = 'https://scanner.tradingview.com/global/scan';
  const CACHE_KEY = 'eso_live_quotes_cache_v1';
  const COINGECKO_SIMPLE_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price';
  const DEFAULT_CACHE_TTL_MS = 15 * 1000;
  const CACHE_RETENTION_MS = 24 * 60 * 60 * 1000;
  const DEFAULT_TIMEOUT_MS = 8000;
  const MAX_SYMBOLS_PER_REQUEST = 40;
  const COLUMNS = ['close', 'change', 'pricescale', 'minmov', 'description', 'name', 'type', 'subtype'];
  const COINGECKO_FALLBACKS = {
    'AMEX:SOL': { id: 'solana', label: 'Solana' },
    'BINANCE:EOSUSDT': { id: 'eos', label: 'EOS' },
    'BINANCE:MKRUSDT': { id: 'maker', label: 'Maker' }
  };
  const SYMBOL_ALIASES = {
    'AMEX:ARKK': 'CBOE:ARKK',
    'AMEX:BND': 'NASDAQ:BND',
    'AMEX:ETHA': 'NASDAQ:ETHA',
    'AMEX:FBTC': 'CBOE:FBTC',
    'AMEX:HODL': 'CBOE:HODL',
    'AMEX:IBIT': 'NASDAQ:IBIT',
    'AMEX:QQQ': 'NASDAQ:QQQ',
    'AMEX:SMH': 'NASDAQ:SMH',
    'AMEX:SOXX': 'NASDAQ:SOXX',
    'BINANCE:FTMUSDT': 'BINANCE:SUSDT',
    'BINANCE:MATICUSDT': 'COINBASE:POLUSD',
    'BINANCE:XMRUSDT': 'KRAKEN:XMRUSD',
    'CBOT:YM1!': 'CBOT_MINI:YM1!',
    'CBOE:VIX1!': 'CBOE:VX1!',
    'CME:CL1!': 'NYMEX:CL1!',
    'CME:ES1!': 'CME_MINI:ES1!',
    'CME:GC1!': 'COMEX:GC1!',
    'CME:NG1!': 'NYMEX:NG1!',
    'CME:NQ1!': 'CME_MINI:NQ1!',
    'CME:SI1!': 'COMEX:SI1!',
    'NYMEX:DX1!': 'ICEUS:DX1!',
    'NYSE:BRK_B': 'NYSE:BRK.B',
    'NYSE:SHOP': 'NASDAQ:SHOP',
    'NYSE:SQ': 'NYSE:XYZ',
    'NYSE:WMT': 'NASDAQ:WMT',
    'TVC:UK10Y': 'TVC:GB10Y',
    'TVC:US13W': 'TVC:US03M'
  };

  function normalizeSymbol(symbol) {
    return String(symbol || '').trim().toUpperCase();
  }

  function resolveQuoteSymbol(symbol) {
    const normalizedSymbol = normalizeSymbol(symbol);
    return SYMBOL_ALIASES[normalizedSymbol] || normalizedSymbol;
  }

  function uniqueSymbols(symbols) {
    const seen = new Set();
    return (Array.isArray(symbols) ? symbols : [])
      .map(normalizeSymbol)
      .filter(Boolean)
      .filter((symbol) => {
        if (seen.has(symbol)) return false;
        seen.add(symbol);
        return true;
      });
  }

  function safeNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function pruneCacheEntries(cache) {
    const now = Date.now();
    const nextCache = {};

    Object.entries(cache || {}).forEach(([symbol, quote]) => {
      if (!quote || typeof quote !== 'object') return;

      const fetchedAt = Number(quote.fetchedAt || 0);
      if (fetchedAt > 0 && now - fetchedAt <= CACHE_RETENTION_MS) {
        nextCache[symbol] = quote;
      }
    });

    return nextCache;
  }

  function writeCache(cache) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(pruneCacheEntries(cache)));
    } catch (_) {
    }
  }

  function isFreshQuote(quote, maxAgeMs) {
    if (!quote || typeof quote !== 'object') return false;

    const fetchedAt = Number(quote.fetchedAt || 0);
    return fetchedAt > 0 && Date.now() - fetchedAt <= maxAgeMs;
  }

  function inferDecimals(pricescale, price) {
    const numericScale = Number(pricescale);
    if (Number.isFinite(numericScale) && numericScale > 0) {
      const scaleText = String(numericScale);
      if (/^10+$/.test(scaleText)) {
        return Math.max(scaleText.length - 1, 0);
      }
    }

    const numericPrice = Math.abs(Number(price) || 0);
    if (numericPrice === 0) return 2;

    const priceText = String(price);
    if (priceText.includes('.') && !priceText.includes('e')) {
      const fractionText = priceText.split('.').pop().replace(/0+$/, '');
      if (fractionText) {
        return Math.min(Math.max(fractionText.length, numericPrice >= 1 ? 2 : 4), 6);
      }
    }

    if (numericPrice >= 1) return 2;
    if (numericPrice >= 0.01) return 4;
    return 6;
  }

  function formatPrice(value, options = {}) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return options.placeholder || '--';
    }

    const decimals = Number.isFinite(Number(options.decimals))
      ? Number(options.decimals)
      : inferDecimals(options.pricescale, numericValue);

    return numericValue.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatPercent(value, decimals = 2) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '--';
    return `${numericValue >= 0 ? '+' : ''}${numericValue.toFixed(decimals)}%`;
  }

  function chunkArray(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  function parseQuoteRow(row) {
    const [price, change, pricescale, minmov, description, name, type, subtype] = Array.isArray(row?.d) ? row.d : [];
    const numericPrice = safeNumber(price);
    if (numericPrice === null) return null;

    const numericChange = safeNumber(change);
    const numericPriceScale = safeNumber(pricescale);
    const numericMinmov = safeNumber(minmov);
    const fetchedAt = Date.now();

    return {
      symbol: normalizeSymbol(row?.s),
      price: numericPrice,
      change: numericChange === null ? 0 : numericChange,
      pricescale: numericPriceScale,
      minmov: numericMinmov,
      description: description || '',
      name: name || '',
      type: type || '',
      subtype: subtype || '',
      decimals: inferDecimals(numericPriceScale, numericPrice),
      fetchedAt
    };
  }

  async function fetchQuotesChunk(symbols, timeoutMs) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller && timeoutMs > 0
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        body: JSON.stringify({
          symbols: {
            tickers: symbols,
            query: { types: [] }
          },
          columns: COLUMNS
        }),
        signal: controller ? controller.signal : undefined
      });

      if (!response.ok) {
        throw new Error(`Quote request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const quotes = {};

      (Array.isArray(payload?.data) ? payload.data : []).forEach((row) => {
        const parsedRow = parseQuoteRow(row);
        if (!parsedRow?.symbol) return;
        quotes[parsedRow.symbol] = parsedRow;
      });

      return quotes;
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  async function fetchCoinGeckoQuotes(symbols, timeoutMs) {
    const requestedSymbols = uniqueSymbols(symbols).filter((symbol) => COINGECKO_FALLBACKS[symbol]);
    if (!requestedSymbols.length) return {};

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller && timeoutMs > 0
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      const ids = Array.from(new Set(requestedSymbols.map((symbol) => COINGECKO_FALLBACKS[symbol].id)));
      const endpoint = new URL(COINGECKO_SIMPLE_PRICE_URL);
      endpoint.searchParams.set('ids', ids.join(','));
      endpoint.searchParams.set('vs_currencies', 'usd');
      endpoint.searchParams.set('include_24hr_change', 'true');

      const response = await fetch(endpoint.toString(), {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        headers: {
          Accept: 'application/json'
        },
        signal: controller ? controller.signal : undefined
      });

      if (!response.ok) {
        throw new Error(`CoinGecko quote request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const fetchedAt = Date.now();
      const quotes = {};

      requestedSymbols.forEach((symbol) => {
        const fallbackConfig = COINGECKO_FALLBACKS[symbol];
        const quoteRow = payload?.[fallbackConfig.id];
        const numericPrice = safeNumber(quoteRow?.usd);
        if (numericPrice === null) return;

        quotes[symbol] = {
          symbol,
          price: numericPrice,
          change: safeNumber(quoteRow?.usd_24h_change) ?? 0,
          pricescale: null,
          minmov: null,
          description: fallbackConfig.label || symbol,
          name: fallbackConfig.label || symbol,
          type: 'crypto',
          subtype: 'fallback',
          decimals: inferDecimals(null, numericPrice),
          fetchedAt
        };
      });

      return quotes;
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  function getCachedQuote(symbol, maxAgeMs = Infinity) {
    const normalizedSymbol = normalizeSymbol(symbol);
    if (!normalizedSymbol) return null;

    const cache = readCache();
    const cachedQuote = cache[normalizedSymbol] || cache[resolveQuoteSymbol(normalizedSymbol)] || null;
    if (!Number.isFinite(maxAgeMs)) return cachedQuote;
    return isFreshQuote(cachedQuote, maxAgeMs) ? cachedQuote : null;
  }

  function getCachedQuotes(symbols, maxAgeMs = Infinity) {
    const quotes = {};

    uniqueSymbols(symbols).forEach((symbol) => {
      const cachedQuote = getCachedQuote(symbol, maxAgeMs);
      if (!cachedQuote) {
        quotes[symbol] = null;
        return;
      }

      quotes[symbol] = cachedQuote;
    });

    return quotes;
  }

  async function fetchQuotes(symbols, options = {}) {
    const requestedSymbols = uniqueSymbols(symbols);
    if (!requestedSymbols.length) return {};

    const force = !!options.force;
    const maxAgeMs = Number.isFinite(Number(options.maxAgeMs))
      ? Number(options.maxAgeMs)
      : DEFAULT_CACHE_TTL_MS;
    const timeoutMs = Number.isFinite(Number(options.timeoutMs))
      ? Number(options.timeoutMs)
      : DEFAULT_TIMEOUT_MS;

    const cachedQuotes = readCache();
    const result = {};
    const staleSymbols = [];
    const requestedToResolvedSymbol = {};

    requestedSymbols.forEach((symbol) => {
      const resolvedSymbol = resolveQuoteSymbol(symbol);
      requestedToResolvedSymbol[symbol] = resolvedSymbol;
      const cachedQuote = cachedQuotes[symbol] || cachedQuotes[resolvedSymbol] || null;

      if (!force && isFreshQuote(cachedQuote, maxAgeMs)) {
        result[symbol] = cachedQuote;
      } else {
        staleSymbols.push(resolvedSymbol);
      }
    });

    let liveQuotes = {};
    if (staleSymbols.length) {
      const quoteChunks = chunkArray(uniqueSymbols(staleSymbols), MAX_SYMBOLS_PER_REQUEST);
      const liveQuoteResults = await Promise.all(
        quoteChunks.map((chunk) => fetchQuotesChunk(chunk, timeoutMs).catch(() => ({})))
      );

      liveQuotes = Object.assign({}, ...liveQuoteResults);
      if (Object.keys(liveQuotes).length) {
        const cacheUpdates = { ...liveQuotes };
        requestedSymbols.forEach((symbol) => {
          const resolvedSymbol = requestedToResolvedSymbol[symbol];
          if (liveQuotes[resolvedSymbol]) {
            cacheUpdates[symbol] = liveQuotes[resolvedSymbol];
          }
        });
        writeCache({ ...cachedQuotes, ...cacheUpdates });
      }
    }

    const fallbackSymbols = requestedSymbols.filter((symbol) => {
      if (!COINGECKO_FALLBACKS[symbol]) return false;

      const resolvedSymbol = requestedToResolvedSymbol[symbol];
      return !liveQuotes[resolvedSymbol] && !result[symbol];
    });

    let fallbackQuotes = {};
    if (fallbackSymbols.length) {
      fallbackQuotes = await fetchCoinGeckoQuotes(fallbackSymbols, timeoutMs).catch(() => ({}));
      if (Object.keys(fallbackQuotes).length) {
        writeCache({ ...cachedQuotes, ...liveQuotes, ...fallbackQuotes });
      }
    }

    const mergedCache = Object.keys(liveQuotes).length ? { ...cachedQuotes, ...liveQuotes } : cachedQuotes;
    requestedSymbols.forEach((symbol) => {
      const resolvedSymbol = requestedToResolvedSymbol[symbol];

      if (fallbackQuotes[symbol]) {
        result[symbol] = fallbackQuotes[symbol];
        return;
      }

      if (liveQuotes[resolvedSymbol]) {
        result[symbol] = liveQuotes[resolvedSymbol];
        return;
      }

      if (result[symbol]) return;
      result[symbol] = mergedCache[symbol] || mergedCache[resolvedSymbol] || null;
    });

    return result;
  }

  async function fetchQuote(symbol, options = {}) {
    const quotes = await fetchQuotes([symbol], options);
    return quotes[normalizeSymbol(symbol)] || null;
  }

  window.ESO_QUOTES = {
    fetchQuote,
    fetchQuotes,
    formatPercent,
    formatPrice,
    getCachedQuote,
    getCachedQuotes,
    inferDecimals,
    isFreshQuote,
    normalizeSymbol
  };
})();