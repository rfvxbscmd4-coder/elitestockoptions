(function () {
  const provider = String(window.ESO_CHAT_PROVIDER || 'tawk').toLowerCase();
  const tawkPropertyId = String(window.ESO_TAWK_PROPERTY_ID || '').trim();
  const tawkWidgetId = String(window.ESO_TAWK_WIDGET_ID || '').trim();

  if (provider !== 'tawk') return;

  let tawkLoaded = false;
  let tawkLoading = false;
  let lastSupportOpenAt = 0;
  let suppressNextOpen = false;
  const SUPPORT_POS_KEY = 'eso_support_button_position';

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
        cursor: grab;
        pointer-events: auto;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        display: inline-flex;
        align-items: center;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: #ffffff;
        box-shadow: 0 10px 25px rgba(0,0,0,0.24);
      }
      #globalSupportButton.dragging {
        cursor: grabbing;
        opacity: 0.95;
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

  function openFallbackSupportPanel(message) {
    if (document.getElementById('supportFallbackPanel')) return;

    const helperHint = '<p class="text-xs text-gray-500 mb-4">If live chat is blocked by browser/network privacy settings, retry or email support below.</p>';

    const panel = document.createElement('div');
    panel.id = 'supportFallbackPanel';
    panel.className = 'fixed inset-0 z-[2147483647] bg-black/50 flex items-center justify-center p-4';
    panel.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold text-gray-900">Support Chat Unavailable</h3>
          <button id="supportFallbackClose" class="p-2 rounded-lg hover:bg-gray-100"><i class="fas fa-times"></i></button>
        </div>
        <p class="text-sm text-gray-600 mb-3">${message || 'Live chat is temporarily unavailable. Please try again in a moment.'}</p>
        ${helperHint}
        <div class="space-y-3">
          <button id="supportFallbackRetry" type="button" class="block w-full text-center px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold">Retry Live Chat</button>
          <a href="mailto:support@elitestockoptions.net" class="block text-center px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold">Email Support</a>
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
    document.getElementById('supportFallbackRetry')?.addEventListener('click', function () {
      panel.remove();
      openSupport();
    });
  }

  function openSupport(event) {
    if (suppressNextOpen) {
      suppressNextOpen = false;
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    const now = Date.now();
    if (now - lastSupportOpenAt < 700) {
      return;
    }
    lastSupportOpenAt = now;

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
        try {
          console.warn('[Support Chat] loader error:', error?.message || error);
        } catch (_) {}
        openFallbackSupportPanel('Live chat is temporarily unavailable. Please try again in a moment.');
      });
  }

  function clampSupportPosition(btn, x, y) {
    const maxX = Math.max(8, window.innerWidth - btn.offsetWidth - 8);
    const maxY = Math.max(8, window.innerHeight - btn.offsetHeight - 8);
    return {
      x: Math.min(Math.max(8, x), maxX),
      y: Math.min(Math.max(8, y), maxY)
    };
  }

  function applySupportPosition(btn, x, y) {
    const clamped = clampSupportPosition(btn, x, y);
    btn.style.left = `${clamped.x}px`;
    btn.style.top = `${clamped.y}px`;
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
  }

  function saveSupportPosition(x, y) {
    try {
      localStorage.setItem(SUPPORT_POS_KEY, JSON.stringify({ x, y }));
    } catch (_) {}
  }

  function restoreSupportPosition(btn) {
    try {
      const saved = JSON.parse(localStorage.getItem(SUPPORT_POS_KEY) || 'null');
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        applySupportPosition(btn, saved.x, saved.y);
      }
    } catch (_) {}
  }

  function setupDraggableSupportButton(btn) {
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let baseLeft = 0;
    let baseTop = 0;

    btn.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;

      const rect = btn.getBoundingClientRect();
      applySupportPosition(btn, rect.left, rect.top);

      dragging = false;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      baseLeft = rect.left;
      baseTop = rect.top;

      btn.setPointerCapture?.(pointerId);
    });

    btn.addEventListener('pointermove', function (event) {
      if (pointerId !== event.pointerId) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      if (!dragging && Math.hypot(deltaX, deltaY) < 5) return;

      dragging = true;
      btn.classList.add('dragging');
      applySupportPosition(btn, baseLeft + deltaX, baseTop + deltaY);
      event.preventDefault();
    });

    function finishDrag(event) {
      if (pointerId !== event.pointerId) return;
      btn.releasePointerCapture?.(pointerId);
      pointerId = null;

      if (dragging) {
        const rect = btn.getBoundingClientRect();
        saveSupportPosition(rect.left, rect.top);
        suppressNextOpen = true;
      }

      dragging = false;
      btn.classList.remove('dragging');
    }

    btn.addEventListener('pointerup', finishDrag);
    btn.addEventListener('pointercancel', finishDrag);

    window.addEventListener('resize', function () {
      const rect = btn.getBoundingClientRect();
      applySupportPosition(btn, rect.left, rect.top);
      const next = btn.getBoundingClientRect();
      saveSupportPosition(next.left, next.top);
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

    setupDraggableSupportButton(btn);
    btn.addEventListener('click', openSupport, { passive: false });

    document.body.appendChild(btn);
    restoreSupportPosition(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSupportButton);
  } else {
    createSupportButton();
  }

  ensureTawkLoaded().catch(() => {});
})();
