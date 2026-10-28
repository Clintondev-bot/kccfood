const db = require('../config/db');
const { esFechaValida, redondear, calcularDescuento, validarItems } = require('../utils/helpers');

// GET /api/ventas
// Filtros opcionales:
//   ?fecha=YYYY-MM-DD               → ventas de ese día
//   ?desde=YYYY-MM-DD&hasta=...     → ventas en ese rango (para reportes y filtros)
// Sin filtros devuelve las últimas 100.
const listar = async (req, res) => {
  try {
    const { fecha, desde, hasta } = req.query;
    // LEFT JOIN: así no "desaparecen" ventas antiguas que no tienen cliente
    let query = `
      SELECT v.*, u.nombre AS vendedor, c.nombre AS cliente
      FROM ventas v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (esFechaValida(fecha)) {
      query += ' AND v.creado_en >= ? AND v.creado_en < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(fecha, fecha);
    }
    if (esFechaValida(desde)) {
      query += ' AND v.creado_en >= ?';
      params.push(desde);
    }
    if (esFechaValida(hasta)) {
      query += ' AND v.creado_en < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(hasta);
    }
    const hayFiltro = esFechaValida(fecha) || esFechaValida(desde) || esFechaValida(hasta);
    query += ` ORDER BY v.creado_en DESC LIMIT ${hayFiltro ? 10000 : 100}`;
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudieron cargar las ventas' });
  }
};

// GET /api/ventas/:id
const obtener = async (req, res) => {
  try {
    // Antes no se traía el vendedor y el detalle lo mostraba vacío
    const [venta] = await db.query(`
      SELECT v.*, c.nombre AS cliente, u.nombre AS vendedor
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.id = ?
    `, [req.params.id]);
    if (!venta.length) return res.status(404).json({ error: 'Venta no encontrada' });
    const [detalle] = await db.query(`
      SELECT d.*, p.nombre AS producto
      FROM detalle_ventas d
      JOIN productos p ON d.producto_id = p.id
      WHERE d.venta_id = ?
    `, [req.params.id]);
    res.json({ ...venta[0], detalle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo cargar la venta' });
  }
};

// POST /api/ventas
const crear = async (req, res) => {
  const { items, metodo_pago, descuento = 0, tipo_descuento = 'monto', cliente_id } = req.body;

  // Validaciones ANTES de abrir la transacción
  const errorItems = validarItems(items);
  if (errorItems) return res.status(400).json({ error: errorItems });
  if (!cliente_id) {
    return res.status(400).json({ error: 'Debes seleccionar un cliente' });
  }

  const subtotal = redondear(items.reduce((sum, i) => sum + Number(i.cantidad) * Number(i.precio_unit), 0));
  const { montoDescuento, error: errorDescuento } = calcularDescuento(subtotal, descuento, tipo_descuento);
  if (errorDescuento) return res.status(400).json({ error: errorDescuento });
  const total = redondear(subtotal - montoDescuento);

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [venta] = await conn.query(
      `INSERT INTO ventas (usuario_id, cliente_id, total, metodo_pago, descuento, tipo_descuento)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.usuario.id, cliente_id, total, metodo_pago || 'efectivo', montoDescuento, tipo_descuento]
    );
    const ventaId = venta.insertId;

    for (const item of items) {
      const cantidad = Number(item.cantidad);
      const precio = Number(item.precio_unit);

      // Descontamos stock SOLO si alcanza, en una sola instrucción.
      // Antes se revisaba el stock y luego se restaba por separado: si dos cajas
      // vendían el mismo producto a la vez, el stock podía quedar en negativo.
      // Esto también funciona si el mismo producto viene en varias líneas
      // (por ejemplo, suelto y dentro de un combo).
      const [upd] = await conn.query(
        'UPDATE productos SET stock = stock - ? WHERE id = ? AND activo = TRUE AND stock >= ?',
        [cantidad, item.producto_id, cantidad]
      );
      if (upd.affectedRows === 0) {
        const [prod] = await conn.query('SELECT nombre, stock FROM productos WHERE id = ? AND activo = TRUE', [item.producto_id]);
        if (!prod.length) throw new Error('Uno de los productos ya no existe');
        throw new Error(`Stock insuficiente para "${prod[0].nombre}" (quedan ${prod[0].stock})`);
      }

      await conn.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unit, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [ventaId, item.producto_id, cantidad, precio, redondear(cantidad * precio)]
      );

      // Descontamos los ingredientes de la receta (si el producto tiene)
      const [receta] = await conn.query('SELECT * FROM recetas WHERE producto_id = ?', [item.producto_id]);
      for (const r of receta) {
        await conn.query(
          'UPDATE ingredientes SET stock = stock - ? WHERE id = ?',
          [r.cantidad * cantidad, r.ingrediente_id]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ id: ventaId, total, descuento: montoDescuento, mensaje: 'Venta registrada correctamente' });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error(err);
    // Los errores de MySQL no se muestran al usuario (son técnicos); los nuestros sí
    const mensaje = err.sqlMessage ? 'No se pudo registrar la venta' : err.message;
    res.status(400).json({ error: mensaje });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { listar, obtener, crear };
