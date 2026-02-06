const API_BASE = '/api';

async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth
  register: (body: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getProfile: () => request('/auth/me'),
  updateProfile: (body: any) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),
  updateLearnerProfile: (body: any) => request('/auth/me/learner', { method: 'PATCH', body: JSON.stringify(body) }),

  // Institutions
  getInstitutions: (params?: string) => request(`/institutions${params ? `?${params}` : ''}`),
  getInstitution: (id: string) => request(`/institutions/${id}`),

  // Programmes
  getProgrammes: (params?: string) => request(`/programmes${params ? `?${params}` : ''}`),
  getProgramme: (id: string) => request(`/programmes/${id}`),
  compareProgrammes: (ids: string[]) => request('/programmes/compare', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Applications
  getApplications: (params?: string) => request(`/applications${params ? `?${params}` : ''}`),
  getApplication: (id: string) => request(`/applications/${id}`),
  createApplication: (body: any) => request('/applications', { method: 'POST', body: JSON.stringify(body) }),
  submitApplication: (id: string) => request(`/applications/${id}/submit`, { method: 'POST' }),
  withdrawApplication: (id: string, reason?: string) =>
    request(`/applications/${id}/withdraw`, { method: 'POST', body: JSON.stringify({ reason }) }),
  attachDocument: (id: string, documentId: string) =>
    request(`/applications/${id}/documents`, { method: 'POST', body: JSON.stringify({ documentId }) }),

  // Guidance
  getRecommendations: () => request('/guidance/recommendations'),
  checkEligibility: (programmeId: string) => request(`/guidance/eligibility/${programmeId}`),
  getAlternatives: (programmeId: string) => request(`/guidance/alternatives/${programmeId}`),
  getValueAnalysis: (programmeId: string) => request(`/guidance/value/${programmeId}`),

  // Assessments
  getQuestions: () => request('/assessments/questions'),
  submitAssessment: (responses: any[]) => request('/assessments/submit', { method: 'POST', body: JSON.stringify({ responses }) }),
  getAssessmentHistory: () => request('/assessments/history'),

  // Documents
  getDocuments: () => request('/documents'),
  uploadDocument: async (file: File, type: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });
    return res.json();
  },
  deleteDocument: (id: string) => request(`/documents/${id}`, { method: 'DELETE' }),

  // Payments
  getPayments: () => request('/payments'),
  initiatePayment: (body: any) => request('/payments/initiate', { method: 'POST', body: JSON.stringify(body) }),

  // Admin
  getStats: () => request('/admin/stats'),
  getUsers: (params?: string) => request(`/admin/users${params ? `?${params}` : ''}`),
};
