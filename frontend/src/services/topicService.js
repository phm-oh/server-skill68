import api from './api';

export default {
  // Topics (ลบ periodId parameter ออก เพราะไม่มี periods แล้ว)
  getAll: () => api.get('/topics'),
  getActive: () => api.get('/topics/active'),
  getById: (id) => api.get(`/topics/${id}`),
  create: (data) => api.post('/topics', data),
  update: (id, data) => api.put(`/topics/${id}`, data),
  delete: (id) => api.delete(`/topics/${id}`),

  // Indicators
  getIndicatorsByTopic: (topicId) => api.get(`/indicators/topic/${topicId}`),
  getIndicatorById: (id) => api.get(`/indicators/${id}`),
  createIndicator: (data) => api.post('/indicators', data),
  updateIndicator: (id, data) => api.put(`/indicators/${id}`, data),
  deleteIndicator: (id) => api.delete(`/indicators/${id}`)
};
