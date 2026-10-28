// Protecciones generales de la API (informe de seguridad V-01 y V-04).
// Escritas a mano, sin dependencias nuevas.

// ── V-01 · Límite de peticiones ──────────────────────────────────────────────
// Cuenta peticiones por "clave" (IP, email...) dentro de una ventana de tiempo.
// Vive en memoria: se reinicia si el servidor se reinicia, lo cual es suficiente
// para frenar ataques de fuerza bruta.
const crearLimitador = ({ ventanaMs, maximo }) => {
  const registros = new Map(); // clave → { cuenta, reinicia }

  // Limpieza periódica para que el mapa no crezca sin fin
  const limpieza = setInterval(() => {
    const ahora = Date.now();
    for (const [clave, r] of registros) if (r.reinicia <= ahora) registros.delete(clave);
  }, ventanaMs);
  limpieza.unref(); // no impide que el proceso termine (ni las pruebas)

  const leer = (clave) => {
    const ahora = Date.now();
    let r = registros.get(clave);
    if (!r || r.reinicia <= ahora) {
      r = { cuenta: 0, reinicia: ahora + ventanaMs };
      registros.set(clave, r);
    }
    return r;
  };

  return {
    // ¿Ya superó el máximo? Devuelve los segundos que faltan, o 0 si puede seguir.
    bloqueado(clave) {
      const r = leer(clave);
      return r.cuenta >= maximo ? Math.ceil((r.reinicia - Date.now()) / 1000) : 0;
    },
    sumar(clave) { leer(clave).cuenta += 1; },
    reiniciar(clave) { registros.delete(clave); },
  };
};

const ipDe = (req) => req.ip || req.socket?.remoteAddress || 'desconocida';

// Límite general: 300 peticiones por minuto por IP (de sobra para uso normal)
const limitadorGeneral = crearLimitador({ ventanaMs: 60 * 1000, maximo: 300 });
const limitarPeticiones = (req, res, next) => {
  const clave = ipDe(req);
  const espera = limitadorGeneral.bloqueado(clave);
  if (espera) {
    res.set('Retry-After', String(espera));
    return res.status(429).json({ error: 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.' });
  }
  limitadorGeneral.sumar(clave);
  next();
};

// Login: 5 intentos FALLIDOS cada 15 minutos, por IP y por email.
// Por email también, para que no sirva cambiar de IP contra la cuenta del admin.
const MAX_FALLOS_LOGIN = 5;
const limitadorLogin = crearLimitador({ ventanaMs: 15 * 60 * 1000, maximo: MAX_FALLOS_LOGIN });
const clavesLogin = (req) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  return [`ip:${ipDe(req)}`, `email:${email}`];
};

const limitarLogin = (req, res, next) => {
  const espera = Math.max(...clavesLogin(req).map(c => limitadorLogin.bloqueado(c)));
  if (espera) {
    const minutos = Math.ceil(espera / 60);
    res.set('Retry-After', String(espera));
    return res.status(429).json({
      error: `Demasiados intentos fallidos. Vuelve a intentarlo en ${minutos} minuto${minutos === 1 ? '' : 's'}.`,
    });
  }
  // El controlador avisa si el intento falló o salió bien
  req.loginFallido = () => clavesLogin(req).forEach(c => limitadorLogin.sumar(c));
  req.loginExitoso = () => clavesLogin(req).forEach(c => limitadorLogin.reiniciar(c));
  next();
};

// ── V-04 · Cabeceras de seguridad ───────────────────────────────────────────
// La API solo devuelve JSON e imágenes, así que puede ser muy estricta.
const cabecerasSeguras = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',               // el navegador no "adivina" tipos
    'X-Frame-Options': 'DENY',                          // nadie puede incrustarla (clickjacking)
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  // HSTS solo tiene sentido (y solo se respeta) cuando la petición llegó por HTTPS
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};

module.exports = { crearLimitador, limitarPeticiones, limitarLogin, cabecerasSeguras, MAX_FALLOS_LOGIN };
