const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const normalizedBaseUrl = rawApiBaseUrl.replace(/\/$/, '');
export const API_BASE_URL = normalizedBaseUrl.endsWith('/api')
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/api`;

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');

  if (!token && endpoint !== '/auth/signin' && endpoint !== '/auth/signup') {
    throw new Error('กรุณาล็อคอินใหม่อีกครั้ง (Session Expired)');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('Unauthorized. Please login again.');
    }
    throw new Error(errorData.message || 'Something went wrong');
  }

  return response.json();
}

export async function apiUpload(endpoint: string, formData: FormData) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Upload failed');
  }

  return response.json();
}
