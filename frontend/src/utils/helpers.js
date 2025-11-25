export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const calculateScore = (selectedValue, weight, maxValue = 4) => {
  // Normalize score based on max value (default 4 for score_1_4 type)
  // For yes_no or file_url, maxValue should be 1
  return (selectedValue / maxValue) * weight;
};

export const calculateTopicScore = (indicators, topicWeight) => {
  const totalIndicatorScore = indicators.reduce((sum, ind) => {
    return sum + calculateScore(ind.selected_value || 0, ind.weight_score || 0);
  }, 0);

  return (totalIndicatorScore * topicWeight) / 100;
};

export const calculateTotalScore = (topics) => {
  return topics.reduce((sum, topic) => {
    return sum + calculateTopicScore(topic.indicators || [], topic.weight_percentage || 0);
  }, 0);
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const getDaysRemaining = (endDate) => {
  const today = new Date();
  const end = new Date(endDate);
  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getProgressPercentage = (completed, total) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};
