import { apiClient } from './client';
export * from './ip';

export const ragApi = {
  askQuestion: async (data, config = {}) => apiClient.post('/ask/', data, config),
};

export const documentsApi = {
  uploadDocument: async (file, config = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    });
  },
};

export const escalationApi = {
  escalate: async (data, config = {}) => apiClient.post('/escalate/', data, config),
};

export const complianceApi = {
  getRegulatoryPathway: async (data) => apiClient.post('/regulatory/pathway', data),
  screenABS: async (data) => apiClient.post('/abs/screen', data),
  getABSObligations: async (data) => apiClient.post('/abs/obligations', data),
};

export const knowledgeApi = {
  checkTKOverlap: async (data) => apiClient.post('/tk/check', data),
  checkMisappropriation: async (data) => apiClient.post('/tk/misappropriation-check', data),
};

export const exportApi = {
  navigateExport: async (data) => apiClient.post('/export/navigate', data),
};

export const productsApi = {
  listProducts: async () => apiClient.get('/products/'),
  getProduct: async (id) => apiClient.get(`/products/${id}`),
  createProduct: async (data) => apiClient.post('/products/', data),
};

export const passportApi = {
  getPassport: async (productId) => apiClient.get(`/passport/${productId}`),
  generatePassport: async (data) => apiClient.post('/passport/generate', data),
};

export const analyticsApi = {
  getEvaluationMetrics: async () => apiClient.get('/evaluation/metrics'),
};
