const db = require('../config/db');
const { hoyLima, esFechaValida } = require('../utils/helpers');

// GET /api/reportes/resumen?fecha=2024-06-16
// Resumen del día: total vendido, número de ventas, método de pago
const resumenDia = async (req, res) => {
  try {
    // Fecha de Lima (antes se usaba UTC y de noche tomaba el día siguiente)
    const fecha = esFechaValida(req.query.fecha) ? req.query.fecha : hoyLima();

    const [ventas] = await db.query(`
      SELECT 
        COUNT(*) AS total_ventas,
        SUM(total) AS total_dinero,
        SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END) AS efectivo,
        SUM(CASE WHEN metodo_pago = 'yape'     THEN total ELSE 0 END) AS yape
      FROM ventas
      WHERE creado_en >= ? AND creado_en < DATE_ADD(?, INTERVAL 1 DAY)
    `, [fecha, fecha]);

    res.json(ventas[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo generar el reporte' });
  }
};

// GET /api/reportes/productos-mas-vendidos?fecha=2024-06-16&periodo=diario
// periodo puede ser: diario | semanal | mensual | anual (por defecto: diario)
// El rango se calcula terminando en la "fecha" indicada
const productosMasVendidos = async (req, res) => {
  try {
    // Fecha de Lima (antes se usaba UTC y de noche tomaba el día siguiente)
    const fecha = esFechaValida(req.query.fecha) ? req.query.fecha : hoyLima();
    const periodo = req.query.periodo || 'diario';

    let condicionFecha = 'v.creado_en >= ? AND v.creado_en < DATE_ADD(?, INTERVAL 1 DAY)';
    let params = [fecha, fecha];

    if (periodo === 'semanal') {
      condicionFecha = 'v.creado_en >= DATE_SUB(?, INTERVAL 6 DAY) AND v.creado_en < DATE_ADD(?, INTERVAL 1 DAY)';
      params = [fecha, fecha];
    } else if (periodo === 'mensual') {
      condicionFecha = 'v.creado_en >= DATE_SUB(?, INTERVAL 29 DAY) AND v.creado_en < DATE_ADD(?, INTERVAL 1 DAY)';
      params = [fecha, fecha];
    } else if (periodo === 'anual') {
      condicionFecha = 'v.creado_en >= DATE_SUB(?, INTERVAL 364 DAY) AND v.creado_en < DATE_ADD(?, INTERVAL 1 DAY)';
      params = [fecha, fecha];
    }

    const [rows] = await db.query(`
      SELECT 
        p.nombre,
        p.imagen,
        c.nombre AS categoria,
        SUM(d.cantidad) AS total_vendido,
        SUM(d.subtotal) AS total_ingreso
      FROM detalle_ventas d
      JOIN productos p ON d.producto_id = p.id
      JOIN ventas v ON d.venta_id = v.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE ${condicionFecha}
      GROUP BY p.id
      ORDER BY total_vendido DESC
      LIMIT 10
    `, params);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo generar el reporte' });
  }
};

// GET /api/reportes/ventas-por-dia?mes=2024-06
// Para el gráfico de barras del dashboard
const ventasPorDia = async (req, res) => {
  try {
    const mes = /^\d{4}-\d{2}$/.test(req.query.mes || '') ? req.query.mes : hoyLima().slice(0, 7);

    const [rows] = await db.query(`
      SELECT 
        DATE(creado_en) AS fecha,
        COUNT(*) AS total_ventas,
        SUM(total) AS total_dinero
      FROM ventas
      WHERE DATE_FORMAT(creado_en, '%Y-%m') = ?
      GROUP BY DATE(creado_en)
      ORDER BY fecha ASC
    `, [mes]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo generar el reporte' });
  }
};

module.exports = { resumenDia, productosMasVendidos, ventasPorDia };