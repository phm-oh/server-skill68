<template>
  <v-app>
    <v-app-bar color="primary" v-if="$route.path !== '/login'">
      <v-app-bar-title>IoT Smart Room</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn to="/">Dashboard</v-btn>
      <v-btn @click="logout" icon="mdi-logout"></v-btn>
    </v-app-bar>

    <v-main>
      <v-container>
        <router-view></router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>
