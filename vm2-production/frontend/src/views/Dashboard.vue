<template>
  <div class="dashboard">
    <div class="container">
      <h2>Rooms Dashboard</h2>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else class="rooms-grid">
        <div v-for="room in rooms" :key="room.id" class="room-card" @click="goToRoom(room.id)">
          <h3>{{ room.name }}</h3>
          <p class="description">{{ room.description }}</p>
          <div class="temp-display">
            <span v-if="roomTemps[room.id]" class="temp-value">
              {{ roomTemps[room.id].temperature }}°C
            </span>
            <span v-else class="temp-value">--°C</span>
          </div>
          <p class="image-count">{{ room.image_count || 0 }} images</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { useRouter } from 'vue-router'

export default {
  name: 'Dashboard',
  data() {
    return {
      rooms: [],
      roomTemps: {},
      loading: true
    }
  },
  setup() {
    const router = useRouter()
    return { router }
  },
  async mounted() {
    await this.fetchRooms()
    this.rooms.forEach(room => this.fetchLatestTemp(room.id))
    setInterval(() => {
      this.rooms.forEach(room => this.fetchLatestTemp(room.id))
    }, 5000)
  },
  methods: {
    async fetchRooms() {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/rooms', {
          headers: { Authorization: `Bearer ${token}` }
        })
        this.rooms = res.data
        this.loading = false
      } catch (err) {
        console.error(err)
        this.loading = false
      }
    },
    async fetchLatestTemp(roomId) {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(`/api/rooms/${roomId}/temperature/latest`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.data) {
          this.$set(this.roomTemps, roomId, res.data)
        }
      } catch (err) {
        console.error('Failed to fetch temp:', err)
      }
    },
    goToRoom(roomId) {
      this.router.push(`/room/${roomId}`)
    }
  }
}
</script>

<style scoped>
.dashboard {
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.room-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.room-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.room-card h3 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.description {
  color: #7f8c8d;
  margin-bottom: 1rem;
}

.temp-display {
  margin: 1rem 0;
}

.temp-value {
  font-size: 2rem;
  font-weight: bold;
  color: #3498db;
}

.image-count {
  color: #95a5a6;
  font-size: 0.9rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}
</style>


