// Repetición espaciada (FSRS) + nivel de pista de cada tarjeta + estadísticas. Todo se guarda en el navegador.
import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs';
import { HUESOS, REGIONES, type RegionId } from './data/huesos';
import { NIVEL_MAX } from './answer';

export type Modo = 'aislado' | 'conjunto' | 'localizar';
export const MODOS: Record<Modo, string> = {
  aislado: 'Hueso aislado',
  conjunto: 'En conjunto',
  localizar: 'Localizar',
};

export interface Tarjeta {
  clave: string;
  /** id de la pregunta: un hueso, un tipo (T:…) o una pareja (P:…) */
  hueso: string;
  modo: Modo;
}

interface Estado {
  card: Card;
  nivel: number; // nivel de pista (0 = muchas letras, 4 = en blanco)
}

export type Estilo = 'realista' | 'arcilla' | 'atlas' | 'colores';

export interface Ajustes {
  estilo: Estilo;
  nuevasPorDia: number;
  regiones: RegionId[];
  modos: Modo[];
  escalaLetra: number; // 0.85 – 1.4
  sonido: boolean;
}

interface Guardado {
  estados: Record<string, Estado>;
  ajustes: Ajustes;
  hoy: { fecha: string; nuevas: number };
  historial: Record<string, { repasos: number; aciertos: number }>;
}

const CLAVE = 'anato-v1';
const f = fsrs({ enable_fuzz: true });

function cargar(): Guardado {
  const base: Guardado = {
    estados: {},
    ajustes: { estilo: 'realista', nuevasPorDia: 15, regiones: REGIONES.map((r) => r.id), modos: ['aislado', 'conjunto', 'localizar'], escalaLetra: 1, sonido: true },
    hoy: { fecha: '', nuevas: 0 },
    historial: {},
  };
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return base;
    const g = JSON.parse(raw) as Guardado;
    for (const e of Object.values(g.estados)) {
      e.card.due = new Date(e.card.due);
      if (e.card.last_review) e.card.last_review = new Date(e.card.last_review);
    }
    const ajustes = { ...base.ajustes, ...g.ajustes };
    // versiones antiguas tenían la región "mano" (ahora es parte del miembro superior)
    const validas = new Set(REGIONES.map((r) => r.id as string));
    ajustes.regiones = [...new Set((ajustes.regiones ?? []).map((r) => ((r as string) === 'mano' ? 'superior' : r)))].filter((r) => validas.has(r));
    if (!ajustes.regiones.length) ajustes.regiones = base.ajustes.regiones;
    return { ...base, ...g, ajustes };
  } catch {
    return base;
  }
}

const datos = cargar();
const guardar = () => localStorage.setItem(CLAVE, JSON.stringify(datos));

export const fecha = (d = new Date()) => d.toLocaleDateString('sv');
function contadorHoy() {
  if (datos.hoy.fecha !== fecha()) datos.hoy = { fecha: fecha(), nuevas: 0 };
  return datos.hoy;
}

export const ajustes = () => datos.ajustes;
export function cambiarAjustes(a: Partial<Ajustes>) {
  Object.assign(datos.ajustes, a);
  guardar();
}

function todasLasTarjetas(): Tarjeta[] {
  const a = datos.ajustes;
  const hs = HUESOS.filter((h) => a.regiones.includes(h.region));
  return a.modos.flatMap((modo) => {
    // hueso aislado: una tarjeta por tipo/pareja (sin repetidos)
    // en conjunto: una por hueso · localizar: una por hueso, salvo vértebras/costillas (por tipo)
    const ids = new Set(hs.map((h) => (modo === 'conjunto' ? h.id : modo === 'aislado' ? (h.tipo ?? h.par ?? h.id) : (h.tipo ?? h.id))));
    return [...ids].map((id) => ({ clave: `${id}:${modo}`, hueso: id, modo }));
  });
}

export const nivelDe = (t: Tarjeta) => datos.estados[t.clave]?.nivel ?? 0;
export const esNueva = (t: Tarjeta) => !datos.estados[t.clave];

const azar = <T>(xs: T[]): T | undefined => xs[Math.floor(Math.random() * xs.length)];
const MARGEN_APRENDIZAJE = 20 * 60 * 1000; // se adelantan tarjetas que vencen en <20 min si no hay otra cosa

