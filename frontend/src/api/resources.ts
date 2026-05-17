import api from './auth';

export interface Resource {
  id: string;
  filename: string;
  type: 'notes' | 'syllabus' | 'past_paper' | 'other';
  file_url: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  created_at: string;
}

export const resourcesApi = {
  upload: async (file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const response = await api.post<Resource>('/resources/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  list: async () => {
    const response = await api.get<Resource[]>('/resources/');
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/resources/${id}`);
    return response.data;
  },
  retry: async (id: string) => {
    const response = await api.post<Resource>(`/resources/${id}/retry`);
    return response.data;
  },
  stop: async (id: string) => {
    const response = await api.post<Resource>(`/resources/${id}/stop`);
    return response.data;
  },
  update: async (id: string, data: { filename?: string }) => {
    const response = await api.patch<Resource>(`/resources/${id}`, data);
    return response.data;
  },
};
