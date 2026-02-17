(function () {
  function shouldHideOnThisPage() {
    const rawPath = (window.location.pathname || '').toLowerCase();
    const path = rawPath.replace(/\/+$/, '') || '/';
    const hideOnPages = new Set([
      '/',
      '/index',
      '/index.html',
      '/admin',
      '/admin.html',
      '/pages/login',
      '/pages/login.html',
      '/pages/register',
      '/pages/register.html',
      '/pages/dashboard',
      '/pages/dashboard.html'
    ]);

    if (path.endsWith('/elitestockoptions')) return true;
    if (hideOnPages.has(path)) return true;

    const isDashboardInnerPage = path.startsWith('/pages/');
    return !isDashboardInnerPage;
  }

  function getFallbackUrl() {
    const path = (window.location.pathname || '').toLowerCase();

    if (path.includes('/pages/')) {
      return './dashboard.html';
    }

    if (path.endsWith('/admin.html')) {
      return './index.html';
    }

    return './index.html';
  }

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = getFallbackUrl();
  }

  function mountBackButton() {
    if (shouldHideOnThisPage() || document.getElementById('globalBackButton')) return;

    const button = document.createElement('button');
    button.id = 'globalBackButton';
    button.type = 'button';
    button.innerHTML = '<i class="fas fa-arrow-left"></i><span style="margin-left:8px;">Back</span>';
    button.setAttribute('aria-label', 'Go back');
    button.title = 'Go back';
    button.addEventListener('click', handleBack);

    const style = document.createElement('style');
    style.textContent = `
      #globalBackButton {
        position: fixed;
        top: max(12px, env(safe-area-inset-top));
        left: max(16px, env(safe-area-inset-left));
        z-index: 85;
        border: 1px solid rgba(100, 116, 139, 0.35);
        border-radius: 9999px;
        padding: 9px 13px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        background: #ffffff;
        color: #111827;
        box-shadow: 0 10px 25px rgba(0,0,0,0.16);
      }
      html.dark-mode #globalBackButton {
        background: #111827;
        color: #f9fafb;
        border-color: #374151;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(button);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountBackButton);
  } else {
    mountBackButton();
  }
})();
