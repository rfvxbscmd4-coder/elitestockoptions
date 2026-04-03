window.ESO_SUPABASE_URL = 'https://dmncqeczdpxnladdramd.supabase.co';
window.ESO_SUPABASE_ANON_KEY = 'sb_publishable_azANVZBlpJd2dPXy159Fxg_OsO7hkKJ';
window.ESO_EMAIL_PROVIDER = 'none';
window.ESO_EMAILJS_PUBLIC_KEY = '';
window.ESO_EMAILJS_SERVICE_ID = '';
window.ESO_EMAILJS_TEMPLATE_ID = '';
window.ESO_EMAIL_FROM_NAME = 'ELITESTOCKOPTIONS Admin';
window.ESO_EMAIL_FROM_ADDRESS = 'support@elitestockoptions.net';
window.ESO_CHAT_PROVIDER = 'tawk';
window.ESO_TAWK_PROPERTY_ID = '6996ed8f4f011d1c3d8f5058';
window.ESO_TAWK_WIDGET_ID = 'default';
window.ESO_CANONICAL_HOST = 'www.elitestockoptions.net';

(function enforceCanonicalHost() {
	try {
		const canonicalHost = String(window.ESO_CANONICAL_HOST || '').trim();
		if (!canonicalHost) return;

		const currentHost = String(window.location.hostname || '').trim().toLowerCase();
		if (!currentHost || currentHost === canonicalHost.toLowerCase()) return;

		const isLocal = currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost.endsWith('.local');
		if (isLocal) return;

		const knownHosts = new Set(['elitestockoptions.net', 'www.elitestockoptions.net']);
		if (!knownHosts.has(currentHost)) return;

		const target = `${window.location.protocol}//${canonicalHost}${window.location.pathname}${window.location.search}${window.location.hash}`;
		window.location.replace(target);
	} catch (_) {}
})();

