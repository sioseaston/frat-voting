import type {
  BallotChoice,
  Candidate,
  DashboardStats,
  Election,
  Position,
  ResultsPayload,
  User,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const tokenKey = 'fraternity-voting-token'

export function getStoredToken() {
  return localStorage.getItem(tokenKey)
}

export function setStoredToken(token: string) {
  localStorage.setItem(tokenKey, token)
}

export function clearStoredToken() {
  localStorage.removeItem(tokenKey)
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error ?? 'Something went wrong')
  }

  return payload as T
}

export const api = {
  login: (input: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/api/auth/me'),
  stats: () => request<{ stats: DashboardStats }>('/api/dashboard'),
  members: () => request<{ members: User[] }>('/api/members'),
  createMember: (input: Partial<User> & { password?: string }) =>
    request<{ member: User }>('/api/members', { method: 'POST', body: JSON.stringify(input) }),
  updateMember: (id: string, input: Partial<User> & { password?: string }) =>
    request<{ member: User }>(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteMember: (id: string) => request<{ ok: true }>(`/api/members/${id}`, { method: 'DELETE' }),
  importMembers: (data: Record<string, string>[]) =>
    request<{ imported: number }>('/api/members/import', { method: 'POST', body: JSON.stringify(data) }),
  elections: () => request<{ elections: Election[] }>('/api/elections'),
  createElection: (input: Partial<Election>) =>
    request<{ election: Election }>('/api/elections', { method: 'POST', body: JSON.stringify(input) }),
  updateElection: (id: string, input: Partial<Election>) =>
    request<{ election: Election }>(`/api/elections/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteElection: (id: string) => request<{ ok: true }>(`/api/elections/${id}`, { method: 'DELETE' }),
  positions: (electionId?: string) =>
    request<{ positions: Position[] }>(`/api/positions${electionId ? `?electionId=${electionId}` : ''}`),
  createPosition: (input: Partial<Position>) =>
    request<{ position: Position }>('/api/positions', { method: 'POST', body: JSON.stringify(input) }),
  updatePosition: (id: string, input: Partial<Position>) =>
    request<{ position: Position }>(`/api/positions/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deletePosition: (id: string) => request<{ ok: true }>(`/api/positions/${id}`, { method: 'DELETE' }),
  candidates: (electionId?: string) =>
    request<{ candidates: Candidate[] }>(`/api/candidates${electionId ? `?electionId=${electionId}` : ''}`),
  createCandidate: (input: Partial<Candidate>) =>
    request<{ candidate: Candidate }>('/api/candidates', { method: 'POST', body: JSON.stringify(input) }),
  updateCandidate: (id: string, input: Partial<Candidate>) =>
    request<{ candidate: Candidate }>(`/api/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteCandidate: (id: string) => request<{ ok: true }>(`/api/candidates/${id}`, { method: 'DELETE' }),
  submitVote: (input: { electionId: string; votes: BallotChoice[] }) =>
    request<{ ok: true }>('/api/vote', { method: 'POST', body: JSON.stringify(input) }),
  results: (electionId?: string) =>
    request<ResultsPayload>(`/api/results${electionId ? `?electionId=${electionId}` : ''}`),
}
