<template>
  <div>
    <h2>Dashboard</h2>
    <v-row>
      <v-col v-for="room in rooms" :key="room.id" cols="12" md="4">
        <v-card @click="$router.push(`/room/${room.id}`)" hover>
          <v-img :src="`http://localhost:3000${room.image}`" height="200" cover bg-color="grey-lighten-2"></v-img>
          <v-card-title>{{ room.name }}</v-card-title>
          <v-card-text>
            <div>Temp: {{ room.temp || '--' }} °C</div>
            <div>Humid: {{ room.humid || '--' }} %</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const rooms = ref([])
const API = 'http://localhost:3000'
let interval = null

const fetchRooms = async () => {
  const token = localStorage.getItem('token')
  const { data } = await axios.get(`${API}/rooms`, { headers: { Authorization: `Bearer ${token}` } })
  rooms.value = data
  
  // Fetch latest data for each room
  for (const r of rooms.value) {
    const { data: latest } = await axios.get(`${API}/rooms/${r.id}/latest`, { headers: { Authorization: `Bearer ${token}` } })
    r.temp = latest.temp
    r.humid = latest.humid
  }
}

onMounted(() => {
  fetchRooms()
  interval = setInterval(fetchRooms, 5000) // Poll every 5s
})

onUnmounted(() => clearInterval(interval))
</script>
