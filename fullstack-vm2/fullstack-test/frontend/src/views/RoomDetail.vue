<template>
  <div v-if="room">
    <v-btn to="/" variant="text" prepend-icon="mdi-arrow-left" class="mb-2">Back</v-btn>
    
    <v-card class="pa-4 rounded-lg" elevation="2">
      <div class="d-flex justify-space-between align-center mb-4">
        <h2 class="text-h5">{{ room.name }} - History</h2>
        <v-btn-toggle v-model="range" color="primary" mandatory density="compact" @update:modelValue="fetchHistory">
          <v-btn :value="10">10 Min</v-btn>
          <v-btn :value="30">30 Min</v-btn>
          <v-btn :value="60">1 Hour</v-btn>
          <v-btn :value="1440">24 Hours</v-btn>
        </v-btn-toggle>
      </div>

      <!-- Custom SVG Chart (No external lib needed if chart.js forbidden) -->
      <div class="chart-container" style="height: 300px; width: 100%; position: relative; background: #f9f9f9; border: 1px solid #ddd;">
        <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none">
           <!-- Grid Lines -->
           <line v-for="i in 5" :key="i" x1="0" :y1="i*50" x2="1000" :y2="i*50" stroke="#eee" stroke-width="1"/>
           
           <!-- Temp Line (Red) -->
           <polyline :points="tempPoints" fill="none" stroke="#ef5350" stroke-width="3" stroke-linejoin="round" />
           <!-- Humid Line (Blue) -->
           <polyline :points="humidPoints" fill="none" stroke="#42a5f5" stroke-width="3" stroke-linejoin="round" />
        </svg>
        
        <!-- Legend -->
        <div style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.8); padding: 5px; border-radius: 4px;">
          <div class="text-red font-weight-bold">● Temp (°C)</div>
          <div class="text-blue font-weight-bold">● Humid (%)</div>
        </div>
      </div>
      
      <v-table density="compact" class="mt-4">
        <thead>
          <tr>
            <th>Time</th>
            <th>Temp (°C)</th>
            <th>Humid (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in history.slice().reverse().slice(0, 10)" :key="item.id">
            <td>{{ new Date(item.timestamp).toLocaleTimeString() }}</td>
            <td>{{ item.temp }}</td>
            <td>{{ item.humid }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const room = ref(null)
const history = ref([])
const range = ref(60)
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const fetchHistory = async () => {
  const token = localStorage.getItem('token')
  const { data } = await axios.get(`${API}/rooms/${route.params.id}?range=${range.value}`, 
    { headers: { Authorization: `Bearer ${token}` } })
  room.value = data.info
  history.value = data.history
}

// Convert data to SVG points
const tempPoints = computed(() => {
  if (!history.value.length) return ''
  return history.value.map((d, i) => {
    const x = (i / (history.value.length - 1)) * 1000
    // Scale: 0-50 C -> 0-300px height (inverted)
    const y = 300 - (d.temp / 50 * 300) 
    return `${x},${y}`
  }).join(' ')
})

const humidPoints = computed(() => {
  if (!history.value.length) return ''
  return history.value.map((d, i) => {
    const x = (i / (history.value.length - 1)) * 1000
    // Scale: 0-100 % -> 0-300px height
    const y = 300 - (d.humid / 100 * 300) 
    return `${x},${y}`
  }).join(' ')
})

onMounted(fetchHistory)
</script>

