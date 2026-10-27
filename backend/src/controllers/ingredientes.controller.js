const db = require('../config/db');
const { aNumero } = require('../utils/helpers');

const listar = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ingredientes ORDER BY categoria ASC, nombre ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudieron cargar los ingredientes' });
  }
};

// Lee y valida los campos del formulario de ingrediente
const leerFormulario = (body) => {
  const datos = {
    nombre:       (body.nombre || '').trim(),
    stock:        aNumero(body.stock, 0),
    stock_minimo: aNumero(body.stock_minimo, 0),
    unidad:       body.unidad || 'oz',
    categoria:    body.categoria || 'Insumos',
  };
  if (!datos.nombre) return { error: 'El nombre es requerido' };
  if (Number.isNaN(datos.stock) || datos.stock < 0) return { error: 'El stock no es válido' };
  if (Number.isNaN(datos.stock_minimo) || datos.stock_minimo < 0) return { error: 'El stock mínimo no es válido' };
  return { datos };
};

const crear = async (req, res) => {
  try {
    const { datos, error } = leerFormulario(req.body);
    if (error) return res.status(400).json({ error });
    const [result] = await db.query(
      'INSERT INTO ingredientes (nombre, stock, stock_minimo, unidad, categoria) VALUES (?, ?, ?, ?, ?)',
      [datos.nombre, datos.stock, datos.stock_minimo, datos.unidad, datos.categoria]
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Ingrediente creado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo crear el ingrediente' });
  }
};

const editar = async (req, res) => {
  try {
    const { datos, error } = leerFormulario(req.body);
    if (error) return res.status(400).json({ error });
    const [result] = await db.query(
      'UPDATE ingredientes SET nombre = ?, stock = ?, stock_minimo = ?, unidad = ?, categoria = ? WHERE id = ?',
      [datos.nombre, datos.stock, datos.stock_minimo, datos.unidad, datos.categoria, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ingrediente no encontrado' });
    res.json({ mensaje: 'Ingrediente actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo actualizar el ingrediente' });
  }
};

const eliminar = async (req, res) => {
  try {
    await db.query('DELETE FROM ingredientes WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Ingrediente eliminado' });
  } catch (err) {
    console.error(err);
    // Normalmente falla porque el ingrediente está usado en alguna receta
    res.status(400).json({ error: 'No se puede eliminar: este ingrediente se usa en alguna receta' });
  }
};

const obtenerReceta = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, i.nombre AS ingrediente, i.unidad, i.stock
      FROM recetas r
      JOIN ingredientes i ON r.ingrediente_id = i.id
      WHERE r.producto_id = ?
    `, [req.params.producto_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo cargar la receta' });
  }
};

const guardarReceta = async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Receta no válida' });
  for (const item of items) {
    const cantidad = Number(item.cantidad);
    if (!item.ingrediente_id || !Number.isFinite(cantidad) || cantidad <= 0) {
      return res.status(400).json({ error: 'Cada ingrediente necesita una cantidad mayor a 0' });
    }
  }
  // Si el mismo ingrediente aparece dos veces, lo detectamos antes de guardar
  const ids = items.map(i => String(i.ingrediente_id));
  if (new Set(ids).size !== ids.length) {
    return res.status(400).json({ error: 'Hay un ingrediente repetido en la receta' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    await conn.query('DELETE FROM recetas WHERE producto_id = ?', [req.params.producto_id]);
    for (const item of items) {
      await conn.query(
        'INSERT INTO recetas (producto_id, ingrediente_id, cantidad) VALUES (?, ?, ?)',
        [req.params.producto_id, item.ingrediente_id, Number(item.cantidad)]
      );
    }
    await conn.commit();
    res.json({ mensaje: 'Receta guardada correctamente' });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar la receta' });
  } finally {
    if (conn) conn.release();
  }
};

const ajustarStock = async (req, res) => {
  try {
    const { id, tipo, cantidad } = req.body;
    const n = Number(cantidad);
    if (!id) return res.status(400).json({ error: 'Ingrediente no válido' });
    if (tipo !== 'entrada' && tipo !== 'salida') return res.status(400).json({ error: 'Tipo de ajuste no válido' });
    if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });

    // La operación (+/-) ya no se arma con texto del usuario: se elige aquí.
    // En una salida, el stock nunca baja de 0.
    const sql = tipo === 'entrada'
      ? 'UPDATE ingredientes SET stock = stock + ? WHERE id = ?'
      : 'UPDATE ingredientes SET stock = GREATEST(stock - ?, 0) WHERE id = ?';
    const [result] = await db.query(sql, [n, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ingrediente no encontrado' });
    res.json({ mensaje: 'Stock ajustado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo ajustar el stock' });
  }
};

module.exports = { listar, crear, editar, eliminar, obtenerReceta, guardarReceta, ajustarStock };
