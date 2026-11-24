// Zonas dentro de un hueso: dicen qué trozo de la malla pertenece a una parte (apófisis espinosa…).
//
// Coordenadas normalizadas a la caja del hueso, en ejes anatómicos:
//   x: 0 = lado derecho del paciente → 1 = lado izquierdo
//   y: 0 = abajo → 1 = arriba
//   z: 0 = atrás → 1 = delante
// En huesos del lado izquierdo se usa el espejo (las zonas se escriben para el lado derecho).
// El radio va en fracción de la medida más grande del hueso (así las bolas son redondas).

export interface Zona {
  /** centro (x, y, z) en coordenadas normalizadas */
  c: [number, number, number];
  /** radio (uno o por eje) */
  r: number | [number, number, number];
  /** repetir en el lado opuesto (x → 1 − x) */
  sim?: boolean;
  /** restar esta zona (para hacer anillos, huecos…) */
  menos?: boolean;
  /** el radio va en fracción de cada eje del hueso (no de la medida más grande): sirve para «la mitad de delante» de huesos distintos */
  norm?: boolean;
  /** pintar solo donde la superficie mira hacia aquí (x: hacia la izquierda del paciente… en el lado derecho; se refleja en el izquierdo) */
  cara?: [number, number, number];
}

/** Datos de la malla ya preparados para pintar rápido. */
export interface MallaNorm {
  /** posiciones en el mundo (x, y, z seguidos) */
  pos: Float32Array;
  min: [number, number, number];
  tam: [number, number, number];
  maxTam: number;
  espejo: boolean;
  /** normales en el mundo (opcional) */
  nor?: Float32Array;
}

export function prepararMalla(pos: Float32Array, espejo: boolean, nor?: Float32Array): MallaNorm {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], pos[i + k]);
      max[k] = Math.max(max[k], pos[i + k]);
    }
  const tam: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return { pos, min, tam, maxTam: Math.max(...tam), espejo, nor };
}

const normalizar = (v: number[]) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Peso 0–1 de cada vértice (1 = dentro de la parte). */
export function pesos(m: MallaNorm, zonas: Zona[]): Float32Array {
  const n = m.pos.length / 3;
  const w = new Float32Array(n);
  const todas = zonas.flatMap((z) => (z.sim ? [z, { ...z, c: [1 - z.c[0], z.c[1], z.c[2]] as [number, number, number] }] : [z]));
  // centros y radios en coordenadas del mundo
  const cs = todas.map((z) => {
    const x = m.espejo ? 1 - z.c[0] : z.c[0];
    const r = typeof z.r === 'number' ? [z.r, z.r, z.r] : z.r;
    return {
      menos: !!z.menos,
      c: [m.min[0] + x * m.tam[0], m.min[1] + z.c[1] * m.tam[1], m.min[2] + z.c[2] * m.tam[2]],
      inv: r.map((ri, k) => 1 / Math.max(1e-6, ri * (z.norm ? m.tam[k] : m.maxTam))),
      cara: z.cara ? normalizar([m.espejo ? -z.cara[0] : z.cara[0], z.cara[1], z.cara[2]]) : null,
    };
  });
  for (let i = 0; i < n; i++) {
    let mejor = 0;
    let resta = 0;
    for (const z of cs) {
      const dx = (m.pos[i * 3] - z.c[0]) * z.inv[0];
      const dy = (m.pos[i * 3 + 1] - z.c[1]) * z.inv[1];
      const dz = (m.pos[i * 3 + 2] - z.c[2]) * z.inv[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d >= 1) continue;
      let v = 1 - suave(0.7, 1, d);
      if (z.cara && m.nor) {
        const dot = m.nor[i * 3] * z.cara[0] + m.nor[i * 3 + 1] * z.cara[1] + m.nor[i * 3 + 2] * z.cara[2];
        v *= suave(0.15, 0.55, dot);
      }
      if (z.menos) resta = Math.max(resta, v);
      else mejor = Math.max(mejor, v);
    }
    w[i] = mejor * (1 - resta);
  }
  return w;
}

/** Punto del mundo → coordenadas normalizadas del hueso (para el editor de zonas). */
export function aNormal(m: MallaNorm, p: { x: number; y: number; z: number }): [number, number, number] {
  const r = (v: number) => Math.round(v * 1000) / 1000;
  let x = (p.x - m.min[0]) / m.tam[0];
  if (m.espejo) x = 1 - x;
  return [r(x), r((p.y - m.min[1]) / m.tam[1]), r((p.z - m.min[2]) / m.tam[2])];
}

/** Centro del mundo de lo pintado (media ponderada), o null si no hay nada. */
export function centroPintado(m: MallaNorm, w: Float32Array): [number, number, number] | null {
  let s = 0;
  const c = [0, 0, 0];
  for (let i = 0; i < w.length; i++) {
    if (w[i] < 0.5) continue;
    s += w[i];
    for (let k = 0; k < 3; k++) c[k] += m.pos[i * 3 + k] * w[i];
  }
  return s ? [c[0] / s, c[1] / s, c[2] / s] : null;
}

/** Peso de un solo punto (en coordenadas normalizadas) dentro de unas zonas. */
export function pesoEnPunto(m: MallaNorm, zonas: Zona[], punto: [number, number, number]): number {
  const x = m.espejo ? 1 - punto[0] : punto[0];
  const pos = new Float32Array([m.min[0] + x * m.tam[0], m.min[1] + punto[1] * m.tam[1], m.min[2] + punto[2] * m.tam[2]]);
  return pesos({ ...m, pos, nor: undefined }, zonas)[0];
}
