const db = require('../config/db');

// GET /api/compras
const listar = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, u.nombre AS usuario
      FROM compras c
      JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.creado_en DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/compras/:id — detalle de una compra
const obtener = async (req, res) => {
  try {
    const [compra] = await db.query(
      'SELECT * FROM compras WHERE id = ?', [req.params.id]
    );
    if (!compra.length) return res.status(404).json({ error: 'Compra no encontrada' });

    const [detalle] = await db.query(`
      SELECT d.*, p.nombre AS producto
      FROM detalle_compras d
      JOIN productos p ON d.producto_id = p.id
      WHERE d.compra_id = ?
    `, [req.params.id]);

    res.json({ ...compra[0], detalle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/compras — registrar compra y actualizar stock
const crear = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { proveedor, nro_factura, items } = req.body;
    // items = [{ producto_id, cantidad, precio_unit }, ...]

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'La compra debe tener al menos un producto' });
    }

    await conn.beginTransaction();

    // Calculamos el total
    const total = items.reduce((sum, i) => sum + (i.cantidad * i.precio_unit), 0);

    // Guardamos la cabecera de la compra
    const [compra] = await conn.query(
      `INSERT INTO compras (usuario_id, proveedor, nro_factura, total)
       VALUES (?, ?, ?, ?)`,
      [req.usuario.id, proveedor || null, nro_factura || null, total]
    );
    const compraId = compra.insertId;

    // Guardamos el detalle y aumentamos stock
    for (const item of items) {
      await conn.query(
        `INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_unit, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [compraId, item.producto_id, item.cantidad,
         item.precio_unit, item.cantidad * item.precio_unit]
      );

      // Aumentamos el stock del producto
      await conn.query(
        'UPDATE productos SET stock = stock + ? WHERE id = ?',
        [item.cantidad, item.producto_id]
      );
    }

    await conn.commit();
    res.status(201).json({ id: compraId, total, mensaje: 'Compra registrada correctamente' });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
};

module.exports = { listar, obtener, crear };