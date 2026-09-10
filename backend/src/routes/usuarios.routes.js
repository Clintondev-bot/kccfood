const router = require('express').Router();
const ctrl = require('../controllers/usuarios.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

router.use(verificarToken);
router.use(soloAdmin); // solo admin puede gestionar usuarios

router.get('/',              ctrl.listar);
router.post('/',             ctrl.crear);
router.put('/:id',           ctrl.editar);
router.put('/:id/toggle',    ctrl.toggleActivo);

module.exports = router;