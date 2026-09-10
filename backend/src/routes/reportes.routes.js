const router = require('express').Router();
const ctrl = require('../controllers/reportes.controller');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/resumen',                ctrl.resumenDia);
router.get('/productos-mas-vendidos', ctrl.productosMasVendidos);
router.get('/ventas-por-dia',         ctrl.ventasPorDia);

module.exports = router;