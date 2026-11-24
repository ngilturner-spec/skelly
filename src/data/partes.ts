// Partes de los huesos (accidentes óseos), organizadas como la guía de disección.
// Cada parte se pinta en 3D con "zonas" (ver src/zonas.ts para las coordenadas).
// Las zonas son aproximadas: se pueden corregir desde la app (Partes → Editar zona).
import type { Zona } from '../zonas';
import { huesoPorId, type Pregunta, type RegionId } from './huesos';

export interface Parte {
  id: string;
  nombre: string;
  sinonimos?: string[];
  en: string;
  enSin?: string[];
  /** zonas para cualquiera de los huesos del apartado, o por id de hueso */
  zonas: Zona[] | Record<string, Zona[]>;
  /** dirección de la cámara (x: hacia la izquierda del paciente, y: arriba, z: delante) */
  dir?: [number, number, number];
}

export interface Apartado {
  id: string;
  nombre: string;
  en: string;
  region: RegionId;
  /** sección de la guía (para agrupar en la pantalla) */
  seccion: string;
  /** huesos de ejemplo: se enseña uno al azar (o todos si conjunto) */
  huesos: string[];
  /** enseñar todos los huesos juntos (columna entera, cráneo…) */
  conjunto?: boolean;
  partes: Parte[];
}

/** Zona que cubre todo el hueso. */
const TODO: Zona[] = [{ c: [0.5, 0.5, 0.5], r: 3 }];

// ---------- huesos ----------
const C = ['FMA12519', 'FMA12520', 'FMA12521', 'FMA12522', 'FMA12523', 'FMA12524', 'FMA12525'];
const T = ['FMA9165', 'FMA9187', 'FMA9209', 'FMA9248', 'FMA9922', 'FMA9945', 'FMA9968', 'FMA9991', 'FMA10014', 'FMA10037', 'FMA10059', 'FMA10081'];
const L = ['FMA13072', 'FMA13073', 'FMA13074', 'FMA13075', 'FMA13076'];
const SACRO = 'FMA16202';
const COCCIX = 'COCCIX';
const COLUMNA = [...C, ...T, ...L, SACRO, COCCIX];

const todos = (ids: string[], z: Zona[] = TODO) => Object.fromEntries(ids.map((id) => [id, z]));

// ---------- zonas de una vértebra típica (torácica) ----------
// medidas sacadas de cortes de T4: cuerpo z 0.62–1, y 0.16–0.68; agujero z 0.44–0.62, x 0.4–0.6;
// transversas x 0–0.2, y 0.56–0.88, z 0.34–0.5; espinosa desde (y 0.62, z 0.38) a la punta (y 0.05, z 0)
const V = {
  cuerpo: [{ c: [0.5, 0.42, 0.81], r: [0.26, 0.2, 0.23] }] as Zona[],
  agujero: [{ c: [0.5, 0.5, 0.52], r: [0.15, 0.3, 0.13] }] as Zona[],
  escotaduraInf: [{ c: [0.35, 0.36, 0.58], r: 0.07, sim: true }] as Zona[],
  escotaduraSup: [{ c: [0.35, 0.67, 0.56], r: 0.065, sim: true }] as Zona[],
  artSup: [{ c: [0.33, 0.92, 0.6], r: 0.07, sim: true }] as Zona[],
  artInf: [{ c: [0.29, 0.3, 0.44], r: 0.09, sim: true }] as Zona[],
};

