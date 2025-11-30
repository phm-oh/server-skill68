<template>
  <v-card class="mx-auto mt-10" max-width="400">
    <v-card-title>Login</v-card-title>
    <v-card-text>
      <v-form @submit.prevent="login">
        <v-text-field v-model="form.username" label="Username"></v-text-field>
        <v-text-field v-model="form.password" label="Password" type="password"></v-text-field>
        <v-btn type="submit" block color="primary">Login</v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const form = reactive({ username: '', password: '' })
const API = 'http://localhost:3000'

const login = async () => {
  try {
    const { data } = await axios.post(`${API}/login`, form)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    router.push('/')
  } catch (e) {
    alert('Login Failed')
  }
}
</script>
