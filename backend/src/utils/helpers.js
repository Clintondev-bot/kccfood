// Funciones pequeñas que usan varios controladores.

// Fecha de hoy en Perú (YYYY-MM-DD).
// OJO: new Date().toISOString() devuelve la fecha en UTC, así que después de
// las 7:00 p. m. en Lima ya marca el día siguiente y los reportes salían vacíos.
const hoyLima = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());

const esFechaValida = (txt) => typeof txt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(txt);

// Convierte un valor del formulario a número. '' / null / undefined → valorPorDefecto
const aNumero = (valor, valorPorDefecto = null) => {
  if (valor === '' || valor === null || valor === undefined) return valorPorDefecto;
  const n = Number(valor);
  return Number.isFinite(n) ? n : NaN;
};

// Redondea a 2 decimales (céntimos) evitando errores como 0.1 + 0.2 = 0.30000000000000004
const redondear = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Calcula el monto de descuento y lo limita entre 0 y el subtotal.
// Devuelve { montoDescuento } o { error } si el valor no tiene sentido.
const calcularDescuento = (subtotal, descuento, tipo) => {
  const valor = aNumero(descuento, 0);
  if (Number.isNaN(valor) || valor < 0) return { error: 'El descuento no es válido' };
  if (tipo !== 'monto' && tipo !== 'porcentaje') return { error: 'Tipo de descuento no válido' };

  if (tipo === 'porcentaje') {
    if (valor > 100) return { error: 'El descuento no puede ser mayor a 100%' };
    return { montoDescuento: redondear((subtotal * valor) / 100) };
  }
  if (valor > subtotal) return { error: 'El descuento no puede ser mayor al subtotal' };
  return { montoDescuento: redondear(valor) };
};

// Valida los ítems de una venta o compra: [{ producto_id, cantidad, precio_unit }]
// Devuelve un mensaje de error o null si todo está bien.
const validarItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return 'Debe haber al menos un producto';
  for (const item of items) {
    if (!Number.isInteger(Number(item.producto_id)) || Number(item.producto_id) <= 0) {
      return 'Hay un producto no válido';
    }
    if (!Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) <= 0) {
      return 'Las cantidades deben ser números enteros mayores a 0';
    }
    const precio = Number(item.precio_unit);
    if (!Number.isFinite(precio) || precio < 0) return 'Hay un precio no válido';
  }
  return null;
};

module.exports = { hoyLima, esFechaValida, aNumero, redondear, calcularDescuento, validarItems };
