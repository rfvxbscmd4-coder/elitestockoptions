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
  const SUPPORT_PANEL_POS_KEY = 'eso_support_panel_position';

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

      #supportInlinePanel {
        position: fixed;
        right: max(14px, env(safe-area-inset-right));
        bottom: max(14px, env(safe-area-inset-bottom));
        width: min(92vw, 380px);
        height: min(70vh, 560px);
        border-radius: 14px;
        background: #ffffff;
        overflow: hidden;
        z-index: 2147483647;
        border: 1px solid rgba(100, 116, 139, 0.3);
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
        display: flex;
        flex-direction: column;
      }
      #supportInlinePanel.support-panel-full {
        top: max(8px, env(safe-area-inset-top));
        left: max(8px, env(safe-area-inset-left));
        right: max(8px, env(safe-area-inset-right));
        bottom: max(8px, env(safe-area-inset-bottom));
        width: auto;
        height: auto;
      }
      #supportInlineHeader {
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: #ffffff;
        padding: 0 10px 0 12px;
        cursor: move;
        user-select: none;
      }
      #supportInlineActions {
        display: inline-flex;
        gap: 6px;
      }
      .support-inline-btn {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: 0;
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        cursor: pointer;
      }
      .support-inline-btn:hover {
        background: rgba(255, 255, 255, 0.25);
      }
      #supportInlineFrame {
        width: 100%;
        height: calc(100% - 44px);
        border: 0;
        background: #ffffff;
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

  function clampPanelPosition(panel, x, y) {
    const maxX = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
    const maxY = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
    return {
      x: Math.min(Math.max(8, x), maxX),
      y: Math.min(Math.max(8, y), maxY)
    };
  }

  function applyPanelPosition(panel, x, y) {
    const clamped = clampPanelPosition(panel, x, y);
    panel.style.left = `${clamped.x}px`;
    panel.style.top = `${clamped.y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  function savePanelPosition(x, y) {
    try {
      localStorage.setItem(SUPPORT_PANEL_POS_KEY, JSON.stringify({ x, y }));
    } catch (_) {}
  }

  function restorePanelPosition(panel) {
    try {
      const saved = JSON.parse(localStorage.getItem(SUPPORT_PANEL_POS_KEY) || 'null');
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        applyPanelPosition(panel, saved.x, saved.y);
      }
    } catch (_) {}
  }

  function setupDraggableInlinePanel(panel, dragHandle) {
    let pointerId = null;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let baseLeft = 0;
    let baseTop = 0;

    dragHandle.addEventListener('pointerdown', function (event) {
      if (panel.classList.contains('support-panel-full')) return;
      if (event.button !== 0) return;

      const rect = panel.getBoundingClientRect();
      applyPanelPosition(panel, rect.left, rect.top);
      pointerId = event.pointerId;
      dragging = false;
      startX = event.clientX;
      startY = event.clientY;
      baseLeft = rect.left;
      baseTop = rect.top;
      dragHandle.setPointerCapture?.(pointerId);
    });

    dragHandle.addEventListener('pointermove', function (event) {
      if (pointerId !== event.pointerId) return;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      if (!dragging && Math.hypot(deltaX, deltaY) < 5) return;
      dragging = true;
      applyPanelPosition(panel, baseLeft + deltaX, baseTop + deltaY);
      event.preventDefault();
    });

    function finishDrag(event) {
      if (pointerId !== event.pointerId) return;
      dragHandle.releasePointerCapture?.(pointerId);
      pointerId = null;
      if (dragging) {
        const rect = panel.getBoundingClientRect();
        savePanelPosition(rect.left, rect.top);
      }
      dragging = false;
    }

    dragHandle.addEventListener('pointerup', finishDrag);
    dragHandle.addEventListener('pointercancel', finishDrag);
  }

  function openInlineChatPanel() {
    if (!tawkPropertyId || !tawkWidgetId) {
      window.location.href = 'mailto:support@elitestockoptions.net';
      return;
    }

    const existing = document.getElementById('supportInlinePanel');
    if (existing) {
      existing.style.display = 'flex';
      return;
    }

    const directUrl = `https://tawk.to/chat/${encodeURIComponent(tawkPropertyId)}/${encodeURIComponent(tawkWidgetId)}`;
    const panel = document.createElement('div');
    panel.id = 'supportInlinePanel';
    panel.innerHTML = `
      <div id="supportInlineHeader">
        <div class="text-sm font-semibold"><i class="fas fa-headset mr-2"></i>Support Chat</div>
        <div id="supportInlineActions">
          <button id="supportInlineExpand" class="support-inline-btn" type="button" aria-label="Toggle full screen"><i class="fas fa-expand"></i></button>
          <button id="supportInlineClose" class="support-inline-btn" type="button" aria-label="Close chat"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <iframe id="supportInlineFrame" src="${directUrl}" title="Support Chat"></iframe>
    `;

    document.body.appendChild(panel);
    restorePanelPosition(panel);

    const header = document.getElementById('supportInlineHeader');
    const expandBtn = document.getElementById('supportInlineExpand');
    const closeBtn = document.getElementById('supportInlineClose');

    if (header) {
      setupDraggableInlinePanel(panel, header);
    }

    expandBtn?.addEventListener('click', function () {
      panel.classList.toggle('support-panel-full');
      if (!panel.classList.contains('support-panel-full')) {
        const rect = panel.getBoundingClientRect();
        savePanelPosition(rect.left, rect.top);
      }
    });

    closeBtn?.addEventListener('click', function () {
      panel.style.display = 'none';
    });

    window.addEventListener('resize', function () {
      if (panel.classList.contains('support-panel-full')) return;
      const rect = panel.getBoundingClientRect();
      applyPanelPosition(panel, rect.left, rect.top);
      const next = panel.getBoundingClientRect();
      savePanelPosition(next.left, next.top);
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
      if (event.pointerType === 'mouse' && event.button !== 0) return;

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
      } else {
        openSupport(event);
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
