// Pruebas de las protecciones del informe de seguridad (Etapa 1).
// Ejecutar con:  npm test
const test = require('node:test');
const assert = require('node:assert');

const { crearLimitador, limitarLogin, cabecerasSeguras, MAX_FALLOS_LOGIN } = require('../src/middleware/seguridad');
const { detectarTipoImagen } = require('../src/utils/imagenes');

const respuestaFalsa = () => {
  const r = { codigo: 200, cuerpo: null, cabeceras: {} };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.cuerpo = b; return r; };
  r.set = (k, v) => {
    if (typeof k === 'object') Object.assign(r.cabeceras, k); else r.cabeceras[k] = v;
    return r;
  };
  return r;
};

// ── V-01 ──
test('el limitador bloquea al superar el máximo y se puede reiniciar', () => {
  const lim = crearLimitador({ ventanaMs: 60000, maximo: 3 });
  for (let i = 0; i < 3; i++) { assert.strictEqual(lim.bloqueado('a'), 0); lim.sumar('a'); }
  assert.ok(lim.bloqueado('a') > 0, 'debería estar bloqueado');
  assert.strictEqual(lim.bloqueado('b'), 0, 'otra clave no se ve afectada');
  lim.reiniciar('a');
  assert.strictEqual(lim.bloqueado('a'), 0);
});

test(`login: tras ${MAX_FALLOS_LOGIN} fallos se bloquea con 429, aunque cambie la IP`, () => {
  const pedir = (ip) => {
    const req = { ip, body: { email: 'Admin@KCCfood.pe ' } };
    const res = respuestaFalsa();
    let paso = false;
    limitarLogin(req, res, () => { paso = true; });
    return { req, res, paso };
  };
  for (let i = 0; i < MAX_FALLOS_LOGIN; i++) {
    const { req, paso } = pedir('1.1.1.1');
    assert.ok(paso, `intento ${i + 1} debería pasar`);
    req.loginFallido();
  }
  const bloqueado = pedir('1.1.1.1');
  assert.strictEqual(bloqueado.paso, false);
  assert.strictEqual(bloqueado.res.codigo, 429);
  assert.match(bloqueado.res.cuerpo.error, /Demasiados intentos/);

  // Cambiar de IP no sirve: el email (sin importar mayúsculas/espacios) también está bloqueado
  const otraIp = pedir('2.2.2.2');
  assert.strictEqual(otraIp.res.codigo, 429);
});

test('login: un acceso correcto reinicia el contador', () => {
  const req = { ip: '3.3.3.3', body: { email: 'vendedor@kccfood.pe' } };
  for (let i = 0; i < MAX_FALLOS_LOGIN - 1; i++) {
    limitarLogin(req, respuestaFalsa(), () => {}); req.loginFallido();
  }
  limitarLogin(req, respuestaFalsa(), () => {}); req.loginExitoso();
  let paso = false;
  limitarLogin(req, respuestaFalsa(), () => { paso = true; });
  assert.ok(paso);
});

// ── V-03 ──
test('detecta JPG, PNG y WEBP reales', () => {
  const relleno = Buffer.alloc(16);
  assert.strictEqual(detectarTipoImagen(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), relleno])), 'image/jpeg');
  assert.strictEqual(detectarTipoImagen(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), relleno])), 'image/png');
  assert.strictEqual(detectarTipoImagen(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), relleno])), 'image/webp');
});

test('rechaza un SVG o HTML disfrazado de imagen', () => {
  assert.strictEqual(detectarTipoImagen(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
  assert.strictEqual(detectarTipoImagen(Buffer.from('<html><script>robar()</script></html>')), null);
  assert.strictEqual(detectarTipoImagen(Buffer.alloc(0)), null);
});

// ── V-04 ──
test('agrega cabeceras de seguridad y HSTS solo por HTTPS', () => {
  const res = respuestaFalsa();
  cabecerasSeguras({ secure: false }, res, () => {});
  assert.strictEqual(res.cabeceras['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(res.cabeceras['X-Frame-Options'], 'DENY');
  assert.match(res.cabeceras['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.strictEqual(res.cabeceras['Strict-Transport-Security'], undefined);

  const resHttps = respuestaFalsa();
  cabecerasSeguras({ secure: true }, resHttps, () => {});
  assert.match(resHttps.cabeceras['Strict-Transport-Security'], /max-age=31536000/);
});
