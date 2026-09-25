const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// Multer en MEMORIA (no en disco): así la imagen nunca depende de archivos
// físicos que se pierden en cada redeploy — se guarda directo en la BD.
const storage = multer.memoryStorage();

// Solo aceptamos imágenes
const fileFilter = (req, file, cb) => {
  const permitidos = /jpeg|jpg|png|webp/;
  const esValido = permitidos.test(path.extname(file.originalname).toLowerCase());
  esValido ? cb(null, true) : cb(new Error('Solo se permiten imágenes'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });
// límite de 2MB por imagen

// GET /api/productos
// OJO: nunca traemos imagen_datos aquí (pesaría mucho la lista completa),
// solo la ruta corta en "imagen" que apunta al endpoint que sirve la imagen.
const listar = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.nombre, p.categoria_id, p.precio_costo, p.precio_venta,
             p.stock, p.stock_minimo, p.activo, p.creado_en, p.imagen,
             c.nombre AS categoria
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

// GET /api/productos/:id/imagen
// Sirve la imagen directo desde la base de datos, como si fuera un archivo normal.
const obtenerImagen = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT imagen_datos, imagen_tipo FROM productos WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length || !rows[0].imagen_datos) {
      return res.status(404).send('Imagen no encontrada');
    }
    res.set('Content-Type', rows[0].imagen_tipo || 'image/png');
    res.set('Cache-Control', 'public, max-age=31536000'); // el navegador la cachea 1 año
    res.send(rows[0].imagen_datos);
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

    const [result] = await db.query(
      `INSERT INTO productos 
        (nombre, categoria_id, precio_costo, precio_venta, stock, stock_minimo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, categoria_id, precio_costo || 0, precio_venta, stock || 0, stock_minimo || 5]
    );
    const id = result.insertId;

    // Si se subió una imagen, la guardamos en la BD y armamos su ruta de acceso
    if (req.file) {
      const rutaImagen = `/productos/${id}/imagen`;
      await db.query(
        'UPDATE productos SET imagen = ?, imagen_datos = ?, imagen_tipo = ? WHERE id = ?',
        [rutaImagen, req.file.buffer, req.file.mimetype, id]
      );
    }

    res.status(201).json({ id, mensaje: 'Producto creado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/productos/:id — editar producto
const editar = async (req, res) => {
  try {
    const { nombre, categoria_id, precio_costo, precio_venta, stock_minimo } = req.body;
    const id = req.params.id;

    const campos = ['nombre = ?', 'categoria_id = ?', 'precio_costo = ?', 'precio_venta = ?', 'stock_minimo = ?'];
    const valores = [nombre, categoria_id, precio_costo, precio_venta, stock_minimo];

    // Si se sube una imagen nueva, la reemplazamos (ya no hay que borrar archivos del disco)
    if (req.file) {
      campos.push('imagen = ?', 'imagen_datos = ?', 'imagen_tipo = ?');
      valores.push(`/productos/${id}/imagen`, req.file.buffer, req.file.mimetype);
    }

    valores.push(id);

    await db.query(`UPDATE productos SET ${campos.join(', ')} WHERE id = ?`, valores);

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

module.exports = { upload, listar, listarCategorias, stockBajo, obtenerImagen, crear, editar, eliminar };