const db = require('../config/db');
const { redondear, validarItems } = require('../utils/helpers');

// GET /api/compras
const listar = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, u.nombre AS usuario
      FROM compras c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.creado_en DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudieron cargar las compras' });
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
    console.error(err);
    res.status(500).json({ error: 'No se pudo cargar la compra' });
  }
};

// POST /api/compras — registrar compra y actualizar stock
const crear = async (req, res) => {
  const { proveedor, nro_factura, items } = req.body;
  // items = [{ producto_id, cantidad, precio_unit }, ...]

  const errorItems = validarItems(items);
  if (errorItems) return res.status(400).json({ error: errorItems });

  const total = redondear(items.reduce((sum, i) => sum + Number(i.cantidad) * Number(i.precio_unit), 0));

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Guardamos la cabecera de la compra
    const [compra] = await conn.query(
      `INSERT INTO compras (usuario_id, proveedor, nro_factura, total)
       VALUES (?, ?, ?, ?)`,
      [req.usuario.id, proveedor || null, nro_factura || null, total]
    );
    const compraId = compra.insertId;

    // Guardamos el detalle y aumentamos stock
    for (const item of items) {
      const cantidad = Number(item.cantidad);
      const precio = Number(item.precio_unit);

      const [upd] = await conn.query(
        'UPDATE productos SET stock = stock + ? WHERE id = ?',
        [cantidad, item.producto_id]
      );
      if (upd.affectedRows === 0) throw new Error('Uno de los productos ya no existe');

      await conn.query(
        `INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_unit, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [compraId, item.producto_id, cantidad, precio, redondear(cantidad * precio)]
      );
    }

    await conn.commit();
    res.status(201).json({ id: compraId, total, mensaje: 'Compra registrada correctamente' });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error(err);
    const mensaje = err.sqlMessage ? 'No se pudo registrar la compra' : err.message;
    res.status(400).json({ error: mensaje });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { listar, obtener, crear };
