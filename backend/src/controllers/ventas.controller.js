const db = require('../config/db');

const listar = async (req, res) => {
  try {
    const { fecha } = req.query;
    let query = `
      SELECT v.*, u.nombre AS vendedor
      FROM ventas v
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (fecha) {
      query += ' AND DATE(v.creado_en) = ?';
      params.push(fecha);
    }
    query += ' ORDER BY v.creado_en DESC LIMIT 100';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const obtener = async (req, res) => {
  try {
    const [venta] = await db.query('SELECT * FROM ventas WHERE id = ?', [req.params.id]);
    if (!venta.length) return res.status(404).json({ error: 'Venta no encontrada' });
    const [detalle] = await db.query(`
      SELECT d.*, p.nombre AS producto
      FROM detalle_ventas d
      JOIN productos p ON d.producto_id = p.id
      WHERE d.venta_id = ?
    `, [req.params.id]);
    res.json({ ...venta[0], detalle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const crear = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { items, metodo_pago, descuento = 0, tipo_descuento = 'monto' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
    }

    await conn.beginTransaction();

    for (const item of items) {
      const [prod] = await conn.query(
        'SELECT stock, nombre FROM productos WHERE id = ? AND activo = TRUE',
        [item.producto_id]
      );
      if (!prod.length) throw new Error(`Producto no encontrado`);
      if (prod[0].stock < item.cantidad) throw new Error(`Stock insuficiente para "${prod[0].nombre}"`);
    }

    const subtotal = items.reduce((sum, i) => sum + (i.cantidad * i.precio_unit), 0);

    let montoDescuento = 0;
    if (tipo_descuento === 'porcentaje') {
      montoDescuento = (subtotal * parseFloat(descuento)) / 100;
    } else {
      montoDescuento = parseFloat(descuento);
    }

    const total = subtotal - montoDescuento;

    const [venta] = await conn.query(
      `INSERT INTO ventas (usuario_id, total, metodo_pago, descuento, tipo_descuento)
       VALUES (?, ?, ?, ?, ?)`,
      [req.usuario.id, total, metodo_pago || 'efectivo', montoDescuento, tipo_descuento]
    );
    const ventaId = venta.insertId;

    for (const item of items) {
      await conn.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unit, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [ventaId, item.producto_id, item.cantidad, item.precio_unit, item.cantidad * item.precio_unit]
      );
      await conn.query(
        'UPDATE productos SET stock = stock - ? WHERE id = ?',
        [item.cantidad, item.producto_id]
      );
      const [receta] = await conn.query('SELECT * FROM recetas WHERE producto_id = ?', [item.producto_id]);
      for (const r of receta) {
        await conn.query(
          'UPDATE ingredientes SET stock = stock - ? WHERE id = ?',
          [r.cantidad * item.cantidad, r.ingrediente_id]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ id: ventaId, total, descuento: montoDescuento, mensaje: 'Venta registrada correctamente' });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
};

module.exports = { listar, obtener, crear };