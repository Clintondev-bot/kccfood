const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Lista de dominios permitidos, separados por coma en el .env
// Ejemplo en .env: ALLOWED_ORIGINS=https://kccfood.tudominio.com,https://www.kccfood.tudominio.com
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permite peticiones sin origin (ej: Postman, apps móviles, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`⚠️  Origen bloqueado por CORS: ${origin}`);
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
// Hace que la carpeta uploads sea accesible públicamente
app.use('/uploads', require('express').static('src/uploads'));

// Rutas de la API — cada módulo tiene su archivo
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/productos', require('./routes/productos.routes'));
app.use('/api/ventas',    require('./routes/ventas.routes'));
app.use('/api/reportes',  require('./routes/reportes.routes'));
app.use('/api/usuarios',  require('./routes/usuarios.routes'));
app.use('/api/ingredientes', require('./routes/ingredientes.routes'));

// Ruta de prueba — para verificar que el servidor funciona
app.get('/api', (req, res) => {
  res.json({ mensaje: '✅ Servidor K-CCFOOD funcionando' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}/api`);
});