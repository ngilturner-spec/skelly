// Comprobar respuestas escritas y generar pistas de letras.
import { HUESOS, type Hueso } from './data/huesos';
import { nombreDe } from './i18n';

const PALABRAS_VACIAS = new Set(['hueso', 'dedo', 'de', 'del', 'la', 'el', 'los', 'las', 'of', 'the', 'bone']);
const LADOS = /\b(derecha|izquierda|derecho|izquierdo|right|left)\b/g;

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/[º°ª]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !PALABRAS_VACIAS.has(w))
    .join(' ');
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function tolerancia(len: number): number {
  if (len <= 4) return 0;
  if (len <= 8) return 1;
  return 2;
}

const formas = (h: Hueso) => {
  const n = nombreDe(h);
  return [n.nombre, ...n.sinonimos];
};
const distanciaA = (h: Hueso, resp: string) => Math.min(...formas(h).map((n) => levenshtein(normalizar(n), resp)));

export type Resultado = 'exacto' | 'errata' | 'sinLado' | 'mal';

export function comprobar(objetivo: Hueso, respuesta: string): Resultado {
  const r = normalizar(respuesta);
  if (!r) return 'mal';
  const d = distanciaA(objetivo, r);
  if (d === 0) return 'exacto';
  if (d > tolerancia(r.length)) {
    // costillas: el nombre está bien pero falta decir el lado
    const quitarLado = (x: string) => normalizar(x).replace(LADOS, '').replace(/\s+/g, ' ').trim();
    const tieneLado = (x: string) => new RegExp(LADOS.source).test(normalizar(x));
    if (tieneLado(nombreDe(objetivo).nombre) && !tieneLado(r)) {
      const rr = quitarLado(r);
      if (formas(objetivo).some((n) => levenshtein(quitarLado(n), rr) <= tolerancia(rr.length))) return 'sinLado';
    }
    return 'mal';
  }
  // Si la respuesta se parece igual o más a OTRO hueso, no la damos por buena.
  for (const h of HUESOS) {
    if (h.id !== objetivo.id && distanciaA(h, r) <= d) return 'mal';
  }
  return 'errata';
}

/** Mejor resultado entre varias formas de leer lo escrito. */
export function comprobarVarias(objetivo: Hueso, respuestas: string[]): Resultado {
  const orden: Resultado[] = ['exacto', 'errata', 'sinLado', 'mal'];
  return respuestas.map((r) => comprobar(objetivo, r)).sort((a, b) => orden.indexOf(a) - orden.indexOf(b))[0] ?? 'mal';
}

// ---------- pistas ----------
// nivel 0: ~60% de letras · 1: ~40% · 2: ~20% · 3: solo los huecos · 4: en blanco
export const NIVEL_MAX = 4;
const FRACCION = [0.6, 0.4, 0.2, 0, 0];

function aleatorioConSemilla(semilla: string) {
  let h = 2166136261;
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Letras visibles de la pista: una por carácter del nombre (null = hueco). null si va en blanco. */
export function pista(nombre: string, nivel: number): (string | null)[] | null {
  if (nivel >= NIVEL_MAX) return null;
  const letras = [...nombre].map((c, i) => ({ c, i })).filter(({ c }) => c !== ' ');
  // Orden fijo por hueso: las letras que se ven en un nivel también se ven en los anteriores.
  const rnd = aleatorioConSemilla(nombre);
  const orden = letras.map((l) => ({ ...l, r: rnd() })).sort((a, b) => a.r - b.r);
  const visibles = new Set(orden.slice(0, Math.round(letras.length * FRACCION[nivel])).map((l) => l.i));
  return [...nombre].map((c, i) => (c === ' ' ? ' ' : visibles.has(i) ? c : null));
}
