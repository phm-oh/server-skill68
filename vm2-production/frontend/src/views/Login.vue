<template>
  <div class="login-container">
    <div class="login-box">
      <h2>Login</h2>
      <form @submit.prevent="login">
        <input v-model="username" type="text" placeholder="Username" required>
        <input v-model="password" type="password" placeholder="Password" required>
        <button type="submit">Login</button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
      <div class="demo-accounts">
        <p>Demo Accounts:</p>
        <p>admin / admin123</p>
        <p>user1 / user123</p>
        <p>user2 / user123</p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { useRouter } from 'vue-router'

export default {
  name: 'Login',
  data() {
    return {
      username: '',
      password: '',
      error: ''
    }
  },
  setup() {
    const router = useRouter()
    return { router }
  },
  methods: {
    async login() {
      try {
        const res = await axios.post('/api/login', {
          username: this.username,
          password: this.password
        })
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        this.router.push('/dashboard')
      } catch (err) {
        this.error = 'Invalid credentials'
      }
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

.login-box h2 {
  margin-bottom: 1.5rem;
  text-align: center;
}

.login-box input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.login-box button {
  width: 100%;
  padding: 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.login-box button:hover {
  background: #5568d3;
}

.error {
  color: #e74c3c;
  margin-top: 0.5rem;
  text-align: center;
}

.demo-accounts {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  font-size: 0.9rem;
  color: #666;
  text-align: center;
}
</style>


