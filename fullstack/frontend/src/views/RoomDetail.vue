<template>
  <div>
    <h2>Room History</h2>
    <svg viewBox="0 0 500 200" class="chart">
      <!-- Background -->
      <rect width="100%" height="100%" fill="#f0f0f0" />
      
      <!-- Temp Line (Red) -->
      <polyline :points="tempPoints" fill="none" stroke="red" stroke-width="2" />
      
      <!-- Humid Line (Blue) -->
      <polyline :points="humidPoints" fill="none" stroke="blue" stroke-width="2" />
    </svg>
    <div class="text-center mt-2">
      <span class="text-red">Temperature</span> | <span class="text-blue">Humidity</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const history = ref([])
const API = 'http://localhost:3000'

onMounted(async () => {
  const token = localStorage.getItem('token')
  const { data } = await axios.get(`${API}/rooms/${route.params.id}/history`, { headers: { Authorization: `Bearer ${token}` } })
  history.value = data
})

// Simple Scaling for SVG Graph
const tempPoints = computed(() => {
  if (!history.value.length) return ''
  return history.value.map((d, i) => {
    const x = (i / (history.value.length - 1)) * 500
    const y = 200 - (d.temp * 2) // Scale temp (assuming 0-100)
    return `${x},${y}`
  }).join(' ')
})

const humidPoints = computed(() => {
  if (!history.value.length) return ''
  return history.value.map((d, i) => {
    const x = (i / (history.value.length - 1)) * 500
    const y = 200 - (d.humid * 2) 
    return `${x},${y}`
  }).join(' ')
})
</script>

<style scoped>
.chart {
  width: 100%;
  border: 1px solid #ccc;
}
</style>
