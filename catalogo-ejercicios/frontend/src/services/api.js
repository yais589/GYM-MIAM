import axios from 'axios';

const API_URL = '/api';
const STORE_API_URL = import.meta.env.VITE_STORE_API_URL || 'https://api-titangym.onrender.com/storeitems';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ========== EJERCICIOS ==========
export const getExercises = (limit = 4) => api.get('/exercises', { params: { limit } });
export const getExerciseById = (id) => api.get(`/exercises/${id}`);
export const getExercisesByCategory = (category) => api.get(`/exercises/category/${category}`);
export const searchExercises = (query) => api.get(`/exercises/search/${query}`);
export const getExercisesByDifficulty = (difficulty) => api.get(`/exercises/difficulty/${difficulty}`);

// ========== CATEGORÍAS ==========
export const getCategories = () => api.get('/categories');
export const getCategoryStats = () => api.get('/categories/stats');

// ========== USUARIO ==========
export const createUser = (userData) => api.post('/user', userData);
export const getUser = (id) => api.get(`/user/${id}`);
export const updateUser = (id, userData) => api.put(`/user/${id}`, userData);
export const deleteUser = (id) => api.delete(`/user/${id}`);

// ========== FAVORITOS ==========
export const getFavorites = (userId) => api.get(`/user/${userId}/favorites`);
export const addFavorite = (userId, exerciseId) => api.post(`/user/${userId}/favorites/${exerciseId}`);
export const removeFavorite = (userId, exerciseId) => api.delete(`/user/${userId}/favorites/${exerciseId}`);

// ========== ENTRENAMIENTOS ==========
export const createWorkout = (userId, workoutData) => api.post(`/user/${userId}/workout`, workoutData);
export const getWorkouts = (userId) => api.get(`/user/${userId}/workouts`);
export const getStats = (userId) => api.get(`/user/${userId}/stats`);

// ========== RUTINAS ==========
export const createRoutine = (userId, routineData) => api.post(`/user/${userId}/routines`, routineData);
export const getRoutines = (userId) => api.get(`/user/${userId}/routines`);

// ========== RECOMENDACIONES ==========
export const getRecommendations = (userId) => api.get(`/recommendations/${userId}`);

// ========== HEALTH CHECK ==========
export const healthCheck = () => api.get('/health');

// ========== TIENDA ==========
export const getStoreItems = async () => {
  const response = await fetch(STORE_API_URL);
  if (!response.ok) throw new Error('Store catalog request failed');

  const data = await response.json();
  const items = Array.isArray(data) ? data : data.items || data.data;
  if (!Array.isArray(items)) throw new Error('Invalid store catalog response');

  return items.map((item, index) => ({
    ...item,
    id: item.id ?? item.sku ?? `${item.name || 'product'}-${index}`,
    price: Number(item.price) || 0,
    stock: Math.max(0, Number.parseInt(item.stock, 10) || 0),
    isAvailable: item.isAvailable !== false
  }));
};