(function forwardRecoveryFlowToResetPage() {
	try {
		const path = String(window.location.pathname || '').toLowerCase();
		const isResetPage = path.endsWith('/reset-password.html') || path.endsWith('/pages/reset-password.html');
		const isAuthConfirmPage = path.endsWith('/auth-confirm.html') || path.endsWith('/auth/confirm') || path.endsWith('/pages/auth/confirm');
		if (isResetPage || isAuthConfirmPage) return;

		const search = String(window.location.search || '');
		const hash = String(window.location.hash || '');
		const hasRecoveryState = /(?:^|[?#&])(type=recovery|token_hash=|code=)/i.test(search)
			|| /(?:^|[#&])(type=recovery|access_token=|token_hash=|code=)/i.test(hash);
		if (!hasRecoveryState) return;

		const target = `${window.location.origin}/reset-password.html${search}${hash}`;
		window.location.replace(target);
	} catch (_) {}
})();

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

	function getDisplayName(user) {
		const rawName = String(user?.fullName || user?.name || '').trim();
		if (rawName) return rawName;

		const email = String(user?.email || '').trim().toLowerCase();
		if (email.includes('@')) {
			return email.split('@')[0];
		}

		return 'Trader';
	}

	function hasKycSubmission(userLike) {
		if (!userLike) return false;
		if (userLike.kycData || userLike.kycSubmittedAt) return true;

		const docs = userLike.kycDocuments || {};
		return !!(docs.front || docs.back || docs.selfie);
	}

	function getUserSyncTimestamp(userLike) {
		const timestamp = new Date(userLike?.updatedAt || userLike?.createdAt || 0).getTime();
		return Number.isFinite(timestamp) ? timestamp : 0;
	}

	function mergeUserData(targetUser, sourceUser) {
		if (!targetUser || !sourceUser) return targetUser;

		const sourceIsNewer = getUserSyncTimestamp(sourceUser) > getUserSyncTimestamp(targetUser);

		const sourceDisplayName = String(sourceUser.fullName || sourceUser.name || '').trim();
		if (!targetUser.fullName && sourceDisplayName) {
			targetUser.fullName = sourceDisplayName;
		}
		if (!targetUser.name && sourceDisplayName) {
			targetUser.name = sourceDisplayName;
		}

		['email', 'phone', 'countryCode', 'phoneNumber', 'country', 'referralCode', 'password', 'auth_id', 'id', 'createdAt'].forEach((field) => {
			if (!targetUser[field] && sourceUser[field]) {
				targetUser[field] = sourceUser[field];
			}
		});

		['balance', 'availableCash', 'profitsBalance'].forEach((field) => {
			const targetValue = Number(targetUser[field] || 0);
			const sourceValue = Number(sourceUser[field] || 0);
			if ((sourceIsNewer && targetValue !== sourceValue) || (targetValue === 0 && sourceValue !== 0)) {
				targetUser[field] = sourceValue;
			}
		});

		if ((sourceIsNewer && sourceUser.plan && sourceUser.plan !== targetUser.plan)
			|| ((!targetUser.plan || String(targetUser.plan).toLowerCase() === 'bronze') && sourceUser.plan)) {
			targetUser.plan = sourceUser.plan;
		}

		const targetKycStatus = String(targetUser.kycStatus || '').trim().toLowerCase();
		const sourceKycStatus = String(sourceUser.kycStatus || '').trim().toLowerCase();
		const targetMissingKyc = !targetKycStatus
			|| targetKycStatus === 'not_submitted'
			|| (targetKycStatus === 'pending' && !hasKycSubmission(targetUser));
		const sourceHasKyc = sourceKycStatus === 'verified'
			|| sourceKycStatus === 'rejected'
			|| hasKycSubmission(sourceUser);

		if (targetMissingKyc && sourceHasKyc) {
			targetUser.kycStatus = sourceUser.kycStatus || 'pending';
		}
		if (!targetUser.kycSubmittedAt && sourceUser.kycSubmittedAt) {
			targetUser.kycSubmittedAt = sourceUser.kycSubmittedAt;
		}
		if (!targetUser.kycVerifiedAt && sourceUser.kycVerifiedAt) {
			targetUser.kycVerifiedAt = sourceUser.kycVerifiedAt;
		}
		if (!targetUser.kycData && sourceUser.kycData) {
			targetUser.kycData = sourceUser.kycData;
		}
		if (!targetUser.kycDocuments && sourceUser.kycDocuments) {
			targetUser.kycDocuments = sourceUser.kycDocuments;
		}

		if (sourceIsNewer || (!targetUser.updatedAt && sourceUser.updatedAt)) {
			targetUser.updatedAt = sourceUser.updatedAt;
		}

		return targetUser;
	}

	function getUserRank(userLike, currentUser) {
		if (!userLike || userLike.isAdmin) return Number.NEGATIVE_INFINITY;

		const currentAuthId = String(currentUser?.auth_id || '');
		const currentId = String(currentUser?.id || '');
		const displayName = getDisplayName(userLike);
		const emailPrefix = String(userLike?.email || '').trim().toLowerCase().split('@')[0] || '';
		let score = 0;

		if (currentAuthId && String(userLike.auth_id || '') === currentAuthId) score += 20;
		if (currentId && String(userLike.id || '') === currentId) score += 10;
		if (displayName && displayName.toLowerCase() !== emailPrefix) score += 20;
		if (Number(userLike.balance || 0) !== 0) score += 18;
		if (Number(userLike.availableCash || 0) !== 0) score += 12;
		if (Number(userLike.profitsBalance || 0) !== 0) score += 12;
		if (String(userLike.plan || '').trim().toLowerCase() && String(userLike.plan || '').trim().toLowerCase() !== 'bronze') score += 8;
		if (userLike.phone || userLike.phoneNumber) score += 6;
		if (String(userLike.kycStatus || '').trim().toLowerCase() === 'verified') score += 8;
		else if (hasKycSubmission(userLike)) score += 4;

		const recency = new Date(userLike.updatedAt || userLike.createdAt || 0).getTime();
		if (Number.isFinite(recency)) {
			score += recency / 1e15;
		}

		return score;
	}

	function writeUserCache(userLike) {
		const fullUser = userLike ? { ...userLike } : null;
		if (!fullUser) return;

		try {
			const serialized = JSON.stringify(fullUser);
			localStorage.setItem(USER_KEY, serialized);
			localStorage.setItem('eso_currentUser', serialized);
			return;
		} catch (error) {
			console.warn('Could not persist full shared-session cache, retrying with trimmed media fields', error);
		}

		const fallbackUser = {
			...fullUser,
			kycDocuments: null,
			profilePhoto: null,
			avatar: fullUser.avatar || null
		};

		try {
			const serializedFallback = JSON.stringify(fallbackUser);
			localStorage.setItem(USER_KEY, serializedFallback);
			localStorage.setItem('eso_currentUser', serializedFallback);
		} catch (error) {
			console.warn('Could not persist trimmed shared-session cache', error);
		}
	}

	function reflectCommonUserUI(user) {
		const totalBalanceEl = document.getElementById('totalBalance');
		const availableCashEl = document.getElementById('availableCash');
		const profitsBalanceEl = document.getElementById('profitsBalance');
		const currentBalanceEl = document.getElementById('currentBalance');
		const currentPlanEl = document.getElementById('currentPlan');
		const userPlanEl = document.getElementById('userPlan');
		const userNameEl = document.getElementById('userName');
		const headerUserNameEl = document.getElementById('headerUserName');
		const userAvatarEl = document.getElementById('userAvatar');
		const displayName = getDisplayName(user);

		if (totalBalanceEl) totalBalanceEl.textContent = formatMoney(user.balance);
		if (availableCashEl) availableCashEl.textContent = formatMoney(user.availableCash);
		if (profitsBalanceEl) profitsBalanceEl.textContent = formatMoney(user.profitsBalance);
		if (currentBalanceEl) currentBalanceEl.textContent = formatMoney(user.balance);
		if (currentPlanEl) currentPlanEl.textContent = user.plan || 'Bronze';
		if (userPlanEl) userPlanEl.textContent = (user.plan || 'Bronze') + ' Plan';
		if (userNameEl) userNameEl.textContent = displayName.split(' ')[0] || 'Trader';
		if (headerUserNameEl) headerUserNameEl.textContent = displayName || 'Trader';
		if (userAvatarEl && !userAvatarEl.querySelector('img')) userAvatarEl.textContent = (displayName[0] || 'T').toUpperCase();
	}

	function hasFinancialChange(currentUser, storeUser) {
		return Number(currentUser.balance || 0) !== Number(storeUser.balance || 0)
			|| Number(currentUser.availableCash || 0) !== Number(storeUser.availableCash || 0)
			|| Number(currentUser.profitsBalance || 0) !== Number(storeUser.profitsBalance || 0)
			|| String(currentUser.plan || '') !== String(storeUser.plan || '')
			|| String(currentUser.kycStatus || '') !== String(storeUser.kycStatus || '')
			|| String(currentUser.fullName || currentUser.name || '') !== String(storeUser.fullName || storeUser.name || '')
			|| String(currentUser.id || '') !== String(storeUser.id || '')
			|| String(currentUser.auth_id || '') !== String(storeUser.auth_id || '');
	}

	function resolveLatestUser(currentUser, users) {
		if (!currentUser || !Array.isArray(users) || !users.length) return null;
		const currentEmail = String(currentUser.email || '').toLowerCase();
		const currentAuthId = String(currentUser.auth_id || '');
		const currentId = String(currentUser.id || '');

		const candidates = users.filter((userLike) => {
			if (!userLike || userLike.isAdmin) return false;
			const sameId = currentId && String(userLike.id || '') === currentId;
			const sameAuth = currentAuthId && String(userLike.auth_id || '') === currentAuthId;
			const sameEmail = currentEmail && String(userLike.email || '').toLowerCase() === currentEmail;
			return sameId || sameAuth || sameEmail;
		});
		if (!candidates.length) return null;

		const ranked = candidates
			.map((userLike) => ({ user: userLike, score: getUserRank(userLike, currentUser) }))
			.sort((a, b) => b.score - a.score);

		let canonical = { ...ranked[0].user };
		ranked.slice(1).forEach(({ user }) => {
			canonical = mergeUserData(canonical, user);
		});

		canonical = mergeUserData(canonical, currentUser);
		if (!canonical.fullName && canonical.name) canonical.fullName = canonical.name;
		if (!canonical.name && canonical.fullName) canonical.name = canonical.fullName;
		return canonical;
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

		const merged = mergeUserData({ ...latestUser }, currentUser);
		if (!merged.fullName && merged.name) merged.fullName = merged.name;
		if (!merged.name && merged.fullName) merged.name = merged.fullName;
		writeUserCache(merged);
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

