const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Sin JWT_SECRET el login falla con un error 500 poco claro.
// Mejor avisar al arrancar el servidor.
if (!process.env.JWT_SECRET) {
  console.error('❌ Falta la variable JWT_SECRET en el .env — el login no funcionará.');
}

const app = express();

// Lista de dominios permitidos, separados por coma en el .env
// Ejemplo en .env: ALLOWED_ORIGINS=https://kccfood.tudominio.com,https://www.kccfood.tudominio.com
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn('⚠️  ALLOWED_ORIGINS está vacío: el navegador no podrá conectarse a la API.');
}

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
// Imágenes antiguas guardadas en disco. Usamos una ruta absoluta para que
// funcione sin importar desde qué carpeta se arranque el servidor.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas de la API — cada módulo tiene su archivo
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/productos', require('./routes/productos.routes'));
app.use('/api/ventas',    require('./routes/ventas.routes'));
app.use('/api/reportes',  require('./routes/reportes.routes'));
app.use('/api/usuarios',  require('./routes/usuarios.routes'));
app.use('/api/ingredientes', require('./routes/ingredientes.routes'));
app.use('/api/compras',   require('./routes/compras.routes'));
app.use('/api/clientes',  require('./routes/clientes.routes'));

// Ruta de prueba — para verificar que el servidor funciona
app.get('/api', (req, res) => {
  res.json({ mensaje: '✅ Servidor K-CCFOOD funcionando' });
});

// Manejador de errores: convierte cualquier error no capturado (por ejemplo
// una imagen demasiado grande o de tipo inválido) en una respuesta JSON que
// el frontend sí puede mostrar, en vez de una página HTML de error.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'La imagen no puede pesar más de 2MB' });
  }
  if (err.message === 'Solo se permiten imágenes') {
    return res.status(400).json({ error: 'Solo se permiten imágenes JPG, PNG o WEBP' });
  }
  if (err.message === 'No permitido por CORS') {
    return res.status(403).json({ error: 'Origen no permitido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}/api`);
});
