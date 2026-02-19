(function () {
  const CRYPTO_ICON_BASE = 'https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color';
  const STOCK_ICON_BASE = 'https://financialmodelingprep.com/image-stock';

  const STOCK_TO_DOMAIN = {
    AAPL: 'apple.com',
    MSFT: 'microsoft.com',
    GOOGL: 'google.com',
    GOOG: 'google.com',
    AMZN: 'amazon.com',
    TSLA: 'tesla.com',
    META: 'meta.com',
    NVDA: 'nvidia.com',
    NFLX: 'netflix.com'
  };

  const BOND_FLAG_BY_PREFIX = {
    US: 'us',
    DE: 'de',
    FR: 'fr',
    IT: 'it',
    ES: 'es',
    GB: 'gb',
    UK: 'gb',
    JP: 'jp',
    AU: 'au',
    CA: 'ca',
    CN: 'cn',
    IN: 'in',
    BR: 'br'
  };

  function normalizeSymbol(raw) {
    if (!raw) return '';
    const withNoExchange = String(raw).split(':').pop() || '';
    return withNoExchange.trim().toUpperCase();
  }

  function extractBaseSymbol(raw) {
    const symbol = normalizeSymbol(raw);
    if (!symbol) return '';

    if (symbol.includes('/')) return symbol.split('/')[0];
    if (symbol.endsWith('USDT')) return symbol.replace(/USDT$/, '');
    if (symbol.endsWith('USD') && symbol.length > 3) return symbol.replace(/USD$/, '');
    if (symbol.includes('=F')) return symbol.split('=')[0];
    if (symbol.endsWith('1!')) return symbol.replace(/1!$/, '');
    if (symbol.includes('-')) return symbol.split('-')[0];
    return symbol;
  }

  function likelyCrypto(base) {
    return /^[A-Z0-9]{2,6}$/.test(base) && [
      'BTC','ETH','SOL','BNB','XRP','ADA','DOGE','DOT','MATIC','AVAX','LINK','LTC','UNI','ATOM','ETC','TRX','XLM','BCH','SHIB','NEAR','FTM','HBAR','ICP','RUNE','XMR','NEO','QTUM','FIL','VET','EOS','AAVE','MKR','YFI','SNX','CRV','GRT','BAT','ENJ','MANA','SAND','AXS','CHZ','FLOW','THETA','ALGO','XTZ','CAKE','DASH','ZEC'
    ].includes(base);
  }

  function bondFlagCandidate(raw) {
    const symbol = normalizeSymbol(raw);
    const base = extractBaseSymbol(raw);

    const token = symbol || base;
    const countryPrefix = token.match(/^(US|DE|FR|IT|ES|GB|UK|JP|AU|CA|CN|IN|BR)/);
    if (!countryPrefix) return null;

    if (!/(\d+Y|\d+W)$/i.test(token)) return null;

    const cc = BOND_FLAG_BY_PREFIX[countryPrefix[1]];
    if (!cc) return null;
    return `https://flagcdn.com/w40/${cc}.png`;
  }

  function stockTicker(raw) {
    const base = extractBaseSymbol(raw);
    if (!base) return '';
    return base.replace(/\./g, '-');
  }

  function logoCandidates(raw) {
    const base = extractBaseSymbol(raw);
    const ticker = stockTicker(raw);

    const candidates = [];

    const bondFlag = bondFlagCandidate(raw);
    if (bondFlag) candidates.push(bondFlag);

    if (likelyCrypto(base)) {
      candidates.push(`${CRYPTO_ICON_BASE}/${base.toLowerCase()}.png`);
      if (base === 'BTC') candidates.push('https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=026');
      if (base === 'ETH') candidates.push('https://cryptologos.cc/logos/ethereum-eth-logo.png?v=026');
      if (base === 'SOL') candidates.push('https://cryptologos.cc/logos/solana-sol-logo.png?v=026');
    }

    if (ticker) {
      candidates.push(`${STOCK_ICON_BASE}/${encodeURIComponent(ticker)}.png`);
    }

    if (STOCK_TO_DOMAIN[base]) {
      candidates.push(`https://logo.clearbit.com/${STOCK_TO_DOMAIN[base]}`);
    }

    return candidates;
  }

  function renderLogo(rawSymbol, altText, fallbackIconClass, fallbackBgClass) {
    const candidates = logoCandidates(rawSymbol);
    const symbol = extractBaseSymbol(rawSymbol) || '?';
    const fallbackIcon = fallbackIconClass || 'fas fa-chart-line';
    const fallbackBg = fallbackBgClass || 'bg-gray-100';

    if (!candidates.length) {
      return `<div class="w-8 h-8 rounded-lg ${fallbackBg} flex items-center justify-center"><i class="${fallbackIcon} text-white text-xs"></i></div>`;
    }

    const dataAttr = candidates.map(c => encodeURIComponent(c)).join('|');
    return `<div class="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
      <img src="${candidates[0]}" alt="${altText || symbol} logo" class="w-6 h-6 object-contain" loading="lazy" data-logo-candidates="${dataAttr}" data-logo-index="0" onerror="window.ESO_ASSETS && window.ESO_ASSETS.handleLogoError(this, '${symbol}', '${fallbackIcon.replace(/'/g, "\\'")}')">
    </div>`;
  }

  function handleLogoError(img, symbol, fallbackIconClass) {
    try {
      const encoded = (img.getAttribute('data-logo-candidates') || '').split('|').filter(Boolean);
      const candidates = encoded.map(c => decodeURIComponent(c));
      const index = Number(img.getAttribute('data-logo-index') || '0');
      const next = index + 1;

      if (next < candidates.length) {
        img.setAttribute('data-logo-index', String(next));
        img.src = candidates[next];
        return;
      }

      const parent = img.parentElement;
      if (parent) {
        parent.innerHTML = `<span class="text-xs font-bold text-gray-700">${(symbol || '?').slice(0, 1)}</span>`;
      }
    } catch (_) {
      const parent = img.parentElement;
      if (parent) {
        parent.innerHTML = `<i class="${fallbackIconClass || 'fas fa-chart-line'} text-gray-700 text-xs"></i>`;
      }
    }
  }

  window.ESO_ASSETS = {
    extractBaseSymbol,
    renderLogo,
    handleLogoError
  };
})();
