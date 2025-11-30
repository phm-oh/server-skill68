<template>
  <v-app>
    <v-app-bar color="teal-darken-1" elevation="2">
      <v-app-bar-title class="font-weight-bold">
        <v-icon icon="mdi-home-automation" class="mr-2"></v-icon>
        Smart Room Monitor
      </v-app-bar-title>
      <template v-if="user">
        <v-btn to="/" prepend-icon="mdi-view-dashboard">Dashboard</v-btn>
        <v-btn v-if="user.role === 'admin'" to="/admin" prepend-icon="mdi-cog">Admin</v-btn>
        <v-divider vertical class="mx-2"></v-divider>
        <span class="mr-4 text-caption">Hi, {{ user.username }}</span>
        <v-btn @click="logout" color="error" variant="text" icon="mdi-logout"></v-btn>
      </template>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <v-container>
        <router-view></router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const user = ref(null)

watchEffect(() => {
  const u = localStorage.getItem('user')
  user.value = u ? JSON.parse(u) : null
})

const logout = () => {
  localStorage.clear()
  user.value = null
  router.push('/login')
}
</script>

