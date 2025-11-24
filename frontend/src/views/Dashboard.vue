<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>Dashboard</h2>
      <p class="subtitle">รายการห้องทั้งหมด</p>
    </div>
    
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="rooms-grid">
      <div 
        v-for="room in rooms" 
        :key="room.id" 
        class="room-card"
        @click="$router.push(`/room/${room.id}`)"
      >
        <div class="room-header">
          <h3>{{ room.name }}</h3>
          <span class="room-badge">{{ room.esp32_device_id }}</span>
        </div>
        
        <div class="room-content">
          <div v-if="room.latestTemp" class="temp-display">
            <div class="temp-value">{{ room.latestTemp.temperature }}°C</div>
            <div v-if="room.latestTemp.humidity" class="humidity-value">
              ความชื้น: {{ room.latestTemp.humidity }}%
            </div>
            <div class="temp-time">
              {{ formatTime(room.latestTemp.recorded_at) }}
            </div>
          </div>
          <div v-else class="no-data">
            ยังไม่มีข้อมูล
          </div>
        </div>
        
        <div class="room-footer">
          <span class="image-count">
            <strong>{{ room.image_count || 0 }}</strong> รูปภาพ
          </span>
          <span class="click-hint">คลิกเพื่อดูรายละเอียด →</span>
        </div>
      </div>
    </div>
    
    <div v-if="rooms.length === 0 && !loading" class="empty-state">
      <p>ไม่มีห้องที่คุณสามารถเข้าถึงได้</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'Dashboard',
  setup() {
    const rooms = ref([])
    const loading = ref(true)
    const error = ref('')
    
    const getAuthHeaders = () => {
      const token = localStorage.getItem('token')
      return {
        'Authorization': `Bearer ${token}`
      }
    }
    
    const fetchRooms = async () => {
      try {
        loading.value = true
        const response = await axios.get('/api/rooms', {
          headers: getAuthHeaders()
        })
        rooms.value = response.data
        
        // Fetch latest temperature for each room
        for (let room of rooms.value) {
          try {
            const tempResponse = await axios.get(`/api/rooms/${room.id}/temperature/latest`, {
              headers: getAuthHeaders()
            })
            room.latestTemp = tempResponse.data
          } catch (err) {
            // Ignore if no temperature data
            room.latestTemp = null
          }
        }
      } catch (err) {
        error.value = err.response?.data?.error || 'ไม่สามารถโหลดข้อมูลได้'
        if (err.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
      } finally {
        loading.value = false
      }
    }
    
    const formatTime = (timeString) => {
      if (!timeString) return ''
      const date = new Date(timeString)
      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 60000)
      
      if (minutes < 1) return 'เมื่อสักครู่'
      if (minutes < 60) return `${minutes} นาทีที่แล้ว`
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
      return date.toLocaleString('th-TH')
    }
    
    onMounted(() => {
      fetchRooms()
      
      // Refresh every 30 seconds
      setInterval(() => {
        fetchRooms()
      }, 30000)
    })
    
    return { rooms, loading, error, formatTime }
  }
}
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h2 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  font-size: 1.1rem;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.room-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.room-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
}

.room-header h3 {
  color: #2c3e50;
  margin: 0;
}

.room-badge {
  background: #3498db;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.room-content {
  margin-bottom: 1rem;
  min-height: 100px;
}

.temp-display {
  text-align: center;
}

.temp-value {
  font-size: 3rem;
  font-weight: bold;
  color: #3498db;
  margin-bottom: 0.5rem;
}

.humidity-value {
  color: #666;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.temp-time {
  color: #999;
  font-size: 0.85rem;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 2rem 0;
}

.room-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
  font-size: 0.9rem;
  color: #666;
}

.image-count {
  color: #666;
}

.click-hint {
  color: #3498db;
  font-weight: 500;
}

.loading {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #999;
}

.error {
  background: #fee;
  color: #e74c3c;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  border-left: 4px solid #e74c3c;
}
</style>

