const API_BASE_URL = '/api';

function buildHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const token = localStorage.getItem('token');
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    return {
      ...defaultHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  return defaultHeaders;
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(options.headers),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'API 요청에 실패했습니다.');
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
