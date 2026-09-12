import { apiClient, API_BASE_URL } from './client';
export * from './ip';

const PUBLIC_APP_BASE_URL = import.meta.env.VITE_PUBLIC_APP_BASE_URL || (
  import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin
);

export const getPublicPassportUrl = (passportId) => (
  `${PUBLIC_APP_BASE_URL.replace(/\/$/, '')}/verify/${encodeURIComponent(passportId)}`
);

export const getPassportQrUrl = (passportId) => (
  `${API_BASE_URL}/passport/${encodeURIComponent(passportId)}/qr`
);

export const ragApi = {
  askQuestion: async (data, config = {}) => apiClient.post('/ask', data, config),
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
  escalate: async (data, config = {}) => apiClient.post('/escalate', data, config),
};

export const complianceApi = {
  getRegulatoryPathway: async (data) => apiClient.post('/regulatory/pathway', data),
  screenABS: async (data) => apiClient.post('/abs/screen', data),
  getABSObligations: async (data) => apiClient.post('/abs/obligations', data),
};

let productsCache = null;

export const knowledgeApi = {
  checkTKOverlap: async (data) => apiClient.post('/tk/check', data),
  checkMisappropriation: async (data) => apiClient.post('/tk/misappropriation-check', data),
};

export const exportApi = {
  navigateExport: async (data) => apiClient.post('/export/navigate', data),
};

export const productsApi = {
  listProducts: async () => {
    if (productsCache) return productsCache;
    productsCache = await apiClient.get('/products/');
    return productsCache;
  },
  listIngredientReferences: async (query = '') => apiClient.get(`/products/ingredients${query ? `?query=${encodeURIComponent(query)}` : ''}`),
  getProduct: async (id) => apiClient.get(`/products/${id}`),
  deleteProduct: async (id) => {
    const result = await apiClient.delete(`/products/${id}`);
    productsCache = null;
    return result;
  },
  checkDuplicate: async (data) => apiClient.post('/products/check-duplicate', data),
  createProduct: async (data) => {
    const product = await apiClient.post('/products/', data);
    productsCache = null;
    return product;
  },
};

export const passportApi = {
  getPassport: async (productId) => apiClient.get(`/passport/${productId}`),
  getPublicPassport: async (productId) => apiClient.get(`/passport/public/${productId}`),
  generatePassport: async (data) => apiClient.post('/passport/generate', data),
};

export const analyticsApi = {
  getEvaluationMetrics: async () => apiClient.get('/evaluation/metrics'),
};
