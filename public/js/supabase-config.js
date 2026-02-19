window.ESO_SUPABASE_URL = 'https://dmncqeczdpxnladdramd.supabase.co';
window.ESO_SUPABASE_ANON_KEY = 'sb_publishable_azANVZBlpJd2dPXy159Fxg_OsO7hkKJ';
window.ESO_CHAT_PROVIDER = 'tawk';
window.ESO_TAWK_PROPERTY_ID = '6996ed8f4f011d1c3d8f5058';
window.ESO_TAWK_WIDGET_ID = 'default';
window.ESO_SMARTSUPP_KEY = 'd258f195df6b89c5a8613da0ea66c14d5227b899'; // deprecated

(function sanitizeUserSession() {
	try {
		const current = JSON.parse(localStorage.getItem('elitestockoptions_user') || 'null');
		if (current && current.isAdmin) {
			localStorage.removeItem('elitestockoptions_user');
		}

		const legacy = JSON.parse(localStorage.getItem('eso_currentUser') || 'null');
		if (legacy && legacy.isAdmin) {
			localStorage.removeItem('eso_currentUser');
		}
	} catch (_) {}
})();

(function enableLiveUserSessionSync() {
	const USER_KEY = 'elitestockoptions_user';
	const USERS_KEY = 'elitestockoptions_users';
	const LEGACY_USERS_KEY = 'eso_users';

	function safeParse(raw, fallback) {
		try {
			return JSON.parse(raw || 'null') ?? fallback;
		} catch (_) {
			return fallback;
		}
	}

	function formatMoney(value) {
		const amount = Number(value || 0);
		return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	function reflectCommonUserUI(user) {
		const totalBalanceEl = document.getElementById('totalBalance');
		const availableCashEl = document.getElementById('availableCash');
		const profitsBalanceEl = document.getElementById('profitsBalance');
		const currentBalanceEl = document.getElementById('currentBalance');
		const currentPlanEl = document.getElementById('currentPlan');
		const userPlanEl = document.getElementById('userPlan');

		if (totalBalanceEl) totalBalanceEl.textContent = formatMoney(user.balance);
		if (availableCashEl) availableCashEl.textContent = formatMoney(user.availableCash);
		if (profitsBalanceEl) profitsBalanceEl.textContent = formatMoney(user.profitsBalance);
		if (currentBalanceEl) currentBalanceEl.textContent = formatMoney(user.balance);
		if (currentPlanEl) currentPlanEl.textContent = user.plan || 'Bronze';
		if (userPlanEl) userPlanEl.textContent = (user.plan || 'Bronze') + ' Plan';
	}

	function hasFinancialChange(currentUser, storeUser) {
		return Number(currentUser.balance || 0) !== Number(storeUser.balance || 0)
			|| Number(currentUser.availableCash || 0) !== Number(storeUser.availableCash || 0)
			|| Number(currentUser.profitsBalance || 0) !== Number(storeUser.profitsBalance || 0)
			|| String(currentUser.plan || '') !== String(storeUser.plan || '')
			|| String(currentUser.kycStatus || '') !== String(storeUser.kycStatus || '')
			|| String(currentUser.id || '') !== String(storeUser.id || '')
			|| String(currentUser.auth_id || '') !== String(storeUser.auth_id || '');
	}

	function resolveLatestUser(currentUser, users) {
		if (!currentUser || !Array.isArray(users) || !users.length) return null;

		const byId = users.find(u => String(u.id || '') === String(currentUser.id || ''));
		if (byId && !byId.isAdmin) return byId;

		const currentEmail = String(currentUser.email || '').toLowerCase();
		const currentAuthId = String(currentUser.auth_id || '');
		if (!currentEmail) return null;

		const emailMatches = users.filter(u => String(u.email || '').toLowerCase() === currentEmail && !u.isAdmin);
		if (!emailMatches.length) return null;

		const authMatch = emailMatches.find(u => String(u.auth_id || '') === currentAuthId && currentAuthId);
		if (authMatch) return authMatch;

		const withAuth = emailMatches.filter(u => !!u.auth_id);
		if (withAuth.length) {
			return withAuth.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
		}

		return emailMatches.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
	}

	function syncUserSessionFromStore() {
		const currentUser = safeParse(localStorage.getItem(USER_KEY), null);
		if (!currentUser || currentUser.isAdmin) return;

		const users = safeParse(localStorage.getItem(USERS_KEY), null)
			|| safeParse(localStorage.getItem(LEGACY_USERS_KEY), []);
		if (!Array.isArray(users) || !users.length) return;

		const latestUser = resolveLatestUser(currentUser, users);
		if (!latestUser || latestUser.isAdmin) return;
		if (!hasFinancialChange(currentUser, latestUser)) return;

		const merged = { ...currentUser, ...latestUser };
		localStorage.setItem(USER_KEY, JSON.stringify(merged));
		localStorage.setItem('eso_currentUser', JSON.stringify(merged));
		reflectCommonUserUI(merged);

		window.dispatchEvent(new CustomEvent('eso:user-session-updated', {
			detail: {
				user: merged,
				source: 'live-users-store-sync',
				at: new Date().toISOString()
			}
		}));
	}

	window.addEventListener('storage', function (event) {
		if (event.key === USERS_KEY || event.key === LEGACY_USERS_KEY) {
			syncUserSessionFromStore();
		}
	});

	document.addEventListener('visibilitychange', function () {
		if (!document.hidden) syncUserSessionFromStore();
	});

	setInterval(syncUserSessionFromStore, 3000);
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', syncUserSessionFromStore);
	} else {
		syncUserSessionFromStore();
	}
})();

