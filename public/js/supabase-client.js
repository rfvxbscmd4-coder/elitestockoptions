(function () {
  const SUPABASE_URL = window.ESO_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
  const SUPABASE_ANON_KEY = window.ESO_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
  let lastError = null;

  function getAuthScope() {
    const path = String(window.location.pathname || '').toLowerCase();
    return /(?:^|\/)admin\.html$/.test(path) ? 'admin' : 'user';
  }

  function getAuthStorageKey() {
    return `eso-supabase-auth-${getAuthScope()}`;
  }

  function isConfigured() {
    return (
      typeof window.supabase !== 'undefined' &&
      SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
      !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')
    );
  }

  function getClient() {
    if (!isConfigured()) return null;
    if (!window.__esoSupabaseClient) {
      window.__esoSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storageKey: getAuthStorageKey(),
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return window.__esoSupabaseClient;
  }

  const USER_COLUMNS = [
    'id',
    'auth_id',
    'fullName',
    'email',
    'phone',
    'countryCode',
    'phoneNumber',
    'country',
    'referralCode',
    'password',
    'plan',
    'balance',
    'availableCash',
    'profitsBalance',
    'kycStatus',
    'kycSubmittedAt',
    'kycVerifiedAt',
    'kycData',
    'kycDocuments',
    'updatedAt',
    'createdAt',
    'isAdmin'
  ];

  function sanitizeUserPayload(user) {
    if (!user || typeof user !== 'object') return user;

    const payload = {};
    USER_COLUMNS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(user, key) && typeof user[key] !== 'undefined') {
        payload[key] = user[key];
      }
    });

    if (payload.email) {
      payload.email = String(payload.email).trim().toLowerCase();
    }

    return payload;
  }

  async function safe(promiseFactory) {
    lastError = null;
    try {
      return await promiseFactory();
    } catch (error) {
      lastError = error;
      console.error('Supabase error:', error);
      return null;
    }
  }

  const ESO_DB = {
    isReady() {
      return !!getClient();
    },

    getLastError() {
      return lastError;
    },

    async getAuthUser() {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client.auth.getUser();
        if (error) throw error;
        return data?.user || null;
      });
    },

    async signUp(email, password) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        return data?.user || null;
      });
    },

    async signIn(email, password) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data?.user || null;
      });
    },

    async signOut() {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client.auth.signOut();
        if (error) throw error;
        return true;
      });
    },

    async requestPasswordReset(email, redirectTo) {
      return safe(async () => {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          throw new Error('Supabase is not configured.');
        }

        const response = await fetch(
          `${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: String(email || '').trim().toLowerCase() })
          }
        );

        if (!response.ok) {
          let message = `Request failed with status ${response.status}`;
          try {
            const errorBody = await response.json();
            message = errorBody?.msg || errorBody?.message || errorBody?.error_description || errorBody?.error || message;
          } catch (_) {}
          throw new Error(message);
        }

        const text = await response.text();
        if (!text) {
          return true;
        }

        try {
          const parsed = JSON.parse(text);
          if (parsed?.error || parsed?.msg || parsed?.message) {
            throw new Error(parsed.error || parsed.msg || parsed.message);
          }
        } catch (error) {
          if (error instanceof SyntaxError) {
            return true;
          }
          throw error;
        }

        return true;
      });
    },

    async updatePassword(newPassword) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return true;
      });
    },

    async verifyOtpTokenHash(tokenHash, type) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client.auth.verifyOtp({
          token_hash: tokenHash,
          type
        });
        if (error) throw error;
        return data?.session || true;
      });
    },

    async getUsers() {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client
          .from('eso_users')
          .select('*')
          .order('createdAt', { ascending: false });
        if (error) throw error;
        return data || [];
      });
    },

    async findUserByEmail(email) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client
          .from('eso_users')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      });
    },

    async findUserByCredentials(email, password) {
      const signedInUser = await this.signIn(email, password);
      if (!signedInUser) return null;
      return this.findUserByAuthId(signedInUser.id);
    },

    async findUserByAuthId(authId) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client
          .from('eso_users')
          .select('*')
          .eq('auth_id', authId)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      });
    },

    async findUserById(id) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client
          .from('eso_users')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      });
    },

    async upsertUser(user) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const payload = sanitizeUserPayload(user);
        const onConflict = payload?.email ? 'email' : 'id';
        const { error } = await client
          .from('eso_users')
          .upsert(payload, { onConflict });
        if (error) throw error;
        return true;
      });
    },

    async updateUserById(id, patch) {
      const client = getClient();
      if (!client || !id) return null;
      return safe(async () => {
        const payload = sanitizeUserPayload(patch);
        const { error } = await client
          .from('eso_users')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        return true;
      });
    },

    async updateUserByEmail(email, patch) {
      const client = getClient();
      if (!client || !email) return null;
      return safe(async () => {
        const payload = sanitizeUserPayload(patch);
        const normalizedEmail = String(email).trim().toLowerCase();
        const { error } = await client
          .from('eso_users')
          .update(payload)
          .eq('email', normalizedEmail);
        if (error) throw error;
        return true;
      });
    },

    async getWallets() {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client
          .from('eso_admin_wallets')
          .select('*')
          .order('cryptoId', { ascending: true });
        if (error) throw error;
        return data || [];
      });
    },

    async upsertWallet(wallet) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client
          .from('eso_admin_wallets')
          .upsert(wallet, { onConflict: 'cryptoId' });
        if (error) throw error;
        return true;
      });
    },

    async deleteWallet(cryptoId) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client
          .from('eso_admin_wallets')
          .delete()
          .eq('cryptoId', cryptoId);
        if (error) throw error;
        return true;
      });
    },

    async getDeposits() {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client
          .from('eso_deposits')
          .select('*')
          .order('createdAt', { ascending: false });
        if (error) throw error;
        return data || [];
      });
    },

    async createDeposit(deposit) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client.from('eso_deposits').insert(deposit);
        if (error) throw error;
        return true;
      });
    },

    async updateDeposit(id, patch) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client
          .from('eso_deposits')
          .update(patch)
          .eq('id', id);
        if (error) throw error;
        return true;
      });
    },

    async getWithdrawals() {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client
          .from('eso_withdrawals')
          .select('*')
          .order('createdAt', { ascending: false });
        if (error) throw error;
        return data || [];
      });
    },

    async createWithdrawal(withdrawal) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client.from('eso_withdrawals').insert(withdrawal);
        if (error) throw error;
        return true;
      });
    },

    async updateWithdrawal(id, patch) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client
          .from('eso_withdrawals')
          .update(patch)
          .eq('id', id);
        if (error) throw error;
        return true;
      });
    },

    async getTrades() {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client
          .from('eso_trades')
          .select('*')
          .order('openedAt', { ascending: false });
        if (error) throw error;
        return data || [];
      });
    },

    async createTrade(trade) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client.from('eso_trades').insert(trade);
        if (error) throw error;
        return true;
      });
    },

    async updateTrade(id, patch) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client
          .from('eso_trades')
          .update(patch)
          .eq('id', id);
        if (error) throw error;
        return true;
      });
    },

    async upsertTrade(trade) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client
          .from('eso_trades')
          .upsert(trade, { onConflict: 'id' });
        if (error) throw error;
        return true;
      });
    },

    async getUpgrades() {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client
          .from('eso_upgrades')
          .select('*')
          .order('createdAt', { ascending: false });
        if (error) throw error;
        return data || [];
      });
    },

    async createUpgrade(upgrade) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client.from('eso_upgrades').insert(upgrade);
        if (error) throw error;
        return true;
      });
    },

    async updateUpgrade(id, patch) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client
          .from('eso_upgrades')
          .update(patch)
          .eq('id', id);
        if (error) throw error;
        return true;
      });
    },

    async getLoans() {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client
          .from('eso_loans')
          .select('*')
          .order('createdAt', { ascending: false });
        if (error) throw error;
        return data || [];
      });
    },

    async createLoan(loan) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client.from('eso_loans').insert(loan);
        if (error) throw error;
        return true;
      });
    },

    async updateLoan(id, patch) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client
          .from('eso_loans')
          .update(patch)
          .eq('id', id);
        if (error) throw error;
        return true;
      });
    },

    async getNotifications(filters = {}) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        let query = client
          .from('eso_notifications')
          .select('*')
          .order('createdAt', { ascending: false });

        if (filters?.category) {
          query = query.eq('category', filters.category);
        }
        if (filters?.userId) {
          query = query.eq('userId', filters.userId);
        }
        if (filters?.unreadOnly) {
          query = query.eq('read', false);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      });
    },

    async createNotifications(notifications) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const payload = Array.isArray(notifications) ? notifications.filter(Boolean) : [notifications].filter(Boolean);
        if (!payload.length) return true;

        const { error } = await client
          .from('eso_notifications')
          .insert(payload);
        if (error) throw error;
        return true;
      });
    },

    async updateNotifications(ids, patch) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const normalizedIds = Array.isArray(ids) ? ids.filter(Boolean) : [ids].filter(Boolean);
        if (!normalizedIds.length) return true;

        const { error } = await client
          .from('eso_notifications')
          .update(patch)
          .in('id', normalizedIds);
        if (error) throw error;
        return true;
      });
    }
  };

  window.ESO_DB = ESO_DB;
})();
