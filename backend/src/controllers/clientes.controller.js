const db = require('../config/db');

// GET /api/clientes
// Incluye estadísticas de compra de cada cliente
const listar = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        c.*,
        COUNT(v.id) AS total_compras,
        COALESCE(SUM(v.total), 0) AS total_gastado
      FROM clientes c
      LEFT JOIN ventas v ON v.cliente_id = c.id
      GROUP BY c.id
      ORDER BY c.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error con los clientes' });
  }
};

// GET /api/clientes/:id
const obtener = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error con los clientes' });
  }
};

// GET /api/clientes/:id/compras
// Historial completo de compras de un cliente específico
const historialCompras = async (req, res) => {
  try {
    const [ventas] = await db.query(`
      SELECT v.*, u.nombre AS vendedor
      FROM ventas v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.cliente_id = ?
      ORDER BY v.creado_en DESC
    `, [req.params.id]);
    res.json(ventas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error con los clientes' });
  }
};

// POST /api/clientes
const crear = async (req, res) => {
  try {
    const { descripcion } = req.body;
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

    const [result] = await db.query(
      'INSERT INTO clientes (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]
    );
    res.status(201).json({ id: result.insertId, nombre, descripcion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error con los clientes' });
  }
};

// PUT /api/clientes/:id
const actualizar = async (req, res) => {
  try {
    const { descripcion } = req.body;
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

    await db.query(
      'UPDATE clientes SET nombre = ?, descripcion = ? WHERE id = ?',
      [nombre, descripcion || null, req.params.id]
    );
    res.json({ mensaje: 'Cliente actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error con los clientes' });
  }
};

// DELETE /api/clientes/:id
const eliminar = async (req, res) => {
  try {
    await db.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Cliente eliminado' });
  } catch (err) {
    res.status(400).json({ error: 'No se puede eliminar: este cliente tiene ventas registradas' });
  }
};

module.exports = { listar, obtener, historialCompras, crear, actualizar, eliminar };