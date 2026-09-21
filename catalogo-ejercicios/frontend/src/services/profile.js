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
export const saveProfileFavorites = (exerciseIds, schedule = {}) => profileRequest('/api/profile/favorites', {
  method: 'PUT',
  body: JSON.stringify({ exerciseIds, schedule })
})
