const router = require('express').Router();
const ctrl = require('../controllers/productos.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

router.use(verificarToken);

router.get('/',            ctrl.listar);
router.get('/categorias',  ctrl.listarCategorias);  // ← debe ir antes de /:id
router.get('/stock-bajo',  ctrl.stockBajo);
router.post('/',           soloAdmin, ctrl.upload.single('imagen'), ctrl.crear);
router.put('/:id',         soloAdmin, ctrl.upload.single('imagen'), ctrl.editar);
router.delete('/:id',      soloAdmin, ctrl.eliminar);

module.exports = router;