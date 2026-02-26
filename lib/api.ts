const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '');

const normalizedBase = RAW_API_BASE_URL.replace(/\/+$/, '');

export const API_BASE_URL = normalizedBase
  ? normalizedBase.endsWith('/api')
    ? normalizedBase
    : `${normalizedBase}/api`
  : '';

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  if (!API_BASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_API_URL configuration');
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  if (typeof window !== 'undefined' && !token && endpoint !== '/auth/signin' && endpoint !== '/auth/signup') {
    throw new Error('กรุณาล็อคอินใหม่อีกครั้ง (Session Expired)');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(joinUrl(API_BASE_URL, endpoint), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Something went wrong');
  }

  return response.json();
}

export async function apiUpload(endpoint: string, formData: FormData) {
  if (!API_BASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_API_URL configuration');
  }

  const token = localStorage.getItem('access_token');

  const response = await fetch(joinUrl(API_BASE_URL, endpoint), {
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
