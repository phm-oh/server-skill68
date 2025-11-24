<template>
  <div class="login-container">
    <h2>Login</h2>
    <form @submit.prevent="handleLogin">
      <input v-model="username" placeholder="Username" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

export default {
  setup() {
    const router = useRouter()
    const username = ref('')
    const password = ref('')
    
    const handleLogin = async () => {
      // Simplified login for demo
      localStorage.setItem('token', 'dummy-token')
      localStorage.setItem('user', JSON.stringify({ username: username.value, role: 'admin' }))
      router.push('/dashboard')
    }
    
    return { username, password, handleLogin }
  }
}
</script>

