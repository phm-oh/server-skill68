<template>
  <v-container fluid class="fill-height bg-grey-lighten-4">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="4">
        <v-card elevation="8">
          <v-card-title class="text-h5 bg-primary text-center pa-6">
            <div class="d-flex flex-column align-center">
              <v-icon icon="mdi-account-circle" size="64" class="mb-2"></v-icon>
              <span>ระบบประเมินบุคลากรออนไลน์</span>
            </div>
          </v-card-title>

          <v-card-text class="pa-6">
            <v-form ref="formRef" @submit.prevent="handleLogin">
              <v-text-field
                v-model="credentials.email"
                label="อีเมล"
                prepend-inner-icon="mdi-email"
                type="email"
                :rules="[rules.required, rules.email]"
                :error-messages="errors.email"
                variant="outlined"
                class="mb-2"
              ></v-text-field>

              <v-text-field
                v-model="credentials.password"
                label="รหัสผ่าน"
                prepend-inner-icon="mdi-lock"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showPassword = !showPassword"
                :rules="[rules.required]"
                :error-messages="errors.password"
                variant="outlined"
                class="mb-4"
              ></v-text-field>

              <v-alert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                closable
                @click:close="errorMessage = ''"
                class="mb-4"
              >
                {{ errorMessage }}
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="loading"
              >
                <v-icon icon="mdi-login" start></v-icon>
                เข้าสู่ระบบ
              </v-btn>
            </v-form>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-text class="text-center text-body-2 text-grey">
            ระบบประเมินบุคลากรออนไลน์ v1.0.0
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const formRef = ref(null);
const loading = ref(false);
const showPassword = ref(false);
const errorMessage = ref('');

const credentials = reactive({
  email: '',
  password: ''
});

const errors = reactive({
  email: '',
  password: ''
});

const rules = {
  required: (value) => !!value || 'กรุณากรอกข้อมูล',
  email: (value) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value) || 'รูปแบบอีเมลไม่ถูกต้อง';
  }
};

const handleLogin = async () => {
  errors.email = '';
  errors.password = '';
  errorMessage.value = '';

  const { valid } = await formRef.value.validate();
  if (!valid) return;

  loading.value = true;

  try {
    const user = await authStore.login(credentials);
    notificationStore.success(`ยินดีต้อนรับ ${user.name || user.full_name || user.email}`);

    // Redirect based on role
    if (user.role === 'admin') {
      router.push('/admin');
    } else if (user.role === 'evaluator') {
      router.push('/evaluator');
    } else if (user.role === 'evaluatee') {
      router.push('/evaluatee');
    } else {
      router.push('/');
    }
  } catch (error) {
    console.error('Login error:', error);
    errorMessage.value = error.response?.data?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  } finally {
    loading.value = false;
  }
};
</script>
