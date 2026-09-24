import { auth } from './firebase'

const profileRequest = async (url, options = {}) => {
  const user = auth.currentUser
  if (!user) throw new Error('No hay una sesión activa')

  const token = await user.getIdToken()
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  })

  if (!response.ok) throw new Error('No se pudo cargar el perfil')
  return response.json()
}

export const getProfile = () => profileRequest('/api/profile')
export const saveProfile = (profile) => profileRequest('/api/profile', {
  method: 'PUT',
  body: JSON.stringify(profile)
})

export const getProfileFavorites = () => profileRequest('/api/profile/favorites')
export const saveProfileFavorites = (exerciseIds, schedule = {}, nutritionIds, nutritionSchedule) => {
  const body = { exerciseIds, schedule }
  if (nutritionIds !== undefined) {
    body.nutritionIds = nutritionIds
    body.nutritionSchedule = nutritionSchedule || {}
  }
  return profileRequest('/api/profile/favorites', {
    method: 'PUT',
    body: JSON.stringify(body)
  })
}

export const getProfileCart = () => profileRequest('/api/profile/cart')

export const saveProfileCart = (items) => profileRequest('/api/profile/cart', {
  method: 'PUT',
  body: JSON.stringify({ items })
})
