const db = require('../config/db');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'vendedor'];

// GET /api/usuarios
const listar = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY creado_en DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudieron cargar los usuarios' });
  }
};

// POST /api/usuarios
const crear = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    if (rol && !ROLES.includes(rol)) {
      return res.status(400).json({ error: 'Rol no válido' });
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
    console.error(err);
    res.status(500).json({ error: 'No se pudo crear el usuario' });
  }
};

// PUT /api/usuarios/:id
const editar = async (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body;
    const id = Number(req.params.id);

    if (!nombre || !email) return res.status(400).json({ error: 'Nombre y email son requeridos' });
    if (!ROLES.includes(rol)) return res.status(400).json({ error: 'Rol no válido' });
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    // Evita que el admin se quite a sí mismo el rol y se quede sin acceso
    if (id === req.usuario.id && rol !== 'admin') {
      return res.status(400).json({ error: 'No puedes quitarte tu propio rol de administrador' });
    }
    // Antes, un email repetido devolvía un error técnico de MySQL
    const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ? AND id <> ?', [email, id]);
    if (existe.length > 0) return res.status(400).json({ error: 'El email ya está registrado' });

    if (password) {
      // Si mandan nueva contraseña la encriptamos
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, password = ? WHERE id = ?',
        [nombre, email, rol, hash, id]
      );
    } else {
      await db.query(
        'UPDATE usuarios SET nombre = ?, email = ?, rol = ? WHERE id = ?',
        [nombre, email, rol, id]
      );
    }

    res.json({ mensaje: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo actualizar el usuario' });
  }
};

// PUT /api/usuarios/:id/toggle — activar o desactivar usuario
const toggleActivo = async (req, res) => {
  try {
    // Si el admin se desactiva a sí mismo, nadie podría volver a entrar
    if (Number(req.params.id) === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
    }
    await db.query(
      'UPDATE usuarios SET activo = NOT activo WHERE id = ?',
      [req.params.id]
    );
    res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo cambiar el estado' });
  }
};

module.exports = { listar, crear, editar, toggleActivo };