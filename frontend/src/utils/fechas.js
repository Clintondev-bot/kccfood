// Ayudas para trabajar con fechas en la hora LOCAL del navegador (Perú).
//
// Ojo con dos trampas de JavaScript que causaban errores:
//  1. new Date().toISOString() da la fecha en UTC: después de las 7 p. m. en
//     Lima ya es "mañana", y los reportes del día salían en cero.
//  2. new Date('2026-10-27') se interpreta como medianoche UTC, que en Lima es
//     las 7 p. m. del día ANTERIOR, así que el filtro "Desde" incluía ventas
//     de la noche previa.

const dosDigitos = (n) => String(n).padStart(2, '0');

// Date → 'YYYY-MM-DD' en hora local
export const fechaLocal = (fecha = new Date()) =>
  `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;

// 'YYYY-MM-DD' → Date a las 00:00 locales
export const inicioDelDia = (txt) => new Date(`${txt}T00:00:00`);

// 'YYYY-MM-DD' → Date a las 23:59:59.999 locales
export const finDelDia = (txt) => new Date(`${txt}T23:59:59.999`);

// Suma (o resta) días a una fecha 'YYYY-MM-DD' y devuelve otra 'YYYY-MM-DD'
export const sumarDias = (txt, dias) => {
  const d = inicioDelDia(txt);
  d.setDate(d.getDate() + dias);
  return fechaLocal(d);
};
