// V-03 · Reconoce el tipo REAL de una imagen mirando sus primeros bytes
// ("firma" del archivo), en vez de confiar en el nombre o en lo que dice el
// navegador. Así un SVG o HTML con código renombrado a .png se rechaza.

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

const detectarTipoImagen = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const firmaPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (firmaPng.every((b, i) => buffer[i] === b)) return 'image/png';

  // WEBP: "RIFF" .... "WEBP"
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';

  return null;
};

module.exports = { detectarTipoImagen, TIPOS_PERMITIDOS };
