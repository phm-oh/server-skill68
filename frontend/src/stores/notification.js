import { defineStore } from 'pinia';

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    show: false,
    message: '',
    type: 'info',
    timeout: 3000
  }),

  actions: {
    showNotification(message, type = 'info', timeout = 3000) {
      this.message = message;
      this.type = type;
      this.timeout = timeout;
      this.show = true;
    },

    success(message, timeout = 3000) {
      this.showNotification(message, 'success', timeout);
    },

    error(message, timeout = 5000) {
      this.showNotification(message, 'error', timeout);
    },

    warning(message, timeout = 4000) {
      this.showNotification(message, 'warning', timeout);
    },

    info(message, timeout = 3000) {
      this.showNotification(message, 'info', timeout);
    },

    hide() {
      this.show = false;
    }
  }
});
