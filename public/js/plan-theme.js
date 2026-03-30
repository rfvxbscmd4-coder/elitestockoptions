(function () {
  const THEMES = {
    bronze: {
      name: 'Bronze',
      icon: 'fas fa-medal',
      gradient: 'linear-gradient(135deg, #92400e 0%, #d97706 100%)',
      badgeBackground: '#fef3c7',
      badgeText: '#92400e',
      badgeBorder: 'rgba(217, 119, 6, 0.28)',
      headingColor: '#92400e',
      accentColor: '#b45309'
    },
    silver: {
      name: 'Silver',
      icon: 'fas fa-shield-halved',
      gradient: 'linear-gradient(135deg, #cbd5e1 0%, #64748b 100%)',
      badgeBackground: '#f1f5f9',
      badgeText: '#475569',
      badgeBorder: 'rgba(100, 116, 139, 0.24)',
      headingColor: '#64748b',
      accentColor: '#475569'
    },
    gold: {
      name: 'Gold',
      icon: 'fas fa-crown',
      gradient: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
      badgeBackground: '#fef3c7',
      badgeText: '#b45309',
      badgeBorder: 'rgba(245, 158, 11, 0.28)',
      headingColor: '#d97706',
      accentColor: '#b45309'
    },
    diamond: {
      name: 'Diamond',
      icon: 'fas fa-gem',
      gradient: 'linear-gradient(135deg, #67e8f9 0%, #0284c7 100%)',
      badgeBackground: '#e0f2fe',
      badgeText: '#0369a1',
      badgeBorder: 'rgba(14, 165, 233, 0.26)',
      headingColor: '#0284c7',
      accentColor: '#0369a1'
    },
    premium: {
      name: 'Premium',
      icon: 'fas fa-star',
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #a21caf 50%, #06b6d4 100%)',
      badgeBackground: '#f5f3ff',
      badgeText: '#7c3aed',
      badgeBorder: 'rgba(124, 58, 237, 0.24)',
      headingColor: '#7c3aed',
      accentColor: '#6d28d9'
    }
  };

  function ensureStyles() {
    if (document.getElementById('esoPlanThemeStyles')) return;

    const style = document.createElement('style');
    style.id = 'esoPlanThemeStyles';
    style.textContent = `
      .eso-plan-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        border-radius: 9999px;
        font-weight: 700;
        letter-spacing: 0.01em;
        white-space: nowrap;
        vertical-align: middle;
      }
      .eso-plan-badge--sm {
        padding: 0.2rem 0.55rem;
        font-size: 0.7rem;
        line-height: 1;
      }
      .eso-plan-badge--md {
        padding: 0.35rem 0.75rem;
        font-size: 0.75rem;
        line-height: 1;
      }
      .eso-plan-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
      }
      .eso-plan-icon--sm {
        width: 2rem;
        height: 2rem;
        border-radius: 0.75rem;
        font-size: 0.85rem;
      }
      .eso-plan-icon--md {
        width: 3rem;
        height: 3rem;
        border-radius: 0.9rem;
        font-size: 1rem;
      }
    `;

    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizePlan(plan) {
    const normalized = String(plan || 'Bronze').trim().toLowerCase();
    return THEMES[normalized] ? normalized : 'bronze';
  }

  function getTheme(plan) {
    ensureStyles();
    return THEMES[normalizePlan(plan)];
  }

  function renderBadge(plan, options = {}) {
    const theme = getTheme(plan);
    const size = options.size === 'sm' ? 'eso-plan-badge--sm' : 'eso-plan-badge--md';
    const label = escapeHtml(options.label || theme.name);
    const icon = options.showIcon === false ? '' : `<i class="${theme.icon}" aria-hidden="true"></i>`;

    return `<span class="eso-plan-badge ${size}" style="background:${theme.badgeBackground};color:${theme.badgeText};border:1px solid ${theme.badgeBorder};">${icon}<span>${label}</span></span>`;
  }

  function renderIcon(plan, options = {}) {
    const theme = getTheme(plan);
    const size = options.size === 'sm' ? 'eso-plan-icon--sm' : 'eso-plan-icon--md';
    return `<span class="eso-plan-icon ${size}" style="background:${theme.gradient};"><i class="${theme.icon}" aria-hidden="true"></i></span>`;
  }

  window.ESO_PLANS = {
    normalizePlan,
    getTheme,
    renderBadge,
    renderIcon
  };
})();