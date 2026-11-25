// Repetición espaciada (FSRS) + nivel de pista de cada tarjeta + estadísticas. Todo se guarda en el navegador.
import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs';
import { HUESOS, REGIONES, huesoPorId, preguntaPorId, type Grupo, type RegionId } from './data/huesos';
import { PREGUNTAS_PARTES, partePorId } from './data/partes';
import { NIVEL_MAX } from './answer';

export type Modo = 'aislado' | 'conjunto' | 'localizar' | 'partes' | 'localizarParte';
export const MODOS: Record<Modo, string> = {
  aislado: 'Hueso aislado',
  conjunto: 'En conjunto',
  localizar: 'Localizar',
  partes: 'Partes del hueso',
  localizarParte: 'Localizar la parte',
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
  versionModos?: number;
}

interface Guardado {
  estados: Record<string, Estado>;
  ajustes: Ajustes;
  hoy: { fecha: string; nuevas: number };
  historial: Record<string, { repasos: number; aciertos: number }>;
  /** tarjetas falladas: clave → cuándo (ms) */
  fallos: Record<string, number>;
}

const CLAVE = 'anato-v1';
const f = fsrs({ enable_fuzz: true });

function cargar(): Guardado {
  const base: Guardado = {
    estados: {},
    ajustes: { estilo: 'realista', nuevasPorDia: 15, regiones: REGIONES.map((r) => r.id), modos: ['aislado', 'conjunto', 'localizar', 'partes', 'localizarParte'], escalaLetra: 1, sonido: true },
    hoy: { fecha: '', nuevas: 0 },
    historial: {},
    fallos: {},
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
    // versiones antiguas: si tenías los 3 modos, se añade el nuevo de partes
    if (!g.ajustes?.versionModos && ['aislado', 'conjunto', 'localizar'].every((m) => ajustes.modos.includes(m as Modo)) && !ajustes.modos.includes('partes')) ajustes.modos = [...ajustes.modos, 'partes'];
    // versión 3: llega «localizar la parte»; se activa si ya estudiabas partes
    if ((ajustes.versionModos ?? 0) < 3 && ajustes.modos.includes('partes') && !ajustes.modos.includes('localizarParte')) ajustes.modos = [...ajustes.modos, 'localizarParte'];
    ajustes.versionModos = 3;
    return { ...base, ...g, ajustes, fallos: g.fallos ?? {} };
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

// ---- repasar una zona (solo durante la sesión, no se guarda) ----
export type TipoZona = 'huesos' | 'partes' | 'ambos';
export type Foco = { grupos: Grupo[]; tipo: TipoZona } | { fallos: true };
let foco: Foco | null = null;
export const focoActual = () => foco;
export function enfocar(f: Foco | null) {
  foco = f;
}
const MODOS_HUESO: Modo[] = ['aislado', 'conjunto', 'localizar'];
const MODOS_PARTE: Modo[] = ['partes', 'localizarParte'];
/** Tarjetas de unos grupos de huesos: los huesos, sus partes o ambos. No mira las regiones ni los tipos de Inicio. */
/** modos: los que se usan (por defecto, los elegidos en Inicio). */
export function tarjetasDeZona(grupos: Grupo[], tipo: TipoZona, modos: Modo[] = datos.ajustes.modos): Tarjeta[] {
  const gs = new Set<string>(grupos);
  const out: Tarjeta[] = [];
  if (tipo !== 'partes') {
    const hs = HUESOS.filter((h) => gs.has(h.grupo));
    const elegidos = modos.filter((m) => !MODOS_PARTE.includes(m));
    for (const modo of elegidos.length ? elegidos : MODOS_HUESO) {
      const ids = new Set(hs.map((h) => (modo === 'conjunto' ? h.id : modo === 'aislado' ? (h.tipo ?? h.par ?? h.id) : (h.tipo ?? h.id))));
      for (const id of ids) out.push({ clave: `${id}:${modo}`, hueso: id, modo });
    }
  }
  if (tipo !== 'huesos') {
    const elegidos = modos.filter((m) => MODOS_PARTE.includes(m));
    for (const modo of elegidos.length ? elegidos : (['partes'] as Modo[]))
      for (const p of PREGUNTAS_PARTES)
        if (p.apartado.huesos.some((id) => gs.has(huesoPorId.get(id)?.grupo ?? ''))) out.push({ clave: `${p.id}:${modo}`, hueso: p.id, modo });
  }
  return out;
}

function todasLasTarjetas(): Tarjeta[] {
  if (foco) return 'fallos' in foco ? fallosRecientes() : tarjetasDeZona(foco.grupos, foco.tipo);
  const a = datos.ajustes;
  const hs = HUESOS.filter((h) => a.regiones.includes(h.region));
  return a.modos.flatMap((modo): Tarjeta[] => {
    if (MODOS_PARTE.includes(modo))
      return PREGUNTAS_PARTES.filter((p) => a.regiones.includes(p.region)).map((p) => ({ clave: `${p.id}:${modo}`, hueso: p.id, modo }));
    // hueso aislado: una tarjeta por tipo/pareja (sin repetidos)
    // en conjunto: una por hueso · localizar: una por hueso, salvo vértebras/costillas (por tipo)
    const ids = new Set(hs.map((h) => (modo === 'conjunto' ? h.id : modo === 'aislado' ? (h.tipo ?? h.par ?? h.id) : (h.tipo ?? h.id))));
    return [...ids].map((id) => ({ clave: `${id}:${modo}`, hueso: id, modo }));
  });
}

// ---- mis fallos ----
const DIAS_FALLOS = 7;
/** Tarjeta a partir de su clave («id:modo»), o null si ya no existe. */
export function tarjetaDeClave(clave: string): Tarjeta | null {
  const k = clave.lastIndexOf(':');
  const hueso = clave.slice(0, k);
  const modo = clave.slice(k + 1) as Modo;
  if (!(modo in MODOS)) return null;
  const existe = MODOS_PARTE.includes(modo) ? partePorId.has(hueso) : preguntaPorId.has(hueso);
  return existe ? { clave, hueso, modo } : null;
}
/** Tarjetas falladas en los últimos días (y aún sin acertar después). */
export function fallosRecientes(): Tarjeta[] {
  const desde = Date.now() - DIAS_FALLOS * 86400000;
  return Object.entries(datos.fallos)
    .filter(([, cuando]) => cuando >= desde)
    .map(([clave]) => tarjetaDeClave(clave))
    .filter((t): t is Tarjeta => !!t);
}
export function marcarFallo(t: Tarjeta) {
  datos.fallos[t.clave] = Date.now();
  guardar();
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
  const nuevas = foco || contadorHoy().nuevas < datos.ajustes.nuevasPorDia ? todas.filter((t) => !datos.estados[t.clave]) : [];
  // mezcla repasos y nuevas
  const candidatas = [...vencidas, ...nuevas];
  const elegida = azar(candidatas.filter(distinta)) ?? azar(candidatas);
  if (elegida) return elegida;
  // repasando una zona: si no toca nada, se adelanta lo que vence antes
  const pronto = vistas.filter((t) => foco || due(t) <= ahora + MARGEN_APRENDIZAJE).sort((a, b) => due(a) - due(b));
  return pronto.find(distinta) ?? pronto[0] ?? null;
}

export function contadores() {
  const ahora = Date.now();
  const todas = todasLasTarjetas();
  const pendientes = todas.filter((t) => datos.estados[t.clave] && datos.estados[t.clave].card.due.getTime() <= ahora).length;
  const sinVer = todas.filter((t) => !datos.estados[t.clave]).length;
  const nuevasHoy = foco ? sinVer : Math.max(0, Math.min(sinVer, datos.ajustes.nuevasPorDia - contadorHoy().nuevas));
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
  // fallada → a «mis fallos»; acertada bien → sale de la lista
  if (nota === Rating.Again) datos.fallos[t.clave] = Date.now();
  else if (nota !== Rating.Hard) delete datos.fallos[t.clave];
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
  datos.fallos = {};
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
