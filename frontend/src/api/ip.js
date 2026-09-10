import { apiClient } from './client';

export const ipApi = {
  checkPatentability: async (data) => apiClient.post('/ip/patentability', data),
  checkPriorArt: async (data) => apiClient.post('/ip/prior-art', data),
  checkNovelty: async (data) => apiClient.post('/novelty/check', data),
  checkTrademark: async (data) => apiClient.post('/trademark/check', data),
  checkGI: async (data) => apiClient.post('/ip/gi-check', data),
};
