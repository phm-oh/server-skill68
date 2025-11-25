import api from './api';

export default {
  getAll: () => api.get('/assignments'),
  getMine: () => api.get('/assignments/mine'),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  createBulk: (data) => api.post('/assignments/bulk', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`)
};
