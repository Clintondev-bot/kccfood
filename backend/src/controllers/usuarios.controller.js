const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/usuarios
const listar = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY creado_en DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/usuarios
const crear = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }

    // Verificamos que el email no esté en uso
    const [existe] = await db.query(
      'SELECT id FROM usuarios WHERE email = ?', [email]
    );
    if (existe.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Encriptamos la contraseña
    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hash, rol || 'vendedor']
    );

    res.status(201).json({ id: result.insertId, mensaje: 'Usuario creado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/usuarios/:id
const editar = async (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body;

    if (password) {
      // Si mandan nueva contraseña la encriptamos
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, password = ? WHERE id = ?',
        [nombre, email, rol, hash, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE usuarios SET nombre = ?, email = ?, rol = ? WHERE id = ?',
        [nombre, email, rol, req.params.id]
      );
    }

    res.json({ mensaje: 'Usuario actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/usuarios/:id/toggle — activar o desactivar usuario
const toggleActivo = async (req, res) => {
  try {
    await db.query(
      'UPDATE usuarios SET activo = NOT activo WHERE id = ?',
      [req.params.id]
    );
    res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listar, crear, editar, toggleActivo };