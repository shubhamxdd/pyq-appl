import api from './auth';

export const papersApi = {
  list: async () => {
    const response = await api.get('/papers');
    return response.data;
  },
  
  get: async (id: string) => {
    const response = await api.get(`/papers/${id}`);
    return response.data;
  },
  
  getOutput: async (id: string) => {
    const response = await api.get(`/papers/${id}/output`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/papers', data);
    return response.data;
  },
  
  detectFormat: async (resourceId: string) => {
    const response = await api.post('/papers/detect-format', { resource_id: resourceId });
    return response.data;
  },
  
  toggleOutput: async (id: string, data: any) => {
    const response = await api.patch(`/papers/${id}/output`, data);
    return response.data;
  },
  
  getPdf: async (id: string, mode: string = 'full') => {
    const response = await api.get(`/papers/${id}/pdf`, { params: { mode } });
    return response.data;
  }
};
