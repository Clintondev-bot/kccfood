// Pruebas rápidas sin base de datos real: se reemplaza config/db por una
// base "falsa" en memoria que entiende solo las consultas de ventas.
// Ejecutar con:  npm test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { calcularDescuento, validarItems, hoyLima, redondear } = require('../src/utils/helpers');

// ── Base de datos falsa ──
const crearDbFalsa = (productos) => {
  const estado = { productos: JSON.parse(JSON.stringify(productos)), ventas: [], detalle: [], commits: 0, rollbacks: 0 };
  const query = async (sql, p = []) => {
    if (sql.startsWith('INSERT INTO ventas')) {
      estado.ventas.push(p);
      return [{ insertId: estado.ventas.length }];
    }
    if (sql.startsWith('UPDATE productos SET stock = stock - ?')) {
      const [cant, id, minimo] = p;
      const prod = estado.productos.find(x => x.id === Number(id) && x.activo);
      if (!prod || prod.stock < minimo) return [{ affectedRows: 0 }];
      prod.stock -= cant;
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('SELECT nombre, stock FROM productos')) {
      return [estado.productos.filter(x => x.id === Number(p[0]) && x.activo)];
    }
    if (sql.startsWith('INSERT INTO detalle_ventas')) { estado.detalle.push(p); return [{}]; }
    if (sql.startsWith('SELECT * FROM recetas')) return [[]];
    throw new Error('Consulta no simulada: ' + sql);
  };
  const conn = {
    query, beginTransaction: async () => {}, release: () => {},
    commit: async () => { estado.commits++; }, rollback: async () => { estado.rollbacks++; },
  };
  return { estado, db: { query, getConnection: async () => conn } };
};

const cargarControlador = (db) => {
  const rutaDb = path.join(__dirname, '../src/config/db.js');
  const rutaCtrl = path.join(__dirname, '../src/controllers/ventas.controller.js');
  require.cache[rutaDb] = { id: rutaDb, filename: rutaDb, loaded: true, exports: db };
  delete require.cache[rutaCtrl];
  return require(rutaCtrl);
};

const respuestaFalsa = () => {
  const r = { codigo: 200, cuerpo: null };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.cuerpo = b; return r; };
  return r;
};

const productosBase = [
  { id: 1, nombre: 'Bubble Tea Taro', stock: 5, activo: true },
  { id: 2, nombre: 'Soda Maracuyá', stock: 1, activo: true },
];

// ── Ayudas ──
test('descuento por monto y porcentaje', () => {
  assert.deepStrictEqual(calcularDescuento(20, 5, 'monto'), { montoDescuento: 5 });
  assert.deepStrictEqual(calcularDescuento(20, 10, 'porcentaje'), { montoDescuento: 2 });
  assert.deepStrictEqual(calcularDescuento(20, '', 'monto'), { montoDescuento: 0 });
});

test('descuento inválido se rechaza (antes podía dejar el total negativo)', () => {
  assert.ok(calcularDescuento(20, 25, 'monto').error);
  assert.ok(calcularDescuento(20, 150, 'porcentaje').error);
  assert.ok(calcularDescuento(20, -3, 'monto').error);
  assert.ok(calcularDescuento(20, 'abc', 'monto').error);
});

test('validación de ítems', () => {
  assert.strictEqual(validarItems([{ producto_id: 1, cantidad: 2, precio_unit: 8.5 }]), null);
  assert.ok(validarItems([]));
  assert.ok(validarItems([{ producto_id: 1, cantidad: 0, precio_unit: 8 }]));
  assert.ok(validarItems([{ producto_id: 1, cantidad: 1.5, precio_unit: 8 }]));
  assert.ok(validarItems([{ producto_id: 1, cantidad: 1, precio_unit: -1 }]));
});

test('redondeo a céntimos', () => {
  assert.strictEqual(redondear(0.1 + 0.2), 0.3);
  assert.strictEqual(redondear(10 / 3), 3.33);
});

test('hoyLima devuelve formato YYYY-MM-DD', () => {
  assert.match(hoyLima(), /^\d{4}-\d{2}-\d{2}$/);
});

// ── Ventas ──
test('venta normal descuenta stock y guarda el total con descuento', async () => {
  const { estado, db } = crearDbFalsa(productosBase);
  const ctrl = cargarControlador(db);
  const res = respuestaFalsa();
  await ctrl.crear({
    usuario: { id: 7 },
    body: { cliente_id: 3, metodo_pago: 'yape', descuento: 10, tipo_descuento: 'porcentaje',
      items: [{ producto_id: 1, cantidad: 2, precio_unit: 12 }] },
  }, res);
  assert.strictEqual(res.codigo, 201);
  assert.strictEqual(res.cuerpo.total, 21.6);
  assert.strictEqual(estado.productos[0].stock, 3);
  assert.strictEqual(estado.commits, 1);
});

test('si el mismo producto viene en dos líneas, se valida el stock total', async () => {
  // Antes se revisaba cada línea por separado: 1 + 1 pasaba aunque solo quedara 1
  const { estado, db } = crearDbFalsa(productosBase);
  const ctrl = cargarControlador(db);
  const res = respuestaFalsa();
  await ctrl.crear({
    usuario: { id: 7 },
    body: { cliente_id: 3, items: [
      { producto_id: 2, cantidad: 1, precio_unit: 9 },
      { producto_id: 2, cantidad: 1, precio_unit: 6 },
    ] },
  }, res);
  assert.strictEqual(res.codigo, 400);
  assert.match(res.cuerpo.error, /Stock insuficiente para "Soda Maracuyá"/);
  assert.strictEqual(estado.rollbacks, 1);
  assert.strictEqual(estado.commits, 0);
});

test('venta sin cliente o con descuento mayor al subtotal se rechaza', async () => {
  const { db } = crearDbFalsa(productosBase);
  const ctrl = cargarControlador(db);
  let res = respuestaFalsa();
  await ctrl.crear({ usuario: { id: 1 }, body: { items: [{ producto_id: 1, cantidad: 1, precio_unit: 5 }] } }, res);
  assert.strictEqual(res.codigo, 400);

  res = respuestaFalsa();
  await ctrl.crear({ usuario: { id: 1 }, body: { cliente_id: 1, descuento: 50, tipo_descuento: 'monto',
    items: [{ producto_id: 1, cantidad: 1, precio_unit: 5 }] } }, res);
  assert.strictEqual(res.codigo, 400);
  assert.match(res.cuerpo.error, /descuento/);
});
