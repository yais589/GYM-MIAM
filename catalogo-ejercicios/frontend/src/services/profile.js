import { auth } from './firebase'
import { signOut } from 'firebase/auth'
import { apiUrl } from './apiBase'

const profileRequest = async (url, options = {}) => {
  const user = auth.currentUser
  if (!user) throw new Error('No hay una sesión activa')

  const request = (token) => fetch(apiUrl(url), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  })
  let token = await user.getIdToken()
  let response = await request(token)

  // Un token puede caducar mientras la pestaña permanece abierta. Firebase
  // suele renovarlo automáticamente, pero forzamos una renovación cuando el
  // backend rechaza el primer token para no obligar al usuario a reloguearse.
  if (response.status === 401) {
    token = await user.getIdToken(true)
    response = await request(token)
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(data.error || `No se pudo guardar el perfil (HTTP ${response.status})`)
    error.code = data.code
    error.status = response.status
    if (response.status === 401) {
      await signOut(auth).catch(() => {})
      error.code = 'session-expired'
      error.message = 'La sesión ha caducado. Vuelve a iniciar sesión para guardar el perfil.'
    }
    throw error
  }
  return response.json()
}

export const getProfile = () => profileRequest('/profile')
export const saveProfile = (profile) => profileRequest('/profile', {
  method: 'PUT',
  body: JSON.stringify(profile)
})

// Los ids pueden llegar como número (catálogo) o texto (chat): los normalizamos
// a texto para que "incluye en favoritos" funcione siempre.
export const sameId = (first, second) => String(first) === String(second)
export const isFavorited = (ids, id) => Array.isArray(ids) && ids.some(saved => sameId(saved, id))
const normalizeIds = (ids) => (Array.isArray(ids) ? ids.map(String) : [])

export const getProfileFavorites = () => profileRequest('/profile/favorites').then(data => ({
  exerciseIds: normalizeIds(data.exerciseIds),
  schedule: data.schedule && typeof data.schedule === 'object' ? data.schedule : {},
  nutritionIds: normalizeIds(data.nutritionIds),
  nutritionSchedule: data.nutritionSchedule && typeof data.nutritionSchedule === 'object' ? data.nutritionSchedule : {}
}))

export const saveProfileFavorites = (exerciseIds, schedule = {}, nutritionIds, nutritionSchedule) => {
  const body = { exerciseIds: normalizeIds(exerciseIds), schedule }
  if (nutritionIds !== undefined) {
    body.nutritionIds = normalizeIds(nutritionIds)
    body.nutritionSchedule = nutritionSchedule || {}
  }
  return profileRequest('/profile/favorites', {
    method: 'PUT',
    body: JSON.stringify(body)
  })
}

export const getProfileCart = () => profileRequest('/profile/cart')

export const saveProfileCart = (items) => profileRequest('/profile/cart', {
  method: 'PUT',
  body: JSON.stringify({ items })
})
