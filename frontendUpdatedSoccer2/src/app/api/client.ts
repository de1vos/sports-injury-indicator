import { supabase } from '../../lib/supabase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new ApiError(res.status, `API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new ApiError(401, 'Not authenticated')
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  })
  if (!res.ok) throw new ApiError(res.status, `API error ${res.status}: ${path}`)
  if (res.status === 204) return undefined as T
  return res.json()
}
