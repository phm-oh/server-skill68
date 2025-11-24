<template>
  <div class="room-detail">
    <div class="room-header">
      <button @click="$router.push('/dashboard')" class="back-btn">← กลับ</button>
      <h2>{{ room?.name || `Room ${$route.params.id}` }}</h2>
    </div>
    
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="room-content">
      <!-- Current Temperature -->
      <div class="card temp-card">
        <h3>อุณหภูมิปัจจุบัน</h3>
        <div v-if="latestTemp" class="temp-display-large">
          <div class="temp-value-large">{{ latestTemp.temperature }}°C</div>
          <div v-if="latestTemp.humidity" class="humidity-value-large">
            ความชื้น: {{ latestTemp.humidity }}%
          </div>
          <div class="temp-time-large">
            อัปเดตล่าสุด: {{ formatTime(latestTemp.recorded_at) }}
          </div>
        </div>
        <div v-else class="no-data">ยังไม่มีข้อมูล</div>
      </div>
      
      <!-- Temperature History Chart -->
      <div class="card chart-card">
        <h3>กราฟอุณหภูมิ (100 ข้อมูลล่าสุด)</h3>
        <div class="chart-container">
          <div v-if="temperatures.length === 0" class="no-data">
            ยังไม่มีข้อมูลอุณหภูมิ
          </div>
          <div v-else class="simple-chart">
            <div 
              v-for="(temp, index) in temperatures.slice(0, 50).reverse()" 
              :key="temp.id"
              class="chart-bar"
              :style="{ height: `${(temp.temperature / 40) * 100}%` }"
              :title="`${temp.temperature}°C - ${formatTime(temp.recorded_at)}`"
            ></div>
          </div>
        </div>
      </div>
      
      <!-- Temperature Table -->
      <div class="card table-card">
        <h3>ประวัติอุณหภูมิ</h3>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>เวลา</th>
                <th>อุณหภูมิ (°C)</th>
                <th>ความชื้น (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="temp in temperatures.slice(0, 20)" :key="temp.id">
                <td>{{ formatTime(temp.recorded_at) }}</td>
                <td>{{ temp.temperature }}°C</td>
                <td>{{ temp.humidity || '-' }}</td>
              </tr>
              <tr v-if="temperatures.length === 0">
                <td colspan="3" class="no-data-cell">ไม่มีข้อมูล</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Image Gallery -->
      <div class="card images-card">
        <h3>รูปภาพห้อง</h3>
        <div class="upload-section">
          <input 
            type="file" 
            ref="fileInput" 
            @change="handleFileSelect" 
            accept="image/*"
            style="display: none"
          />
          <button @click="$refs.fileInput.click()" class="upload-btn">
            อัปโหลดรูปภาพ
          </button>
          <span v-if="uploading" class="upload-status">กำลังอัปโหลด...</span>
        </div>
        
        <div v-if="images.length === 0" class="no-data">
          ยังไม่มีรูปภาพ
        </div>
        <div v-else class="images-grid">
          <div v-for="image in images" :key="image.id" class="image-item">
            <img :src="image.filepath" :alt="image.filename" @error="handleImageError" />
            <div class="image-info">
              <p>{{ image.filename }}</p>
              <p class="image-date">{{ formatTime(image.uploaded_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

export default {
  name: 'RoomDetail',
  setup() {
    const route = useRoute()
    const roomId = route.params.id
    const room = ref(null)
    const temperatures = ref([])
    const latestTemp = ref(null)
    const images = ref([])
    const loading = ref(true)
    const error = ref('')
    const uploading = ref(false)
    const fileInput = ref(null)
    
    const getAuthHeaders = () => {
      const token = localStorage.getItem('token')
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    }
    
    const fetchRoomData = async () => {
      try {
        loading.value = true
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }
        
        // Fetch room info
        const roomsResponse = await axios.get('/api/rooms', { headers })
        room.value = roomsResponse.data.find(r => r.id == roomId)
        
        if (!room.value) {
          error.value = 'ไม่พบห้องนี้'
          return
        }
        
        // Fetch temperatures
        const tempsResponse = await axios.get(`/api/rooms/${roomId}/temperatures`, { headers })
        temperatures.value = tempsResponse.data
        
        // Fetch latest temperature
        try {
          const latestResponse = await axios.get(`/api/rooms/${roomId}/temperature/latest`, { headers })
          latestTemp.value = latestResponse.data
        } catch (err) {
          latestTemp.value = null
        }
        
        // Fetch images
        const imagesResponse = await axios.get(`/api/rooms/${roomId}/images`, { headers })
        images.value = imagesResponse.data
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
    
    const handleFileSelect = async (event) => {
      const file = event.target.files[0]
      if (!file) return
      
      uploading.value = true
      const formData = new FormData()
      formData.append('image', file)
      
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post(`/api/rooms/${roomId}/images`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
        
        // Refresh images
        await fetchRoomData()
        alert('อัปโหลดสำเร็จ')
      } catch (err) {
        alert(err.response?.data?.error || 'อัปโหลดล้มเหลว')
      } finally {
        uploading.value = false
        if (fileInput.value) {
          fileInput.value.value = ''
        }
      }
    }
    
    const handleImageError = (event) => {
      event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E'
    }
    
    const formatTime = (timeString) => {
      if (!timeString) return ''
      const date = new Date(timeString)
      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    onMounted(() => {
      fetchRoomData()
      
      // Refresh every 30 seconds
      setInterval(() => {
        fetchRoomData()
      }, 30000)
    })
    
    return {
      room,
      temperatures,
      latestTemp,
      images,
      loading,
      error,
      uploading,
      fileInput,
      handleFileSelect,
      handleImageError,
      formatTime
    }
  }
}
</script>

<style scoped>
.room-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.room-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-btn {
  background: #95a5a6;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.back-btn:hover {
  background: #7f8c8d;
}

.room-header h2 {
  color: #2c3e50;
  margin: 0;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

.card h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f0f0f0;
}

.temp-card {
  text-align: center;
}

.temp-display-large {
  padding: 2rem 0;
}

.temp-value-large {
  font-size: 4rem;
  font-weight: bold;
  color: #3498db;
  margin-bottom: 0.5rem;
}

.humidity-value-large {
  font-size: 1.5rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.temp-time-large {
  color: #999;
  font-size: 1rem;
}

.chart-container {
  margin-top: 1rem;
  min-height: 200px;
}

.simple-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 200px;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.chart-bar {
  flex: 1;
  background: #3498db;
  min-height: 2px;
  border-radius: 2px 2px 0 0;
  transition: opacity 0.2s;
}

.chart-bar:hover {
  opacity: 0.7;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f8f9fa;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  font-weight: 600;
  color: #2c3e50;
}

.no-data-cell {
  text-align: center;
  color: #999;
  padding: 2rem;
}

.upload-section {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.upload-btn {
  background: #2ecc71;
  padding: 0.75rem 1.5rem;
}

.upload-btn:hover {
  background: #27ae60;
}

.upload-status {
  color: #666;
  font-style: italic;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.image-item {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}

.image-item:hover {
  transform: scale(1.02);
}

.image-item img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  display: block;
}

.image-info {
  padding: 0.75rem;
  background: #f8f9fa;
}

.image-info p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
}

.image-date {
  color: #999;
  font-size: 0.8rem;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 2rem;
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

.error {
  background: #fee;
  color: #e74c3c;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  border-left: 4px solid #e74c3c;
}
</style>

