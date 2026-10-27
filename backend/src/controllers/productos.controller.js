const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const { aNumero } = require('../utils/helpers');

// Multer en MEMORIA (no en disco): así la imagen nunca depende de archivos
// físicos que se pierden en cada redeploy — se guarda directo en la BD.
const storage = multer.memoryStorage();

// Solo aceptamos imágenes
const fileFilter = (req, file, cb) => {
  const permitidos = /jpeg|jpg|png|webp/;
  const esValido = permitidos.test(path.extname(file.originalname).toLowerCase())
    && /^image\//.test(file.mimetype);
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
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error con los productos' });
  }
};

// GET /api/productos/categorias — lista todas las categorías
const listarCategorias = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error con los productos' });
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
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error con los productos' });
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
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error con los productos' });
  }
};

// Lee y valida los campos del formulario de producto.
// El formulario llega como FormData, así que todo viene como texto:
// "" significa "vacío" (por ejemplo "Sin categoría").
const leerFormulario = (body) => {
  const datos = {
    nombre:       (body.nombre || '').trim(),
    categoria_id: aNumero(body.categoria_id, null),   // '' → NULL (antes daba error)
    precio_costo: aNumero(body.precio_costo, 0),
    precio_venta: aNumero(body.precio_venta, null),
    stock:        aNumero(body.stock, null),
    stock_minimo: aNumero(body.stock_minimo, 5),
  };
  if (!datos.nombre) return { error: 'El nombre es requerido' };
  if (datos.precio_venta === null || Number.isNaN(datos.precio_venta) || datos.precio_venta < 0) {
    return { error: 'El precio de venta no es válido' };
  }
  for (const campo of ['categoria_id', 'precio_costo', 'stock', 'stock_minimo']) {
    if (Number.isNaN(datos[campo]) || datos[campo] < 0) return { error: `El campo ${campo.replace('_', ' ')} no es válido` };
  }
  if (datos.stock !== null && !Number.isInteger(datos.stock)) return { error: 'El stock debe ser un número entero' };
  return { datos };
};

// POST /api/productos — crear producto con imagen opcional
const crear = async (req, res) => {
  try {
    const { datos, error } = leerFormulario(req.body);
    if (error) return res.status(400).json({ error });

    const [result] = await db.query(
      `INSERT INTO productos
        (nombre, categoria_id, precio_costo, precio_venta, stock, stock_minimo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [datos.nombre, datos.categoria_id, datos.precio_costo, datos.precio_venta, datos.stock ?? 0, datos.stock_minimo]
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
    console.error(err);
    res.status(500).json({ error: 'No se pudo crear el producto' });
  }
};

// PUT /api/productos/:id — editar producto
const editar = async (req, res) => {
  try {
    const { datos, error } = leerFormulario(req.body);
    if (error) return res.status(400).json({ error });
    const id = req.params.id;

    const campos = ['nombre = ?', 'categoria_id = ?', 'precio_costo = ?', 'precio_venta = ?', 'stock_minimo = ?'];
    const valores = [datos.nombre, datos.categoria_id, datos.precio_costo, datos.precio_venta, datos.stock_minimo];

    // Antes el campo "Stock" del formulario se ignoraba al editar:
    // el usuario lo cambiaba, guardaba y el stock seguía igual.
    if (datos.stock !== null) {
      campos.push('stock = ?');
      valores.push(datos.stock);
    }

    // Si se sube una imagen nueva, la reemplazamos
    if (req.file) {
      campos.push('imagen = ?', 'imagen_datos = ?', 'imagen_tipo = ?');
      valores.push(`/productos/${id}/imagen`, req.file.buffer, req.file.mimetype);
    }

    valores.push(id);

    const [result] = await db.query(`UPDATE productos SET ${campos.join(', ')} WHERE id = ?`, valores);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    res.json({ mensaje: 'Producto actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo actualizar el producto' });
  }
};

// DELETE /api/productos/:id
const eliminar = async (req, res) => {
  try {
    await db.query('UPDATE productos SET activo = FALSE WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error con los productos' });
  }
};

module.exports = { upload, listar, listarCategorias, stockBajo, obtenerImagen, crear, editar, eliminar };