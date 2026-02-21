(function () {
  const SUPABASE_URL = window.ESO_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
  const SUPABASE_ANON_KEY = window.ESO_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
  let lastError = null;

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
      window.__esoSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return window.__esoSupabaseClient;
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
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo
        });
        if (error) throw error;
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

    async upsertUser(user) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client
          .from('eso_users')
          .upsert(user, { onConflict: 'id' });
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

    async getBonuses() {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { data, error } = await client
          .from('eso_bonuses')
          .select('*')
          .order('date', { ascending: false });
        if (error) throw error;
        return data || [];
      });
    },

    async createBonus(bonus) {
      const client = getClient();
      if (!client) return null;
      return safe(async () => {
        const { error } = await client
          .from('eso_bonuses')
          .insert(bonus);
        if (error) throw error;
        return true;
      });
    },

    async markBonusesClaimed(ids, claimedAt) {
      const client = getClient();
      if (!client || !Array.isArray(ids) || !ids.length) return null;
      return safe(async () => {
        const { error } = await client
          .from('eso_bonuses')
          .update({ claimed: true, pending: false, claimedAt: claimedAt || new Date().toISOString() })
          .in('id', ids);
        if (error) throw error;
        return true;
      });
    }
  };

  window.ESO_DB = ESO_DB;
})();
