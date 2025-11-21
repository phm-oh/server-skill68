<template>
  <div class="user-management">
    <div class="container">
      <h2>User Management</h2>
      <button @click="showCreateForm = true" class="btn-create">Create User</button>
      
      <div v-if="showCreateForm" class="create-form">
        <h3>Create New User</h3>
        <input v-model="newUser.username" type="text" placeholder="Username">
        <input v-model="newUser.email" type="email" placeholder="Email">
        <input v-model="newUser.password" type="password" placeholder="Password">
        <select v-model="newUser.role">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <div class="form-actions">
          <button @click="createUser">Create</button>
          <button @click="showCreateForm = false">Cancel</button>
        </div>
      </div>
      
      <table class="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.role }}</td>
            <td>
              <button @click="editUser(user)">Edit</button>
              <button @click="deleteUser(user.id)" class="btn-delete">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'UserManagement',
  data() {
    return {
      users: [],
      showCreateForm: false,
      newUser: {
        username: '',
        email: '',
        password: '',
        role: 'user'
      }
    }
  },
  async mounted() {
    await this.fetchUsers()
  },
  methods: {
    async fetchUsers() {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        })
        this.users = res.data
      } catch (err) {
        console.error(err)
      }
    },
    async createUser() {
      try {
        const token = localStorage.getItem('token')
        await axios.post('/api/users', this.newUser, {
          headers: { Authorization: `Bearer ${token}` }
        })
        this.showCreateForm = false
        this.newUser = { username: '', email: '', password: '', role: 'user' }
        await this.fetchUsers()
        alert('User created successfully')
      } catch (err) {
        alert('Failed to create user')
      }
    },
    async deleteUser(userId) {
      if (!confirm('Delete this user?')) return
      try {
        const token = localStorage.getItem('token')
        await axios.delete(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        await this.fetchUsers()
      } catch (err) {
        alert('Failed to delete user')
      }
    },
    editUser(user) {
      // Simple edit - could be improved
      const newRole = user.role === 'admin' ? 'user' : 'admin'
      this.updateUser(user.id, { role: newRole })
    },
    async updateUser(userId, data) {
      try {
        const token = localStorage.getItem('token')
        await axios.put(`/api/users/${userId}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        })
        await this.fetchUsers()
      } catch (err) {
        alert('Failed to update user')
      }
    }
  }
}
</script>

<style scoped>
.user-management {
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.btn-create {
  background: #27ae60;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 1rem;
}

.create-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.create-form input,
.create-form select {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 1rem;
}

.users-table {
  width: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.users-table th,
.users-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.users-table th {
  background: #34495e;
  color: white;
}

.btn-delete {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 0.5rem;
}
</style>


