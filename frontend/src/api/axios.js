import axios from 'axios';

// Apunta al backend usando una variable de entorno.
// Si no está definida (ej: en desarrollo local), usa localhost como respaldo.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

// URL base del backend SIN el "/api" al final, para usar con archivos
// estáticos como las imágenes de productos (ej: /uploads/productos/foto.png)
export const IMAGE_BASE_URL = API_URL.replace(/\/api\/?$/, '');

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