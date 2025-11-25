import api from './api';

export default {
  create: (data) => api.post('/signatures', data),
  getByEvaluatee: (evaluateeId, assignmentId) => api.get(`/signatures/evaluatee/${evaluateeId}/${assignmentId}`)
};
