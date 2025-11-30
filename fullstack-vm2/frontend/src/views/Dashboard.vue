<template>
  <div>
    <h2 class="text-h4 mb-4 text-grey-darken-2">Dashboard</h2>
    <v-row>
      <v-col v-for="room in rooms" :key="room.id" cols="12" md="6" lg="4">
        <v-card @click="$router.push(`/room/${room.id}`)" hover elevation="3" class="rounded-lg overflow-hidden">
          <!-- Fix: Remove API prefix for Base64 images -->
          <v-img :src="room.image ? room.image : 'https://placehold.co/600x400?text=No+Image'" 
                 height="200" cover class="align-end text-white">
            <v-card-title class="bg-black bg-opacity-50 text-h5 font-weight-bold">{{ room.name }}</v-card-title>
          </v-img>
          
          <v-card-text class="pa-4">
            <v-row no-gutters>
              <v-col cols="6" class="text-center border-e">
                <div class="text-caption text-grey">Temperature</div>
                <div class="text-h4 font-weight-bold" :class="getTempColor(room.latest?.temp)">
                  {{ room.latest?.temp?.toFixed(1) || '--' }}°C
                </div>
              </v-col>
              <v-col cols="6" class="text-center">
                <div class="text-caption text-grey">Humidity</div>
                <div class="text-h4 font-weight-bold text-blue-darken-2">
                  {{ room.latest?.humid?.toFixed(1) || '--' }}%
                </div>
              </v-col>
            </v-row>
          </v-card-text>
          
          <v-divider></v-divider>
          <v-card-actions>
             <v-chip size="small" color="green" variant="flat" class="ml-2">Online</v-chip>
             <v-spacer></v-spacer>
             <v-btn color="primary" variant="text">View History <v-icon end>mdi-arrow-right</v-icon></v-btn>
          </v-card-actions>
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
  try {
    const { data } = await axios.get(`${API}/rooms`, { headers: { Authorization: `Bearer ${token}` } })
    rooms.value = data
  } catch (e) {
    if(e.response?.status === 401) window.location.href = '/login'
  }
}

const getTempColor = (t) => {
  if (!t) return 'text-grey'
  if (t > 35) return 'text-red'
  if (t > 28) return 'text-orange'
  return 'text-green'
}

onMounted(() => {
  fetchRooms()
  interval = setInterval(fetchRooms, 3000)
})

onUnmounted(() => clearInterval(interval))
</script>

