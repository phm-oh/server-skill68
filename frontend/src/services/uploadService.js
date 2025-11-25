import api from './api';

export default {
  upload: (file, onProgress, metadata = {}) => {
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata if provided (เปลี่ยน period_id → assignment_id)
    if (metadata.assignment_id) formData.append('assignment_id', metadata.assignment_id);
    if (metadata.indicator_id) formData.append('indicator_id', metadata.indicator_id);
    if (metadata.evidence_type_id) formData.append('evidence_type_id', metadata.evidence_type_id);

    return api.post('/upload/evidence', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) onProgress(progress);
      }
    });
  },

  getMine: () => api.get('/upload/mine'),
  getForEvaluator: (evaluateeId) => api.get(`/upload/evaluatee/${evaluateeId}`),
  delete: (id) => api.delete(`/upload/${id}`),
  updateFile: (id, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    return api.put(`/upload/${id}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) onProgress(progress);
      }
    });
  },
  updateMeta: (id, data) => api.patch(`/upload/${id}`, data)
};
