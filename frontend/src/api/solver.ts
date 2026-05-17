import api from './auth';

export interface QuestionRequest {
  content: string;
  resource_ids: string[];
}

export const solverApi = {
  // Note: Streaming is handled via Fetch API or EventSource, not standard Axios
  ask: async (data: QuestionRequest) => {
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
