const backendUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')

export const API_BASE_URL = backendUrl ? `${backendUrl}/api` : '/api'
