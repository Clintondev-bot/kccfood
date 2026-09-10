import axios from 'axios';

// Aquí apunta al servidor backend
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
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