/** Siguiente tarjeta, elegida al azar entre las que tocan. Evita repetir el mismo hueso seguido. */
export function siguiente(huesoAnterior?: string): Tarjeta | null {
  const ahora = Date.now();
  const todas = todasLasTarjetas();
  const distinta = (t: Tarjeta) => t.hueso !== huesoAnterior;
  const due = (t: Tarjeta) => datos.estados[t.clave].card.due.getTime();
  const vistas = todas.filter((t) => datos.estados[t.clave]);
  const vencidas = vistas.filter((t) => due(t) <= ahora);
  const nuevas = contadorHoy().nuevas < datos.ajustes.nuevasPorDia ? todas.filter((t) => !datos.estados[t.clave]) : [];
  // mezcla repasos y nuevas
  const candidatas = [...vencidas, ...nuevas];
  const elegida = azar(candidatas.filter(distinta)) ?? azar(candidatas);
  if (elegida) return elegida;
  const pronto = vistas.filter((t) => due(t) <= ahora + MARGEN_APRENDIZAJE).sort((a, b) => due(a) - due(b));
  return pronto.find(distinta) ?? pronto[0] ?? null;
}

export function contadores() {
  const ahora = Date.now();
  const todas = todasLasTarjetas();
  const pendientes = todas.filter((t) => datos.estados[t.clave] && datos.estados[t.clave].card.due.getTime() <= ahora).length;
  const sinVer = todas.filter((t) => !datos.estados[t.clave]).length;
  const nuevasHoy = Math.max(0, Math.min(sinVer, datos.ajustes.nuevasPorDia - contadorHoy().nuevas));
  const dominadas = todas.filter((t) => (datos.estados[t.clave]?.nivel ?? 0) >= NIVEL_MAX).length;
  return { pendientes, nuevasHoy, sinVer, total: todas.length, dominadas };
}

function estadoDe(t: Tarjeta): Estado {
  return datos.estados[t.clave] ?? { card: createEmptyCard(new Date()), nivel: 0 };
}

/** Texto del próximo repaso para cada botón, p. ej. "10 min", "3 d". */
export function intervalos(t: Tarjeta): Record<Grade, string> {
  const ahora = new Date();
  const p = f.repeat(estadoDe(t).card, ahora);
  const fmt = (d: Date) => {
    const min = Math.round((d.getTime() - ahora.getTime()) / 60000);
    if (min < 60) return `${Math.max(1, min)} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} h`;
    const dias = Math.round(h / 24);
    return dias < 31 ? `${dias} d` : `${Math.round(dias / 30)} mes`;
  };
  return {
    [Rating.Again]: fmt(p[Rating.Again].card.due),
    [Rating.Hard]: fmt(p[Rating.Hard].card.due),
    [Rating.Good]: fmt(p[Rating.Good].card.due),
    [Rating.Easy]: fmt(p[Rating.Easy].card.due),
  } as Record<Grade, string>;
}

export function responder(t: Tarjeta, nota: Grade) {
  if (esNueva(t)) contadorHoy().nuevas++;
  const e = estadoDe(t);
  e.card = f.next(e.card, new Date(), nota).card;
  if (nota === Rating.Again) e.nivel = Math.max(0, e.nivel - 2);
  else if (nota === Rating.Hard) e.nivel = Math.min(NIVEL_MAX, e.nivel + (e.nivel < 2 ? 1 : 0));
  else e.nivel = Math.min(NIVEL_MAX, e.nivel + (nota === Rating.Easy ? 2 : 1));
  datos.estados[t.clave] = e;
  const h = (datos.historial[fecha()] ??= { repasos: 0, aciertos: 0 });
  h.repasos++;
  if (nota !== Rating.Again) h.aciertos++;
  guardar();
}

export function masNuevasHoy(n: number) {
  contadorHoy().nuevas -= n;
  guardar();
}

export function borrarProgreso() {
  datos.estados = {};
  datos.historial = {};
  datos.hoy = { fecha: fecha(), nuevas: 0 };
  guardar();
}

// ---------- estadísticas ----------
export function racha(): number {
  let n = 0;
  const d = new Date();
  // si hoy aún no has estudiado, la racha cuenta hasta ayer
  if (!datos.historial[fecha(d)]) d.setDate(d.getDate() - 1);
  while (datos.historial[fecha(d)]?.repasos) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function ultimosDias(n: number) {
  const out: { fecha: string; dia: string; repasos: number; aciertos: number }[] = [];
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    const h = datos.historial[fecha(d)] ?? { repasos: 0, aciertos: 0 };
    out.push({ fecha: fecha(d), dia: d.toLocaleDateString('es', { weekday: 'narrow' }), ...h });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function porcentajeAciertos(dias = 30): number | null {
  const ds = ultimosDias(dias);
  const r = ds.reduce((a, x) => a + x.repasos, 0);
  return r ? Math.round((100 * ds.reduce((a, x) => a + x.aciertos, 0)) / r) : null;
}
