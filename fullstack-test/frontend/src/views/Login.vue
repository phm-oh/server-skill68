<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12 rounded-lg">
          <v-toolbar color="teal-darken-1" dark flat>
            <v-toolbar-title class="text-center">Login Access</v-toolbar-title>
          </v-toolbar>
          <v-card-text class="pa-6">
            <v-form @submit.prevent="login">
              <v-text-field v-model="form.username" prepend-inner-icon="mdi-account" label="Username" variant="outlined" class="mb-2"></v-text-field>
              <v-text-field v-model="form.password" prepend-inner-icon="mdi-lock" label="Password" type="password" variant="outlined"></v-text-field>
              <v-btn type="submit" color="teal-darken-1" block size="large" :loading="loading" class="mt-4">Login</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const form = reactive({ username: '', password: '' })
const loading = ref(false)
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const login = async () => {
  loading.value = true
  try {
    const { data } = await axios.post(`${API}/login`, form)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    window.location.href = '/' // Force reload to update App.vue state
  } catch (e) {
    alert('Invalid Credentials')
  } finally {
    loading.value = false
  }
}
</script>

