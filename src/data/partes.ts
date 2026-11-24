// Partes de cada hueso (accidentes óseos: cabeza, cuello, tubérculos, apófisis…).
// Clave: id de la pregunta de "hueso aislado" (pareja P:…, tipo T:… o hueso).
// Ejemplo:
//   'P:FMA24474': [ { nombre: 'cabeza del fémur', en: 'head of femur' }, { nombre: 'trocánter mayor', en: 'greater trochanter' } ],
// Aún está vacío: se irá rellenando más adelante.

export interface Parte {
  nombre: string;
  sinonimos?: string[];
  en?: string;
}

export const PARTES: Record<string, Parte[]> = {};
