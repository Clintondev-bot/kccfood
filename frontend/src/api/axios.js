import axios from 'axios';

// Apunta al backend usando una variable de entorno.
// Si no está definida (ej: en desarrollo local), usa localhost como respaldo.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

// URL base completa (incluye /api) — se usa para armar la ruta de las
// imágenes de productos, que ahora se sirven desde el propio backend
// como /productos/:id/imagen
export const API_BASE_URL = API_URL;

// Antes de cada petición, agrega el token automáticamente
// Así no tienes que ponerlo a mano en cada llamada
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si la sesión expiró (o el usuario fue desactivado), el backend responde 401.
// Antes la app se quedaba "logueada" pero vacía; ahora vuelve al login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const esLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !esLogin && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
