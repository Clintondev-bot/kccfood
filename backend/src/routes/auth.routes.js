const router = require('express').Router();
const { login, me } = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth');
const { limitarLogin } = require('../middleware/seguridad');

// Ruta pública — cualquiera puede intentar hacer login,
// pero como máximo 5 intentos fallidos cada 15 minutos (V-01)
router.post('/login', limitarLogin, login);

// Ruta protegida — solo si tienes token válido
router.get('/me', verificarToken, me);

module.exports = router;