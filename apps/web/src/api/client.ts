const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, status: number, code: string = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL.replace(/\/$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // send and receive HttpOnly JWT cookies
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorPayload = data?.error;
    const message = errorPayload?.message || response.statusText || 'Request failed';
    const code = errorPayload?.code || `HTTP_${response.status}`;
    const details = errorPayload?.details;
    throw new ApiError(message, response.status, code, details);
  }

  return data as T;
}
