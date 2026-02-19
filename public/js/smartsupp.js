(function () {
  const key = (window.ESO_SMARTSUPP_KEY || '').trim();
  if (!key || key === 'PASTE_YOUR_SMARTSUPP_KEY_HERE') return;

  let smartsuppScriptLoaded = false;
  let openInProgress = false;

  function openFallbackSupportPanel() {
    if (document.getElementById('supportFallbackPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'supportFallbackPanel';
    panel.className = 'fixed inset-0 z-[2147483647] bg-black/50 flex items-center justify-center p-4';
    panel.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold text-gray-900">Support</h3>
          <button id="supportFallbackClose" class="p-2 rounded-lg hover:bg-gray-100"><i class="fas fa-times"></i></button>
        </div>
        <p class="text-sm text-gray-600 mb-4">Live chat is still loading. Please try again in a moment or contact support directly.</p>
        <div class="space-y-3">
          <a href="https://www.smartsupp.com/en/contact-us/" target="_blank" rel="noopener noreferrer" class="block text-center px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold">Open Smartsupp Support</a>
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

  function tryOpenSmartsupp() {
    if (typeof window.smartsupp !== 'function') return false;

    try {
      window.smartsupp('chat:show');
      window.smartsupp('chat:open');
      window.smartsupp('api', 'open');
      return true;
    } catch (_) {
      return false;
    }
  }

  function openSupport(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (openInProgress) return;
    openInProgress = true;

    tryOpenSmartsupp();
    setTimeout(tryOpenSmartsupp, 180);
    setTimeout(tryOpenSmartsupp, 600);

    setTimeout(function () {
      const hasWidget = !!document.querySelector('iframe[src*="smartsupp"], [id*="smartsupp"], [class*="smartsupp"]');
      if (!smartsuppScriptLoaded && !hasWidget) {
        openFallbackSupportPanel();
      }
      openInProgress = false;
    }, 1200);
  }

  function createSupportButton() {
    if (document.getElementById('globalSupportButton')) return;

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

  window._smartsupp = window._smartsupp || {};
  window._smartsupp.key = key;

  if (typeof window.smartsupp !== 'function') {
    const queueFn = function () {
      queueFn._.push(arguments);
    };
    queueFn._ = [];
    window.smartsupp = queueFn;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.smartsuppchat.com/loader.js?';
  script.charset = 'utf-8';
  script.onload = function () {
    smartsuppScriptLoaded = true;
    try {
      const currentUser = JSON.parse(localStorage.getItem('elitestockoptions_user') || localStorage.getItem('eso_currentUser') || 'null');
      if (!currentUser) return;
      const displayName = currentUser.fullName || currentUser.name || '';
      if (displayName) window.smartsupp('name', displayName);
      if (currentUser.email) window.smartsupp('email', currentUser.email);
    } catch (_) {}
  };
  script.onerror = function () {
    smartsuppScriptLoaded = false;
  };
  document.head.appendChild(script);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSupportButton);
  } else {
    createSupportButton();
  }
})();
