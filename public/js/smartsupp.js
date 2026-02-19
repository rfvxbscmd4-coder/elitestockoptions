(function () {
  const provider = String(window.ESO_CHAT_PROVIDER || 'tawk').toLowerCase();
  const tawkPropertyId = String(window.ESO_TAWK_PROPERTY_ID || '').trim();
  const tawkWidgetId = String(window.ESO_TAWK_WIDGET_ID || '').trim();

  if (provider !== 'tawk') return;

  let tawkLoaded = false;
  let tawkLoading = false;

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('elitestockoptions_user') || localStorage.getItem('eso_currentUser') || 'null');
    } catch (_) {
      return null;
    }
  }

  function injectSupportStyles() {
    if (document.getElementById('globalSupportButtonStyles')) return;

    const style = document.createElement('style');
    style.id = 'globalSupportButtonStyles';
    style.textContent = `
      #globalSupportButton {
        position: fixed;
        left: max(16px, env(safe-area-inset-left));
        bottom: max(74px, calc(env(safe-area-inset-bottom) + 74px));
        z-index: 2147483646;
        border: 1px solid rgba(100, 116, 139, 0.35);
        border-radius: 9999px;
        padding: 11px 15px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        pointer-events: auto;
        touch-action: manipulation;
        display: inline-flex;
        align-items: center;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: #ffffff;
        box-shadow: 0 10px 25px rgba(0,0,0,0.24);
      }
      #globalSupportButton:hover { opacity: 0.95; }
      #globalSupportButton i { margin-right: 8px; }
      @media (max-width: 640px) {
        #globalSupportButton { font-size: 13px; padding: 10px 13px; }
      }
    `;
    document.head.appendChild(style);
  }

  function setVisitorData() {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) return;
      if (!window.Tawk_API) return;

      const visitor = {
        name: currentUser.fullName || currentUser.name || '',
        email: currentUser.email || ''
      };

      window.Tawk_API.visitor = visitor;

      if (currentUser.email) {
        window.Tawk_API.setAttributes(visitor, function () {});
      }
    } catch (_) {}
  }

  function ensureTawkLoaded() {
    return new Promise((resolve, reject) => {
      if (tawkLoaded || (window.Tawk_API && typeof window.Tawk_API.maximize === 'function')) {
        tawkLoaded = true;
        resolve(true);
        return;
      }

      if (!tawkPropertyId || !tawkWidgetId) {
        reject(new Error('Missing Tawk.to property/widget config'));
        return;
      }

      if (tawkLoading) {
        const wait = setInterval(() => {
          if (tawkLoaded || (window.Tawk_API && typeof window.Tawk_API.maximize === 'function')) {
            clearInterval(wait);
            resolve(true);
          }
        }, 250);
        setTimeout(() => {
          clearInterval(wait);
          reject(new Error('Tawk.to load timeout'));
        }, 12000);
        return;
      }

      tawkLoading = true;
      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_LoadStart = new Date();

      const currentUser = getCurrentUser();
      if (currentUser?.email) {
        window.Tawk_API.visitor = {
          name: currentUser.fullName || currentUser.name || '',
          email: currentUser.email
        };
      }

      window.Tawk_API.onLoad = function () {
        tawkLoaded = true;
        tawkLoading = false;
        setVisitorData();
      };

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://embed.tawk.to/${encodeURIComponent(tawkPropertyId)}/${encodeURIComponent(tawkWidgetId)}`;
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');

      script.onload = function () {
        tawkLoaded = true;
        tawkLoading = false;
        setTimeout(setVisitorData, 300);
        resolve(true);
      };

      script.onerror = function () {
        tawkLoaded = false;
        tawkLoading = false;
        reject(new Error('Tawk.to script failed to load'));
      };

      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    });
  }

  function openFallbackSupportPanel(message, isConfigIssue) {
    if (document.getElementById('supportFallbackPanel')) return;

    const configHint = isConfigIssue
      ? '<p class="text-xs text-gray-500 mb-4">Please set <strong>ESO_TAWK_PROPERTY_ID</strong> and <strong>ESO_TAWK_WIDGET_ID</strong> in config.</p>'
      : '<p class="text-xs text-gray-500 mb-4">The Tawk script looks blocked by browser/network (commonly ad blockers, private DNS, or strict privacy mode).</p>';

    const directChatUrl = (tawkPropertyId && tawkWidgetId)
      ? `https://tawk.to/chat/${encodeURIComponent(tawkPropertyId)}/${encodeURIComponent(tawkWidgetId)}`
      : 'https://dashboard.tawk.to/';

    const panel = document.createElement('div');
    panel.id = 'supportFallbackPanel';
    panel.className = 'fixed inset-0 z-[2147483647] bg-black/50 flex items-center justify-center p-4';
    panel.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold text-gray-900">Support Chat Unavailable</h3>
          <button id="supportFallbackClose" class="p-2 rounded-lg hover:bg-gray-100"><i class="fas fa-times"></i></button>
        </div>
        <p class="text-sm text-gray-600 mb-3">${message || 'Live support could not start right now.'}</p>
        ${configHint}
        <div class="space-y-3">
          <a href="https://dashboard.tawk.to/" target="_blank" rel="noopener noreferrer" class="block text-center px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold">Open Tawk Dashboard</a>
          <a href="${directChatUrl}" target="_blank" rel="noopener noreferrer" class="block text-center px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold">Open Chat In New Tab</a>
          <a href="mailto:support@elitestockoptions.com" class="block text-center px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold">Email Support</a>
        </div>
      </div>
    `;

    panel.addEventListener('click', function (e) {
      if (e.target === panel) panel.remove();
    });

    document.body.appendChild(panel);
    document.getElementById('supportFallbackClose')?.addEventListener('click', function () {
      panel.remove();
    });
  }

  function openSupport(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    ensureTawkLoaded()
      .then(() => {
        try {
          if (window.Tawk_API && typeof window.Tawk_API.showWidget === 'function') {
            window.Tawk_API.showWidget();
          }
          if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
            window.Tawk_API.maximize();
          }
        } catch (_) {}
      })
      .catch((error) => {
        const message = error?.message || 'Support chat is unavailable.';
        const isConfigIssue = /Missing Tawk\.to property\/widget config/i.test(message);
        openFallbackSupportPanel(message, isConfigIssue);
      });
  }

  function createSupportButton() {
    if (document.getElementById('globalSupportButton')) return;

    injectSupportStyles();

    const btn = document.createElement('button');
    btn.id = 'globalSupportButton';
    btn.type = 'button';
    btn.innerHTML = '<i class="fas fa-headset"></i>Support';
    btn.setAttribute('aria-label', 'Open support chat');
    btn.title = 'Open support chat';

    btn.addEventListener('click', openSupport, { passive: false });
    btn.addEventListener('touchend', openSupport, { passive: false });

    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSupportButton);
  } else {
    createSupportButton();
  }

  ensureTawkLoaded().catch(() => {});
})();
