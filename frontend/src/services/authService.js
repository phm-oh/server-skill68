import api from './api';

export default {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  logout: () => {
    localStorage.removeItem('auth_token');
    return Promise.resolve();
  }
};
