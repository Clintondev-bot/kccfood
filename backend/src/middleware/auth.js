const jwt = require('jsonwebtoken');

// Este "guardia" se pone delante de las rutas que requieren login
// Si el usuario no tiene un token válido, no puede pasar
const verificarToken = (req, res, next) => {

  // El frontend envía el token así: Authorization: Bearer eyJ...
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Debes iniciar sesión primero' });
  }

  try {
    // Verificamos que el token sea válido y no haya expirado
    const usuario = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = usuario; // guardamos los datos del usuario para usarlos después
    next();                // todo ok, dejamos pasar
  } catch (err) {
    return res.status(403).json({ error: 'Sesión inválida o expirada' });
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