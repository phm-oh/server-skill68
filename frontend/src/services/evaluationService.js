import api from './api';

export default {
  // Evaluatee APIs (เปลี่ยน periodId → assignmentId)
  getMyResults: (assignmentId) => api.get(`/results/me/${assignmentId}`),
  saveSelfEvaluation: (data) => api.post('/results/self', data),
  saveSelfBulk: (data) => api.post('/results/self/bulk', data),
  initResultsForAssignment: (data) => api.post('/results/init-for-assignment', data),
  getSummary: (evaluateeId, assignmentId) => api.get(`/results/summary/${evaluateeId}/${assignmentId}`),

  // Committee APIs (เปลี่ยน periodId → assignmentId)
  getByEvaluatee: (evaluateeId, assignmentId) => api.get(`/results/evaluatee/${evaluateeId}/${assignmentId}`),
  evaluate: (data) => api.post('/results/evaluate', data),
  evaluateBulk: (data) => api.post('/results/evaluate/bulk', data),

  // Common
  getAll: () => api.get('/results'),
  getById: (id) => api.get(`/results/${id}`),
  delete: (id) => api.delete(`/results/${id}`)
};
