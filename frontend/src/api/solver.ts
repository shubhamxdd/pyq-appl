import api, { API_URL } from './auth';

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  status?: string;
  created_at: string;
}

export const solverApi = {
  createSession: async () => {
    const response = await api.post<ChatSession>('/solver/sessions');
    return response.data;
  },
  listSessions: async () => {
    const response = await api.get<ChatSession[]>('/solver/sessions');
    return response.data;
  },
  getSessionHistory: async (id: string) => {
    const response = await api.get<ChatMessage[]>(`/solver/sessions/${id}/history`);
    return response.data;
  },
  deleteSession: async (id: string) => {
    const response = await api.delete(`/solver/sessions/${id}`);
    return response.data;
  },
  updateSession: async (id: string, data: { title: string }) => {
    const response = await api.patch<ChatSession>(`/solver/sessions/${id}`, data);
    return response.data;
  },
  ask: async (data: { content: string; resource_ids: string[]; session_id?: string }) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(`${API_URL}/solver/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  },
};
