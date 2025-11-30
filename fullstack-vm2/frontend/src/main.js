import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import App from './App.vue'
import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'
import RoomDetail from './views/RoomDetail.vue'
import Admin from './views/Admin.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/room/:id', component: RoomDetail, meta: { requiresAuth: true } },
    { path: '/admin', component: Admin, meta: { requiresAuth: true, role: 'admin' } },
  ]
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (to.meta.requiresAuth && !token) next('/login');
  else if (to.meta.role && user.role !== to.meta.role) next('/');
  else next();
});

const vuetify = createVuetify()
createApp(App).use(router).use(vuetify).mount('#app')

