<template>
  <div>
    <h2 class="text-h4 mb-4">Admin Panel</h2>
    
    <v-card class="mb-6">
      <v-card-title class="d-flex align-center bg-grey-lighten-3">
        Manage Rooms
        <v-spacer></v-spacer>
        <v-btn color="info" variant="text" class="mr-2" @click="scanDevices">Scan Devices</v-btn>
        <v-btn color="primary" @click="openAddRoom">Add Room</v-btn>
      </v-card-title>
      <v-table>
        <thead><tr><th>ID</th><th>Name</th><th>Image</th><th>Action</th></tr></thead>
        <tbody>
          <tr v-for="r in rooms" :key="r.id">
            <td>{{ r.id }}</td>
            <td>{{ r.name }}</td>
            <td>
              <v-img v-if="r.image" :src="r.image" width="50" height="30" cover class="bg-grey-lighten-2"></v-img>
              <span v-else class="text-caption text-grey">No Img</span>
            </td>
            <td>
              <v-btn size="small" color="warning" icon="mdi-pencil" class="mr-1" @click="openEditRoom(r)"></v-btn>
              <v-btn size="small" color="error" icon="mdi-delete" @click="deleteRoom(r.id)"></v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-card>
      <v-card-title class="d-flex align-center bg-grey-lighten-3">
        Manage Users
        <v-spacer></v-spacer>
        <v-btn color="secondary" @click="openAddUser">Add User</v-btn>
      </v-card-title>
      <v-table>
        <thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Action</th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.username }}</td>
            <td><v-chip size="small" :color="u.role==='admin'?'red':'blue'">{{ u.role }}</v-chip></td>
            <td>
              <v-btn size="small" color="warning" icon="mdi-pencil" class="mr-1" @click="openEditUser(u)"></v-btn>
              <v-btn size="small" color="error" icon="mdi-delete" @click="deleteUser(u.id)"></v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Dialog Add/Edit Room -->
    <v-dialog v-model="dialogRoom" max-width="500">
      <v-card :title="isEditMode ? 'Edit Room' : 'Add New Room'">
        <v-card-text>
          <v-text-field v-model="roomForm.name" label="Room Name"></v-text-field>
          <v-file-input v-model="roomForm.file" label="Room Image" prepend-icon="mdi-camera" accept="image/*"></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="saveRoom" color="primary">{{ isEditMode ? 'Update' : 'Create' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Add/Edit User -->
    <v-dialog v-model="dialogUser" max-width="500">
      <v-card :title="isEditUserMode ? 'Edit User' : 'Add New User'">
        <v-card-text>
          <v-text-field v-model="userForm.username" label="Username" :disabled="isEditUserMode"></v-text-field>
          <v-text-field v-model="userForm.password" label="Password" type="password" 
            :hint="isEditUserMode ? 'Leave blank to keep current' : ''" persistent-hint></v-text-field>
          <v-select v-model="userForm.role" :items="['user','admin']" label="Role"></v-select>
          
          <!-- Room Access Selection -->
          <v-select
            v-if="userForm.role === 'user'"
            v-model="userForm.roomIds"
            :items="rooms"
            item-title="name"
            item-value="id"
            label="Allowed Rooms"
            multiple
            chips
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="saveUser" color="primary">{{ isEditUserMode ? 'Update' : 'Create' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Scan Devices -->
    <v-dialog v-model="dialogScan" max-width="600">
      <v-card title="Unregistered Devices Found">
        <v-list>
          <v-list-item v-for="d in newDevices" :key="d.topic" :title="d.topic" :subtitle="new Date(d.last_seen).toLocaleString()">
            <template v-slot:append>
              <v-btn size="small" color="success" @click="createRoomFromDevice(d.topic)">Create Room</v-btn>
            </template>
          </v-list-item>
          <v-list-item v-if="!newDevices.length">No new devices found.</v-list-item>
        </v-list>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="dialogScan = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

const rooms = ref([])
const users = ref([])
const newDevices = ref([])
const API = 'http://localhost:3000'
const token = localStorage.getItem('token')
const headers = { Authorization: `Bearer ${token}` }

const dialogRoom = ref(false)
const dialogUser = ref(false)
const dialogScan = ref(false)
const isEditMode = ref(false)
const isEditUserMode = ref(false)
const editingRoomId = ref(null)
const editingUserId = ref(null)

const roomForm = reactive({ name: '', file: null })
const userForm = reactive({ username: '', password: '', role: 'user', roomIds: [] })

// Room Actions
const openAddRoom = () => {
  isEditMode.value = false
  roomForm.name = ''
  roomForm.file = null
  dialogRoom.value = true
}

const openEditRoom = (room) => {
  isEditMode.value = true
  editingRoomId.value = room.id
  roomForm.name = room.name
  roomForm.file = null
  dialogRoom.value = true
}

const saveRoom = async () => {
  const formData = new FormData()
  formData.append('name', roomForm.name)
  if (roomForm.file) {
    const fileToUpload = Array.isArray(roomForm.file) ? roomForm.file[0] : roomForm.file;
    formData.append('image', fileToUpload);
  }
  
  const config = { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }

  try {
    if (isEditMode.value) {
      await axios.put(`${API}/rooms/${editingRoomId.value}`, formData, config)
    } else {
      await axios.post(`${API}/rooms`, formData, config)
    }
    dialogRoom.value = false
    loadData()
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

// User Actions
const openAddUser = () => {
  isEditUserMode.value = false
  userForm.username = ''
  userForm.password = ''
  userForm.role = 'user'
  userForm.roomIds = []
  dialogUser.value = true
}

const openEditUser = (user) => {
  isEditUserMode.value = true
  editingUserId.value = user.id
  userForm.username = user.username
  userForm.password = '' // Don't show password
  userForm.role = user.role
  userForm.roomIds = user.roomIds || []
  dialogUser.value = true
}

const saveUser = async () => {
  try {
    if (isEditUserMode.value) {
      // Update
      await axios.put(`${API}/users/${editingUserId.value}`, userForm, { headers })
    } else {
      // Create
      await axios.post(`${API}/users`, userForm, { headers })
    }
    dialogUser.value = false
    loadData()
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

// Common Actions
const scanDevices = async () => {
  const { data } = await axios.get(`${API}/devices/new`, { headers })
  newDevices.value = data
  dialogScan.value = true
}

const createRoomFromDevice = (topic) => {
  const name = topic.split('/')[1]
  roomForm.name = name
  isEditMode.value = false // Create mode
  dialogScan.value = false
  dialogRoom.value = true
}

const deleteRoom = async (id) => {
  if(confirm('Delete Room?')) {
    await axios.delete(`${API}/rooms/${id}`, { headers })
    loadData()
  }
}

const deleteUser = async (id) => {
  if(confirm('Delete User?')) {
    await axios.delete(`${API}/users/${id}`, { headers })
    loadData()
  }
}

const loadData = async () => {
  try {
    const [r, u] = await Promise.all([
      axios.get(`${API}/rooms`, { headers }),
      axios.get(`${API}/users`, { headers })
    ])
    rooms.value = r.data
    users.value = u.data
  } catch (e) {
    console.error(e)
  }
}

onMounted(loadData)
</script>
