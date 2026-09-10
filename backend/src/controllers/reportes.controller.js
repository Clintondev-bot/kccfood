const db = require('../config/db');

// GET /api/reportes/resumen?fecha=2024-06-16
// Resumen del día: total vendido, número de ventas, método de pago
const resumenDia = async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];

    const [ventas] = await db.query(`
      SELECT 
        COUNT(*) AS total_ventas,
        SUM(total) AS total_dinero,
        SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END) AS efectivo,
        SUM(CASE WHEN metodo_pago = 'yape'     THEN total ELSE 0 END) AS yape,
        SUM(CASE WHEN metodo_pago = 'plin'     THEN total ELSE 0 END) AS plin
      FROM ventas
      WHERE DATE(creado_en) = ? 
    `, [fecha]);

    res.json(ventas[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reportes/productos-mas-vendidos?fecha=2024-06-16
const productosMasVendidos = async (err, res) => {
  try {
    const fecha = err.query.fecha || new Date().toISOString().split('T')[0];

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
      WHERE DATE(v.creado_en) = ?
      GROUP BY p.id
      ORDER BY total_vendido DESC
      LIMIT 10
    `, [fecha]);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/reportes/ventas-por-dia?mes=2024-06
// Para el gráfico de barras del dashboard
const ventasPorDia = async (req, res) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);

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
    res.status(500).json({ error: err.message });
  }
};

module.exports = { resumenDia, productosMasVendidos, ventasPorDia };