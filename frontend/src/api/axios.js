import axios from 'axios';

// Apunta al backend usando una variable de entorno.
// Si no está definida (ej: en desarrollo local), usa localhost como respaldo.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
});

// Antes de cada petición, agrega el token automáticamente
// Así no tienes que ponerlo a mano en cada llamada
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;