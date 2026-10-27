const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Este "guardia" se pone delante de las rutas que requieren login
// Si el usuario no tiene un token válido, no puede pasar
const verificarToken = async (req, res, next) => {

  // El frontend envía el token así: Authorization: Bearer eyJ...
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Debes iniciar sesión primero' });
  }

  let usuario;
  try {
    // Verificamos que el token sea válido y no haya expirado
    usuario = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // 401 (no 403) para que el frontend sepa que debe volver al login
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }

  try {
    // Si el admin desactivó al usuario, su sesión deja de servir al instante
    // (antes seguía funcionando hasta que el token expiraba).
    const [rows] = await db.query('SELECT activo, rol FROM usuarios WHERE id = ?', [usuario.id]);
    if (!rows.length || !rows[0].activo) {
      return res.status(401).json({ error: 'Tu usuario está desactivado' });
    }
    // Usamos el rol actual de la BD por si el admin lo cambió
    req.usuario = { ...usuario, rol: rows[0].rol };
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Solo el admin puede hacer ciertas cosas (crear productos, ver reportes, etc.)
const soloAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede hacer esto' });
  }
  next();
};

module.exports = { verificarToken, soloAdmin };
