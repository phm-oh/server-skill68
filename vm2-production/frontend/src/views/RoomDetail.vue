<template>
  <div class="room-detail">
    <div class="container">
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="room">
        <div class="room-header">
          <h2>{{ room.name }}</h2>
          <p>{{ room.description }}</p>
        </div>
        
        <div class="temp-section">
          <h3>Current Temperature</h3>
          <div class="temp-display-large">
            <span v-if="latestTemp" class="temp-value">{{ latestTemp.temperature }}°C</span>
            <span v-else>--°C</span>
          </div>
        </div>
        
        <div class="images-section">
          <h3>Room Images</h3>
          <input type="file" @change="handleFileSelect" accept="image/*" ref="fileInput" style="display: none">
          <button @click="$refs.fileInput.click()">Upload Image</button>
          
          <div class="images-grid">
            <div v-for="img in images" :key="img.id" class="image-item">
              <img :src="img.filepath" :alt="img.filename">
            </div>
          </div>
        </div>
        
        <div class="temperature-history">
          <h3>Temperature History</h3>
          <div class="temp-list">
            <div v-for="temp in temperatures" :key="temp.id" class="temp-item">
              <span>{{ temp.temperature }}°C</span>
              <span class="time">{{ new Date(temp.recorded_at).toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'RoomDetail',
  data() {
    return {
      room: null,
      temperatures: [],
      images: [],
      latestTemp: null,
      loading: true
    }
  },
  async mounted() {
    await this.fetchRoomData()
    setInterval(() => this.fetchLatestTemp(), 5000)
  },
  methods: {
    async fetchRoomData() {
      try {
        const token = localStorage.getItem('token')
        const roomId = this.$route.params.id
        
        const [roomRes, tempRes, imgRes] = await Promise.all([
          axios.get(`/api/rooms`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`/api/rooms/${roomId}/temperatures`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`/api/rooms/${roomId}/images`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ])
        
        this.room = roomRes.data.find(r => r.id == roomId)
        this.temperatures = tempRes.data
        this.images = imgRes.data
        this.latestTemp = tempRes.data[0] || null
        this.loading = false
      } catch (err) {
        console.error(err)
        this.loading = false
      }
    },
    async fetchLatestTemp() {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(`/api/rooms/${this.$route.params.id}/temperature/latest`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        this.latestTemp = res.data
      } catch (err) {
        console.error('Failed to fetch temp')
      }
    },
    async handleFileSelect(event) {
      const file = event.target.files[0]
      if (!file) return
      
      const formData = new FormData()
      formData.append('image', file)
      
      try {
        const token = localStorage.getItem('token')
        const res = await axios.post(
          `/api/rooms/${this.$route.params.id}/images`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        )
        this.images.unshift(res.data)
        alert('Image uploaded successfully')
      } catch (err) {
        alert('Failed to upload image')
      }
    }
  }
}
</script>

<style scoped>
.room-detail {
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.room-header {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.temp-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: center;
}

.temp-display-large {
  margin: 1rem 0;
}

.temp-value {
  font-size: 4rem;
  font-weight: bold;
  color: #3498db;
}

.images-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.image-item img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 4px;
}

.temperature-history {
  background: white;
  padding: 2rem;
  border-radius: 8px;
}

.temp-list {
  max-height: 400px;
  overflow-y: auto;
}

.temp-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}

.time {
  color: #7f8c8d;
  font-size: 0.9rem;
}

button {
  background: #3498db;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 1rem;
}

button:hover {
  background: #2980b9;
}
</style>


