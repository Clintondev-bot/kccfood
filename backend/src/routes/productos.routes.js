const router = require('express').Router();
const ctrl = require('../controllers/productos.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// Esta ruta va ANTES de verificarToken a propósito: las imágenes de
// productos son públicas (como cualquier foto en una tienda online),
// y una etiqueta <img> del navegador no puede enviar el token de sesión.
router.get('/:id/imagen', ctrl.obtenerImagen);

router.use(verificarToken);

router.get('/',            ctrl.listar);
router.get('/categorias',  ctrl.listarCategorias);  // ← debe ir antes de /:id
router.get('/stock-bajo',  ctrl.stockBajo);
router.post('/',           soloAdmin, ctrl.upload.single('imagen'), ctrl.crear);
router.put('/:id',         soloAdmin, ctrl.upload.single('imagen'), ctrl.editar);
router.delete('/:id',      soloAdmin, ctrl.eliminar);

module.exports = router;