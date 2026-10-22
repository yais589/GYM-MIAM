const productionApiUrl = 'https://gym-miam-backend.onrender.com/api'
const configuredApiUrl = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? productionApiUrl : '/api')

export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, '')

export const apiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
