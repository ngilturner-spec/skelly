// Qué piezas de BodyParts3D entran en cada región (IDs FMA).
// Los huesos se leen de src/data/huesos.ts (cada sección empieza con  region = '...').
// contexto: piezas que se ven pero no se preguntan (p. ej. cartílagos).
import fs from 'node:fs';

const fuente = fs.readFileSync(new URL('../src/data/huesos.ts', import.meta.url), 'utf8');
const secciones = {};
for (const trozo of fuente.split(/\nregion = '/).slice(1)) {
  const nombre = trozo.slice(0, trozo.indexOf("'"));
  secciones[nombre] = [...new Set(trozo.match(/FMA\d+/g) ?? [])];
}

export const REGIONES = {
  cabeza: { huesos: secciones.cabeza, contexto: [] },
  tronco: {
    huesos: secciones.tronco,
    // piezas de otras fuentes (OBJ ya en coordenadas BodyParts3D)
    extra: [{ id: 'COCCIX', nombre: 'coccyx (NIH 3D 3DPX-016830, CC-BY)', archivo: '../raw/nih/coccix_bp3d.obj' }],
    contexto: [
      // cartílagos costales 1-7 (derechos e izquierdos)
      'FMA7875', 'FMA7886', 'FMA7913', 'FMA7976', 'FMA8070', 'FMA8194', 'FMA8248',
      'FMA8005', 'FMA8031', 'FMA8058', 'FMA8167', 'FMA8112', 'FMA8221', 'FMA8275',
    ],
  },
  superior: { huesos: secciones.superior, contexto: [] },
  inferior: { huesos: secciones.inferior, contexto: [] },
};
