import api from './auth';

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
  ask: async (data: { content: string; resource_ids: string[]; session_id?: string }) => {
    const token = localStorage.getItem('token');
    return fetch('http://127.0.0.1:8001/api/solver/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },
};
