window.ESO_SUPABASE_URL = 'https://dmncqeczdpxnladdramd.supabase.co';
window.ESO_SUPABASE_ANON_KEY = 'sb_publishable_azANVZBlpJd2dPXy159Fxg_OsO7hkKJ';
window.ESO_SMARTSUPP_KEY = 'd258f195df6b89c5a8613da0ea66c14d5227b899';

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

