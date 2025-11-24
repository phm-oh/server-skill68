<template>
  <div class="user-management">
    <div class="page-header">
      <h2>User Management</h2>
      <button @click="showCreateModal = true" class="create-btn">+ สร้างผู้ใช้ใหม่</button>
    </div>
    
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="users-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>สร้างเมื่อ</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.email || '-' }}</td>
            <td>
              <span :class="['role-badge', user.role]">
                {{ user.role }}
              </span>
            </td>
            <td>{{ formatTime(user.created_at) }}</td>
            <td>
              <button @click="editUser(user)" class="edit-btn">แก้ไข</button>
              <button @click="deleteUser(user.id)" class="delete-btn">ลบ</button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="6" class="no-data-cell">ไม่มีผู้ใช้</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingUser" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ editingUser ? 'แก้ไขผู้ใช้' : 'สร้างผู้ใช้ใหม่' }}</h3>
          <button @click="closeModal" class="close-btn">×</button>
        </div>
        
        <form @submit.prevent="saveUser" class="modal-form">
          <div class="form-group">
            <label>Username *</label>
            <input v-model="formData.username" type="text" required :disabled="editingUser" />
          </div>
          
          <div class="form-group">
            <label>Email</label>
            <input v-model="formData.email" type="email" />
          </div>
          
          <div class="form-group">
            <label>Password {{ editingUser ? '(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)' : '*' }}</label>
            <input v-model="formData.password" type="password" :required="!editingUser" />
          </div>
          
          <div class="form-group">
            <label>Role *</label>
            <select v-model="formData.role" required>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div v-if="formError" class="error">{{ formError }}</div>
          
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="cancel-btn">ยกเลิก</button>
            <button type="submit" :disabled="saving" class="save-btn">
              <span v-if="saving">กำลังบันทึก...</span>
              <span v-else>บันทึก</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'UserManagement',
  setup() {
    const users = ref([])
    const loading = ref(true)
    const error = ref('')
    const showCreateModal = ref(false)
    const editingUser = ref(null)
    const saving = ref(false)
    const formError = ref('')
    
    const formData = ref({
      username: '',
      email: '',
      password: '',
      role: 'user'
    })
    
    const getAuthHeaders = () => {
      const token = localStorage.getItem('token')
      return {
        'Authorization': `Bearer ${token}`
      }
    }
    
    const fetchUsers = async () => {
      try {
        loading.value = true
        const response = await axios.get('/api/users', {
          headers: getAuthHeaders()
        })
        users.value = response.data
      } catch (err) {
        error.value = err.response?.data?.error || 'ไม่สามารถโหลดข้อมูลได้'
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
      } finally {
        loading.value = false
      }
    }
    
    const editUser = (user) => {
      editingUser.value = user
      formData.value = {
        username: user.username,
        email: user.email || '',
        password: '',
        role: user.role
      }
    }
    
    const saveUser = async () => {
      formError.value = ''
      saving.value = true
      
      try {
        if (editingUser.value) {
          // Update user
          await axios.put(`/api/users/${editingUser.value.id}`, {
            username: formData.value.username,
            email: formData.value.email,
            role: formData.value.role
          }, {
            headers: getAuthHeaders()
          })
        } else {
          // Create user
          await axios.post('/api/users', formData.value, {
            headers: getAuthHeaders()
          })
        }
        
        closeModal()
        await fetchUsers()
      } catch (err) {
        formError.value = err.response?.data?.error || 'เกิดข้อผิดพลาด'
      } finally {
        saving.value = false
      }
    }
    
    const deleteUser = async (userId) => {
      if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?')) {
        return
      }
      
      try {
        await axios.delete(`/api/users/${userId}`, {
          headers: getAuthHeaders()
        })
        await fetchUsers()
      } catch (err) {
        alert(err.response?.data?.error || 'ไม่สามารถลบผู้ใช้ได้')
      }
    }
    
    const closeModal = () => {
      showCreateModal.value = false
      editingUser.value = null
      formData.value = {
        username: '',
        email: '',
        password: '',
        role: 'user'
      }
      formError.value = ''
    }
    
    const formatTime = (timeString) => {
      if (!timeString) return '-'
      const date = new Date(timeString)
      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    onMounted(() => {
      fetchUsers()
    })
    
    return {
      users,
      loading,
      error,
      showCreateModal,
      editingUser,
      saving,
      formData,
      formError,
      editUser,
      saveUser,
      deleteUser,
      closeModal,
      formatTime
    }
  }
}
</script>

<style scoped>
.user-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h2 {
  color: #2c3e50;
  margin: 0;
}

.create-btn {
  background: #2ecc71;
  padding: 0.75rem 1.5rem;
}

.create-btn:hover {
  background: #27ae60;
}

.users-table {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  font-weight: 600;
  color: #2c3e50;
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.role-badge.admin {
  background: #e74c3c;
  color: white;
}

.role-badge.user {
  background: #3498db;
  color: white;
}

.edit-btn {
  background: #f39c12;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  margin-right: 0.5rem;
}

.edit-btn:hover {
  background: #e67e22;
}

.delete-btn {
  background: #e74c3c;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.delete-btn:hover {
  background: #c0392b;
}

.no-data-cell {
  text-align: center;
  color: #999;
  padding: 2rem;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: transparent;
  color: #999;
  border: none;
  font-size: 2rem;
  line-height: 1;
  padding: 0;
  width: 30px;
  height: 30px;
  cursor: pointer;
}

.close-btn:hover {
  color: #333;
}

.modal-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3498db;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-btn {
  background: #95a5a6;
  padding: 0.75rem 1.5rem;
}

.cancel-btn:hover {
  background: #7f8c8d;
}

.save-btn {
  background: #2ecc71;
  padding: 0.75rem 1.5rem;
}

.save-btn:hover:not(:disabled) {
  background: #27ae60;
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

