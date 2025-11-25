<template>
  <v-app>
    <!-- App Bar with User Info -->
    <v-app-bar v-if="authStore.isAuthenticated" color="primary" prominent>
      <v-app-bar-title>ระบบประเมินบุคลากรออนไลน์</v-app-bar-title>
      <v-spacer></v-spacer>
      <div class="d-flex align-center mr-4">
        <v-chip color="info" variant="flat" class="mr-2">
          <v-icon icon="mdi-account" start></v-icon>
          {{ authStore.user?.email || authStore.user?.name_th || 'ผู้ใช้' }}
        </v-chip>
        <v-chip :color="getRoleColor(authStore.user?.role)" variant="flat">
          <v-icon :icon="getRoleIcon(authStore.user?.role)" start></v-icon>
          {{ getRoleLabel(authStore.user?.role) }}
        </v-chip>
      </div>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <!-- Global Notification -->
    <base-alert
      v-model="notificationStore.show"
      :message="notificationStore.message"
      :type="notificationStore.type"
      :timeout="notificationStore.timeout"
    />
  </v-app>
</template>

<script setup>
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import BaseAlert from '@/components/base/BaseAlert.vue';

const notificationStore = useNotificationStore();
const authStore = useAuthStore();

const getRoleLabel = (role) => {
  const labels = {
    admin: 'ผู้ดูแลระบบ',
    evaluator: 'กรรมการประเมิน',
    evaluatee: 'ผู้ถูกประเมิน'
  };
  return labels[role] || role;
};

const getRoleColor = (role) => {
  const colors = {
    admin: 'error',
    evaluator: 'warning',
    evaluatee: 'success'
  };
  return colors[role] || 'grey';
};

const getRoleIcon = (role) => {
  const icons = {
    admin: 'mdi-shield-account',
    evaluator: 'mdi-account-star',
    evaluatee: 'mdi-account'
  };
  return icons[role] || 'mdi-account';
};
</script>
