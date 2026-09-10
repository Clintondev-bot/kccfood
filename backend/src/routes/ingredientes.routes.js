const router = require('express').Router();
const ctrl = require('../controllers/ingredientes.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

router.use(verificarToken);

router.get('/',                          ctrl.listar);
router.post('/',             soloAdmin,  ctrl.crear);
router.put('/:id',           soloAdmin,  ctrl.editar);
router.delete('/:id',        soloAdmin,  ctrl.eliminar);
router.get('/receta/:producto_id',       ctrl.obtenerReceta);
router.post('/receta/:producto_id',      ctrl.guardarReceta);
router.post('/ajuste',       soloAdmin,  ctrl.ajustarStock);

module.exports = router;