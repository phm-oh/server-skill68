import { defineStore } from 'pinia';
import authService from '@/services/authService';
import userService from '@/services/userService';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('auth_token') || null,
    isAuthenticated: !!localStorage.getItem('auth_token')
  }),

  getters: {
    isAdmin: (state) => state.user?.role === 'admin',
    isEvaluator: (state) => state.user?.role === 'evaluator',
    isEvaluatee: (state) => state.user?.role === 'evaluatee',
    userName: (state) => state.user?.full_name || state.user?.name || '',
    userRole: (state) => state.user?.role || '',
    userId: (state) => state.user?.id || null
  },

  actions: {
    async login(credentials) {
      try {
        const response = await authService.login(credentials);
        // Backend ส่ง { success: true, accessToken, user } ไม่ได้ wrap ใน data
        const { user, accessToken } = response.data;

        this.user = user;
        this.token = accessToken;
        this.isAuthenticated = true;

        localStorage.setItem('auth_token', accessToken);
        return user;
      } catch (error) {
        this.clearAuth();
        throw error;
      }
    },

    async logout() {
      try {
        await authService.logout();
      } finally {
        this.clearAuth();
        window.location.href = '/login';
      }
    },

    async fetchCurrentUser() {
      try {
        const response = await userService.getMe();
        // Backend ส่ง { success: true, items: [user], total: 1 }
        // หรือ { success: true, data: user }
        const data = response.data.data ||
                     (response.data.items && response.data.items[0]) ||
                     response.data;
        this.user = data;
        this.isAuthenticated = true;
        return this.user;
      } catch (error) {
        this.clearAuth();
        throw error;
      }
    },

    clearAuth() {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      localStorage.removeItem('auth_token');
    }
  }
});
