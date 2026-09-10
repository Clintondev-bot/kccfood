const db = require('../config/db');

const listar = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ingredientes ORDER BY categoria ASC, nombre ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const crear = async (req, res) => {
  try {
    const { nombre, stock, stock_minimo, unidad, categoria } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await db.query(
      'INSERT INTO ingredientes (nombre, stock, stock_minimo, unidad, categoria) VALUES (?, ?, ?, ?, ?)',
      [nombre, stock || 0, stock_minimo || 0, unidad || 'oz', categoria || 'Insumos']
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Ingrediente creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const editar = async (req, res) => {
  try {
    const { nombre, stock, stock_minimo, unidad, categoria } = req.body;
    await db.query(
      'UPDATE ingredientes SET nombre = ?, stock = ?, stock_minimo = ?, unidad = ?, categoria = ? WHERE id = ?',
      [nombre, stock, stock_minimo, unidad, categoria || 'Insumos', req.params.id]
    );
    res.json({ mensaje: 'Ingrediente actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const eliminar = async (req, res) => {
  try {
    await db.query('DELETE FROM ingredientes WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Ingrediente eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};

const guardarReceta = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { items } = req.body;
    await conn.beginTransaction();
    await conn.query('DELETE FROM recetas WHERE producto_id = ?', [req.params.producto_id]);
    for (const item of items) {
      await conn.query(
        'INSERT INTO recetas (producto_id, ingrediente_id, cantidad) VALUES (?, ?, ?)',
        [req.params.producto_id, item.ingrediente_id, item.cantidad]
      );
    }
    await conn.commit();
    res.json({ mensaje: 'Receta guardada correctamente' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

const ajustarStock = async (req, res) => {
  try {
    const { id, tipo, cantidad } = req.body;
    const operacion = tipo === 'entrada' ? '+' : '-';
    await db.query(
      `UPDATE ingredientes SET stock = stock ${operacion} ? WHERE id = ?`,
      [cantidad, id]
    );
    res.json({ mensaje: 'Stock ajustado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listar, crear, editar, eliminar, obtenerReceta, guardarReceta, ajustarStock };