export const APARTADOS: Apartado[] = [
  // ======================= COLUMNA =======================
  {
    id: 'columna',
    nombre: 'Columna vertebral',
    en: 'Vertebral column',
    region: 'tronco',
    seccion: 'Columna vertebral',
    huesos: COLUMNA,
    conjunto: true,
    partes: [
      { id: 'cifosis-toracica', nombre: 'cifosis torácica', sinonimos: ['cifosis toracica', 'cifosis dorsal'], en: 'thoracic kyphosis', zonas: todos(T), dir: [-1, 0.1, 0.05] },
      { id: 'cifosis-sacra', nombre: 'cifosis sacra', en: 'sacral kyphosis', zonas: todos([SACRO, COCCIX]), dir: [-1, 0.1, 0.05] },
      { id: 'lordosis-cervical', nombre: 'lordosis cervical', en: 'cervical lordosis', zonas: todos(C), dir: [-1, 0.1, 0.05] },
      { id: 'lordosis-lumbar', nombre: 'lordosis lumbar', en: 'lumbar lordosis', zonas: todos(L), dir: [-1, 0.1, 0.05] },
      { id: 'conducto-vertebral', nombre: 'conducto vertebral', sinonimos: ['canal vertebral', 'canal raquideo', 'conducto raquideo'], en: 'vertebral canal', zonas: todos([...C.slice(2), ...T, ...L], V.agujero), dir: [-0.6, 0.5, -0.6] },
      {
        id: 'agujero-intervertebral',
        nombre: 'agujero intervertebral',
        sinonimos: ['agujero de conjuncion', 'foramen intervertebral'],
        en: 'intervertebral foramen',
        zonas: todos([...T, ...L], [...V.escotaduraInf, ...V.escotaduraSup]),
        dir: [-1, 0.1, 0.05],
      },
    ],
  },
  {
    id: 'vertebra',
    nombre: 'Vértebra: elementos comunes',
    en: 'Vertebra: common elements',
    region: 'tronco',
    seccion: 'Columna vertebral',
    huesos: T.slice(3, 9),
    partes: [
      { id: 'cuerpo', nombre: 'cuerpo vertebral', sinonimos: ['cuerpo de la vertebra'], en: 'vertebral body', enSin: ['body'], zonas: V.cuerpo },
      {
        id: 'cara-intervertebral',
        nombre: 'cara intervertebral',
        sinonimos: ['superficie intervertebral'],
        en: 'intervertebral surface',
        zonas: [
          { c: [0.5, 0.66, 0.81], r: [0.25, 0.085, 0.22] },
          { c: [0.5, 0.16, 0.83], r: [0.25, 0.06, 0.22] },
        ],
        dir: [0.2, 1, 0.6],
      },
      {
        id: 'epifisis-anular',
        nombre: 'epífisis anular',
        sinonimos: ['epifisis anular', 'reborde marginal', 'rodete marginal'],
        en: 'annular epiphysis',
        zonas: [
          { c: [0.5, 0.66, 0.81], r: [0.26, 0.09, 0.23] },
          { c: [0.5, 0.16, 0.83], r: [0.26, 0.07, 0.23] },
          { c: [0.5, 0.66, 0.81], r: [0.17, 0.14, 0.15], menos: true },
          { c: [0.5, 0.16, 0.83], r: [0.17, 0.12, 0.15], menos: true },
        ],
        dir: [0.2, 1, 0.6],
      },
      { id: 'arco', nombre: 'arco vertebral', sinonimos: ['arco neural', 'arco posterior'], en: 'vertebral arch', zonas: [{ c: [0.5, 0.55, 0.25], r: [0.75, 0.55, 0.37] }], dir: [0.3, 0.5, -1] },
      { id: 'pediculo', nombre: 'pedículo', sinonimos: ['pediculo vertebral', 'pediculos'], en: 'pedicle', zonas: [{ c: [0.35, 0.53, 0.58], r: 0.085, sim: true }], dir: [-1, 0.3, 0.2] },
      { id: 'escotadura-superior', nombre: 'escotadura vertebral superior', en: 'superior vertebral notch', zonas: V.escotaduraSup, dir: [-1, 0.3, 0] },
      { id: 'escotadura-inferior', nombre: 'escotadura vertebral inferior', en: 'inferior vertebral notch', zonas: V.escotaduraInf, dir: [-1, 0.1, 0] },
      { id: 'lamina', nombre: 'lámina', sinonimos: ['lamina vertebral', 'laminas'], en: 'lamina', zonas: [{ c: [0.42, 0.5, 0.41], r: [0.09, 0.15, 0.08], sim: true }], dir: [0.2, 0.4, -1] },
      { id: 'agujero-vertebral', nombre: 'agujero vertebral', sinonimos: ['foramen vertebral'], en: 'vertebral foramen', zonas: V.agujero, dir: [0.1, 1, 0.2] },
      {
        id: 'articular-superior',
        nombre: 'apófisis articular superior',
        sinonimos: ['cigoapofisis superior', 'apofisis articulares superiores'],
        en: 'superior articular process',
        enSin: ['superior zygapophysis'],
        zonas: V.artSup,
        dir: [0.2, 0.6, -1],
      },
      {
        id: 'articular-inferior',
        nombre: 'apófisis articular inferior',
        sinonimos: ['cigoapofisis inferior', 'apofisis articulares inferiores'],
        en: 'inferior articular process',
        enSin: ['inferior zygapophysis'],
        zonas: V.artInf,
        dir: [-0.6, -0.3, -1],
      },
      {
        id: 'espinosa',
        nombre: 'apófisis espinosa',
        sinonimos: ['espinosa', 'proceso espinoso'],
        en: 'spinous process',
        zonas: [
          { c: [0.5, 0.58, 0.33], r: 0.1 },
          { c: [0.5, 0.42, 0.22], r: 0.1 },
          { c: [0.5, 0.3, 0.13], r: 0.09 },
          { c: [0.5, 0.16, 0.06], r: 0.09 },
        ],
        dir: [-1, 0.2, -0.3],
      },
      { id: 'transversa', nombre: 'apófisis transversa', sinonimos: ['transversa', 'proceso transverso'], en: 'transverse process', zonas: [{ c: [0.12, 0.72, 0.42], r: [0.17, 0.13, 0.1], sim: true }], dir: [0.2, 0.5, -1] },
    ],
  },
  {
    id: 'cervical',
    nombre: 'Vértebras cervicales',
    en: 'Cervical vertebrae',
    region: 'tronco',
    seccion: 'Columna vertebral',
    huesos: C.slice(2, 6),
    partes: [
      { id: 'unciforme', nombre: 'apófisis unciforme', sinonimos: ['uncus', 'apofisis semilunar', 'unco del cuerpo'], en: 'uncal process', enSin: ['uncinate process', 'uncus of body'], zonas: [{ c: [0.31, 0.93, 0.8], r: 0.06, sim: true }], dir: [0, 0.7, 1] },
      { id: 'transversa', nombre: 'apófisis transversa cervical', sinonimos: ['apofisis transversa', 'transversa'], en: 'transverse process', zonas: [{ c: [0.15, 0.62, 0.78], r: [0.23, 0.18, 0.15], sim: true }], dir: [0.2, 0.6, 1] },
      { id: 'tuberculo-anterior', nombre: 'tubérculo anterior', sinonimos: ['tuberculo anterior de la apofisis transversa'], en: 'anterior tubercle', zonas: [{ c: [0.06, 0.58, 0.87], r: 0.07, sim: true }], dir: [-0.4, 0.3, 1] },
      { id: 'tuberculo-posterior', nombre: 'tubérculo posterior', sinonimos: ['tuberculo posterior de la apofisis transversa'], en: 'posterior tubercle', zonas: [{ c: [0.04, 0.6, 0.7], r: 0.07, sim: true }], dir: [-1, 0.3, 0.2] },
      { id: 'agujero-transverso', nombre: 'agujero transverso', sinonimos: ['foramen transverso', 'agujero transversario'], en: 'foramen transversarium', enSin: ['transverse foramen'], zonas: [{ c: [0.17, 0.62, 0.76], r: 0.09, sim: true }], dir: [0.1, 1, 0.3] },
      { id: 'surco-nervio', nombre: 'surco del nervio espinal', sinonimos: ['lamela', 'surco del nervio raquideo'], en: 'groove for spinal nerve', zonas: [{ c: [0.09, 0.74, 0.77], r: [0.1, 0.05, 0.07], sim: true }], dir: [-0.5, 1, 0.4] },
    ],
  },
  {
    id: 'toracica',
    nombre: 'Vértebras torácicas',
    en: 'Thoracic vertebrae',
    region: 'tronco',
    seccion: 'Columna vertebral',
    huesos: T.slice(1, 9),
    partes: [
      { id: 'fosita-costal-sup', nombre: 'fosita costal superior', sinonimos: ['fosita costal superior del cuerpo', 'semicarilla costal superior'], en: 'superior costal facet', zonas: [{ c: [0.29, 0.64, 0.68], r: 0.05, sim: true }], dir: [-1, 0.2, 0.3] },
      { id: 'fosita-costal-inf', nombre: 'fosita costal inferior', sinonimos: ['fosita costal inferior del cuerpo', 'semicarilla costal inferior'], en: 'inferior costal facet', zonas: [{ c: [0.29, 0.2, 0.7], r: 0.05, sim: true }], dir: [-1, -0.1, 0.3] },
      { id: 'fosita-costal-transversa', nombre: 'fosita costal de la apófisis transversa', sinonimos: ['fosita costal transversa', 'carilla costal transversa'], en: 'costal facet of transverse process', enSin: ['transverse costal facet'], zonas: [{ c: [0.04, 0.7, 0.47], r: 0.05, sim: true }], dir: [-0.6, 0.3, 0.8] },
      {
        id: 'articulares-planas',
        nombre: 'apófisis articulares con superficie plana',
        sinonimos: ['apofisis articulares', 'apofisis articulares planas'],
        en: 'articular processes with plane surface',
        enSin: ['articular processes'],
        zonas: [...V.artSup, ...V.artInf],
        dir: [-0.5, 0.3, -1],
      },
    ],
  },
  {
    id: 'lumbar',
    nombre: 'Vértebras lumbares',
    en: 'Lumbar vertebrae',
    region: 'tronco',
    seccion: 'Columna vertebral',
    huesos: L,
    partes: [
      {
        id: 'articulares',
        nombre: 'apófisis articulares lumbares',
        sinonimos: ['apofisis articulares'],
        en: 'articular processes',
        zonas: [
          { c: [0.3, 0.92, 0.42], r: 0.08, sim: true },
          { c: [0.36, 0.13, 0.33], r: 0.075, sim: true },
        ],
        dir: [-0.5, 0.3, -1],
      },
      { id: 'costiforme', nombre: 'apófisis costiforme', sinonimos: ['apofisis costal', 'costiforme'], en: 'costal process', enSin: ['costiform process'], zonas: [{ c: [0.1, 0.8, 0.46], r: [0.15, 0.09, 0.07], sim: true }], dir: [0.2, 0.6, -1] },
    ],
  },
  // atlas: arco anterior z 0.88–1, arco posterior z 0–0.4, masas laterales x 0.2–0.35, z 0.4–0.9
  {
    id: 'atlas',
    nombre: 'Atlas',
    en: 'Atlas',
    region: 'tronco',
    seccion: 'Columna vertebral',
    huesos: ['FMA12519'],
    partes: [
      { id: 'masa-lateral', nombre: 'masa lateral del atlas', sinonimos: ['masa lateral', 'masas laterales'], en: 'lateral mass', zonas: [{ c: [0.27, 0.5, 0.65], r: [0.11, 0.16, 0.17], sim: true }], dir: [0.3, 0.6, 1] },
      { id: 'cara-superior', nombre: 'cara articular superior', sinonimos: ['carilla articular superior', 'fosita articular superior'], en: 'superior articular surface', zonas: [{ c: [0.28, 0.88, 0.66], r: [0.08, 0.07, 0.13], sim: true }], dir: [0.1, 1, 0.4] },
      { id: 'cara-inferior', nombre: 'cara articular inferior', sinonimos: ['carilla articular inferior'], en: 'inferior articular surface', zonas: [{ c: [0.28, 0.1, 0.66], r: [0.08, 0.07, 0.11], sim: true }], dir: [0.1, -1, 0.4] },
      { id: 'arco-anterior', nombre: 'arco anterior del atlas', sinonimos: ['arco anterior'], en: 'anterior arch', zonas: [{ c: [0.5, 0.5, 0.94], r: [0.14, 0.2, 0.08] }], dir: [0.2, 0.4, 1] },
      { id: 'fosita-diente', nombre: 'fosita del diente', sinonimos: ['carilla para el diente', 'fosita odontoidea'], en: 'facet for dens', zonas: [{ c: [0.5, 0.5, 0.86], r: [0.06, 0.09, 0.035] }], dir: [0.15, 0.6, -1] },
      { id: 'tuberculo-anterior', nombre: 'tubérculo anterior del atlas', sinonimos: ['tuberculo anterior'], en: 'anterior tubercle', enSin: ['anterior tuberculum'], zonas: [{ c: [0.5, 0.5, 0.99], r: 0.05 }], dir: [0.2, 0.3, 1] },
      {
        id: 'arco-posterior',
        nombre: 'arco posterior del atlas',
        sinonimos: ['arco posterior'],
        en: 'posterior arch',
        zonas: [
          { c: [0.5, 0.5, 0.04], r: 0.07 },
          { c: [0.37, 0.5, 0.12], r: 0.08, sim: true },
          { c: [0.29, 0.5, 0.28], r: 0.07, sim: true },
        ],
        dir: [0.2, 0.5, -1],
      },
      { id: 'surco-vertebral', nombre: 'surco de la arteria vertebral', sinonimos: ['surco arteria vertebral'], en: 'groove for vertebral artery', zonas: [{ c: [0.32, 0.62, 0.3], r: 0.075, sim: true }], dir: [-0.3, 1, -0.5] },
      { id: 'tuberculo-posterior', nombre: 'tubérculo posterior del atlas', sinonimos: ['tuberculo posterior'], en: 'posterior tubercle', enSin: ['posterior tuberculum'], zonas: [{ c: [0.5, 0.5, 0.02], r: 0.05 }], dir: [0.2, 0.3, -1] },
    ],
  },
  // axis: diente y 0.6–1, z 0.65–0.92
  {
    id: 'axis',
    nombre: 'Axis',
    en: 'Axis',
    region: 'tronco',
    seccion: 'Columna vertebral',
    huesos: ['FMA12520'],
    partes: [
      { id: 'diente', nombre: 'diente del axis', sinonimos: ['diente', 'apofisis odontoides', 'odontoides'], en: 'dens', enSin: ['odontoid process'], zonas: [{ c: [0.5, 0.8, 0.77], r: [0.13, 0.26, 0.13] }], dir: [0.5, 0.4, 1] },
      { id: 'carilla-anterior', nombre: 'carilla articular anterior del diente', sinonimos: ['carilla articular anterior'], en: 'anterior articular surface', enSin: ['anterior articular facet'], zonas: [{ c: [0.5, 0.82, 0.92], r: [0.07, 0.08, 0.035] }], dir: [0.2, 0.3, 1] },
      { id: 'carilla-posterior', nombre: 'carilla articular posterior del diente', sinonimos: ['carilla articular posterior'], en: 'posterior articular surface', enSin: ['posterior articular facet'], zonas: [{ c: [0.5, 0.82, 0.67], r: [0.07, 0.08, 0.04] }], dir: [0.2, 0.5, -1] },
    ],
  },
];

