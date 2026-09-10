const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer — define cómo y dónde guardar las imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/uploads/productos/');
  },
  filename: (req, file, cb) => {
    // Nombre único para evitar que se sobreescriban imágenes
    const nombre = Date.now() + path.extname(file.originalname);
    cb(null, nombre);
  }
});

// Solo aceptamos imágenes
const fileFilter = (req, file, cb) => {
  const permitidos = /jpeg|jpg|png|webp/;
  const esValido = permitidos.test(path.extname(file.originalname).toLowerCase());
  esValido ? cb(null, true) : cb(new Error('Solo se permiten imágenes'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });
// límite de 2MB por imagen

// GET /api/productos
const listar = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, c.nombre AS categoria
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = TRUE
      ORDER BY p.nombre ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/productos/categorias — lista todas las categorías
const listarCategorias = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/productos/stock-bajo
const stockBajo = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, nombre, stock, stock_minimo, imagen
      FROM productos
      WHERE stock <= stock_minimo AND activo = TRUE
      ORDER BY stock ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/productos — crear producto con imagen opcional
const crear = async (req, res) => {
  try {
    const { nombre, categoria_id, precio_costo, precio_venta, stock, stock_minimo } = req.body;

    if (!nombre || !precio_venta) {
      return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' });
    }

    // Si se subió una imagen, guardamos la ruta. Si no, null
    const imagen = req.file ? `/uploads/productos/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO productos 
        (nombre, categoria_id, precio_costo, precio_venta, stock, stock_minimo, imagen)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, categoria_id, precio_costo || 0, precio_venta, stock || 0, stock_minimo || 5, imagen]
    );

    res.status(201).json({ id: result.insertId, mensaje: 'Producto creado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/productos/:id — editar producto
const editar = async (req, res) => {
  try {
    const { nombre, categoria_id, precio_costo, precio_venta, stock_minimo } = req.body;

    // Si se sube nueva imagen, borramos la anterior para no acumular archivos
    if (req.file) {
      const [prod] = await db.query('SELECT imagen FROM productos WHERE id = ?', [req.params.id]);
      if (prod[0]?.imagen) {
        const rutaAnterior = path.join(__dirname, '../../', prod[0].imagen);
        if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
      }
    }

    const imagen = req.file ? `/uploads/productos/${req.file.filename}` : undefined;

    await db.query(
      `UPDATE productos 
       SET nombre = ?, categoria_id = ?, precio_costo = ?, precio_venta = ?, stock_minimo = ?
       ${imagen !== undefined ? ', imagen = ?' : ''}
       WHERE id = ?`,
      imagen !== undefined
        ? [nombre, categoria_id, precio_costo, precio_venta, stock_minimo, imagen, req.params.id]
        : [nombre, categoria_id, precio_costo, precio_venta, stock_minimo, req.params.id]
    );

    res.json({ mensaje: 'Producto actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/productos/:id
const eliminar = async (req, res) => {
  try {
    await db.query('UPDATE productos SET activo = FALSE WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { upload, listar, listarCategorias, stockBajo, crear, editar, eliminar };