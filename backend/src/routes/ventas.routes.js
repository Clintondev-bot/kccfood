const router = require('express').Router();
const ctrl = require('../controllers/ventas.controller');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',   ctrl.crear);

module.exports = router;