export const apartadoPorId = new Map(APARTADOS.map((a) => [a.id, a]));

/** Una parte como pregunta (para corregir respuestas y para el editor de nombres). id = PT:apartado:parte */
export interface PreguntaParte extends Pregunta {
  apartado: Apartado;
  parte: Parte;
}
export const PREGUNTAS_PARTES: PreguntaParte[] = APARTADOS.flatMap((a) =>
  a.partes.map((p) => ({
    id: `PT:${a.id}:${p.id}`,
    nombre: p.nombre,
    sinonimos: p.sinonimos ?? [],
    en: [p.en, p.enSin ?? []] as [string, string[]],
    grupo: huesoPorId.get(a.huesos[0])!.grupo,
    region: a.region,
    miembros: [],
    apartado: a,
    parte: p,
  })),
);
export const partePorId = new Map(PREGUNTAS_PARTES.map((p) => [p.id, p]));

// ---------- zonas corregidas por el usuario (editor) ----------
// Se guardan en el móvil. Sustituyen a las zonas del código para esa parte.
const CLAVE_ZONAS = 'skelly-zonas';
let corregidas: Record<string, Zona[]> = {};
try {
  corregidas = JSON.parse(localStorage.getItem(CLAVE_ZONAS) ?? '{}');
} catch {
  corregidas = {};
}
export const zonasCorregidas = () => corregidas;
export function guardarZonas(clave: string, zonas: Zona[] | null) {
  if (zonas) corregidas[clave] = zonas;
  else delete corregidas[clave];
  localStorage.setItem(CLAVE_ZONAS, JSON.stringify(corregidas));
}

/** Zonas de una parte para unos huesos concretos. `clave` = id de la pregunta (PT:apartado:parte). */
export function zonasDe(p: Parte, ids: string[], clave?: string) {
  const c = clave ? corregidas[clave] : undefined;
  return new Map(ids.map((id) => [id, c ?? (Array.isArray(p.zonas) ? p.zonas : (p.zonas[id] ?? []))]));
}

/** Huesos que se enseñan para una parte (todos si es de conjunto; si no, uno al azar o el i-ésimo). */
export function huesosDe(a: Apartado, i?: number) {
  if (a.conjunto) return a.huesos;
  const k = i ?? Math.floor(Math.random() * a.huesos.length);
  return [a.huesos[k % a.huesos.length]];
}
