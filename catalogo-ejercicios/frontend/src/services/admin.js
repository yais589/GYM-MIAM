import { auth } from './firebase'
import { apiUrl } from './apiBase'

const adminRequest = async (path, options = {}) => {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Necesitas iniciar sesión')
  const token = await currentUser.getIdToken()
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Error administrativo (${response.status})`)
  return data
}

export const getAdminOverview = () => adminRequest('/admin/overview')
export const getAdminUsers = ({ limit = 25, pageToken = '', search = '' } = {}) => {
  const params = new URLSearchParams({ limit: String(limit) })
  if (pageToken) params.set('pageToken', pageToken)
  if (search) params.set('search', search)
  return adminRequest(`/admin/users?${params.toString()}`)
}
export const getAdminUser = (uid) => adminRequest(`/admin/users/${encodeURIComponent(uid)}`)
export const setUserDisabled = (uid, disabled) => adminRequest(`/admin/users/${encodeURIComponent(uid)}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ disabled })
})
export const setAdminRole = (uid, enabled) => adminRequest(`/admin/users/${encodeURIComponent(uid)}/role`, {
  method: 'PATCH',
  body: JSON.stringify({ enabled })
})
