import { auth } from './firebase'
import { apiUrl } from './apiBase'

export async function askAdminAI(message, confirmationToken = '') {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Necesitas iniciar sesión como administrador')

  const token = await currentUser.getIdToken()
  const response = await fetch(apiUrl('/admin/ai'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ message, confirmationToken: confirmationToken || undefined })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Error de la IA administrativa (${response.status})`)
  return data
}

export async function getAdminAIInteractions(limit = 30) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Necesitas iniciar sesión como administrador')
  const token = await currentUser.getIdToken()
  const response = await fetch(apiUrl(`/admin/ai/interactions?limit=${limit}`), {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `No se pudo recuperar el historial (${response.status})`)
  return data.interactions || []
}
