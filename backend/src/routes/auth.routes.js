const router = require('express').Router();
const { login, me } = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth');

// Ruta pública — cualquiera puede intentar hacer login
router.post('/login', login);

// Ruta protegida — solo si tienes token válido
router.get('/me', verificarToken, me);

module.exports = router;