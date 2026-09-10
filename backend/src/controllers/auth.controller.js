const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/login
// Recibe email y password, devuelve un token si son correctos
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validamos que lleguen los datos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscamos el usuario en la base de datos
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? AND activo = TRUE',
      [email]
    );

    // Si no existe el usuario
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const usuario = rows[0];

    // Comparamos la contraseña ingresada con la que está encriptada en la BD
    // bcrypt hace esto de forma segura — nunca guardamos contraseñas en texto plano
    const passwordOk = await bcrypt.compare(password, usuario.password);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Todo ok — generamos el token JWT
    // Este token es como un "pase" que el frontend guarda y envía en cada petición
    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '8h' }
    );

    // Devolvemos el token y los datos básicos del usuario
    res.json({
      token,
      usuario: {
        id:     usuario.id,
        nombre: usuario.nombre,
        email:  usuario.email,
        rol:    usuario.rol,
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET /api/auth/me
// Devuelve los datos del usuario que está logueado actualmente
const me = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { login, me };