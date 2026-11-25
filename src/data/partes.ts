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
const COST_D = ['FMA7857', 'FMA7882', 'FMA7909', 'FMA7957', 'FMA8066', 'FMA8175', 'FMA8229', 'FMA8283', 'FMA8364', 'FMA8445', 'FMA8531', 'FMA8533'];
const COST_I = ['FMA7987', 'FMA8012', 'FMA8039', 'FMA8148', 'FMA8093', 'FMA8202', 'FMA8256', 'FMA8310', 'FMA8391', 'FMA8472', 'FMA8532', 'FMA8534'];
const ESTERNON = ['FMA7486', 'FMA7487', 'FMA7488'];

/** Cadena de bolas entre unos puntos (para crestas, surcos, bordes…). */
const cadena = (pts: [number, number, number][], r: number, pasos = 3): Zona[] =>
  pts.flatMap((a, i) => {
    if (i === pts.length - 1) return [{ c: a, r }];
    const b = pts[i + 1];
    return Array.from({ length: pasos }, (_, k) => ({ c: a.map((v, j) => v + ((b[j] - v) * k) / pasos) as [number, number, number], r }));
  });

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

/** Elementos comunes de una vértebra típica (medidos en T4). */
const PARTES_VERT: Parte[] = [
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
];

/** Elementos comunes con zonas propias de cada región: cambia las zonas que se den y quita las de «sin». */
const comunes = (zonas: Record<string, Zona[] | undefined>, sin: string[] = [], dirs: Record<string, [number, number, number]> = {}) =>
  PARTES_VERT.filter((p) => !sin.includes(p.id)).map((p) => ({ ...p, zonas: zonas[p.id] ?? p.zonas, dir: dirs[p.id] ?? p.dir }));

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
    partes: PARTES_VERT,
  },
  {
    id: 'cervical',
    nombre: 'Vértebras cervicales',
    en: 'Cervical vertebrae',
    region: 'tronco',
    seccion: 'Columna vertebral',
    huesos: C.slice(2, 6),
    partes: [
      ...comunes(
        {
          cuerpo: [{ c: [0.5, 0.66, 0.88], r: [0.27, 0.17, 0.15] }],
          arco: [{ c: [0.5, 0.6, 0.34], r: [0.5, 0.4, 0.37] }],
          pediculo: [{ c: [0.3, 0.68, 0.7], r: 0.075, sim: true }],
          'escotadura-superior': [{ c: [0.29, 0.83, 0.7], r: 0.05, sim: true }],
          'escotadura-inferior': [{ c: [0.29, 0.5, 0.7], r: 0.05, sim: true }],
          lamina: [{ c: [0.38, 0.58, 0.44], r: [0.07, 0.1, 0.07], sim: true }],
          'agujero-vertebral': [{ c: [0.5, 0.66, 0.6], r: [0.19, 0.3, 0.12] }],
          'articular-superior': [{ c: [0.13, 0.92, 0.64], r: 0.07, sim: true }],
          'articular-inferior': [{ c: [0.13, 0.46, 0.55], r: 0.07, sim: true }],
          espinosa: cadena([[0.5, 0.45, 0.3], [0.5, 0.3, 0.18], [0.5, 0.15, 0.08], [0.5, 0.04, 0.02]], 0.07, 1),
        },
        ['transversa', 'cara-intervertebral', 'epifisis-anular'],
        { pediculo: [-1, 0.3, 0.3], lamina: [0.2, 0.5, -1] },
      ),
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
      ...comunes({}, ['cara-intervertebral', 'epifisis-anular']),
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
      ...comunes(
        {
          cuerpo: [{ c: [0.5, 0.5, 0.82], r: [0.3, 0.22, 0.22] }],
          arco: [{ c: [0.5, 0.45, 0.28], r: [0.43, 0.3, 0.3] }],
          pediculo: [{ c: [0.3, 0.62, 0.55], r: 0.085, sim: true }],
          'escotadura-superior': [{ c: [0.32, 0.82, 0.56], r: 0.05, sim: true }],
          'escotadura-inferior': [{ c: [0.32, 0.3, 0.56], r: 0.06, sim: true }],
          lamina: [{ c: [0.4, 0.45, 0.32], r: [0.08, 0.13, 0.06], sim: true }],
          'agujero-vertebral': [{ c: [0.5, 0.5, 0.48], r: [0.13, 0.3, 0.1] }],
          'articular-superior': [{ c: [0.29, 0.78, 0.46], r: 0.085, sim: true }],
          'articular-inferior': [{ c: [0.36, 0.18, 0.33], r: 0.07, sim: true }],
          espinosa: [{ c: [0.5, 0.32, 0.12], r: [0.06, 0.12, 0.14] }],
        },
        ['transversa', 'cara-intervertebral', 'epifisis-anular'],
        { pediculo: [-1, 0.3, 0.3] },
      ),
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
  // sacro (malla única, centrada). Medido con rayos:
  //   cara pelviana: promontorio (y 0.82, z 0.97) → baja curvándose hacia atrás (y 0.6 z 0.4; y 0.4 z 0.22; vértice y 0)
  //   cara dorsal casi plana, z 0.05–0.25; agujeros anteriores x≈0.34–0.41, posteriores x≈0.31–0.41, a y 0.73/0.6/0.52/0.4
  //   carilla auricular: lo más lateral, y 0.6–0.85, z 0.5–0.78
  {
    id: 'sacro',
    nombre: 'Sacro',
    en: 'Sacrum',
    region: 'tronco',
    seccion: 'Columna vertebral',
    huesos: [SACRO],
    partes: [
      // base
      { id: 'promontorio', nombre: 'promontorio', sinonimos: ['promontorio del sacro'], en: 'promontory', enSin: ['sacral promontory'], zonas: [{ c: [0.5, 0.82, 0.97], r: [0.12, 0.035, 0.05] }], dir: [0.4, 0.3, 1] },
      { id: 'ala', nombre: 'ala del sacro', sinonimos: ['ala sacra', 'aleta del sacro'], en: 'ala of sacrum', enSin: ['sacral ala', 'ala'], zonas: [{ c: [0.13, 0.9, 0.67], r: [0.13, 0.05, 0.15], sim: true }, { c: [0.32, 0.96, 0.6], r: 0.06, sim: true, menos: true }], dir: [0.4, 1, 0.5] },
      { id: 'articular-superior', nombre: 'apófisis articular superior del sacro', sinonimos: ['apofisis articular superior', 'proceso articular superior'], en: 'superior articular process', zonas: [{ c: [0.32, 0.96, 0.6], r: [0.06, 0.06, 0.07], sim: true }], dir: [0.3, 1, -0.6] },
      // porción lateral
      { id: 'auricular', nombre: 'carilla auricular', sinonimos: ['cara auricular', 'superficie auricular'], en: 'auricular surface', zonas: [{ c: [0.02, 0.72, 0.74], r: [0.05, 0.12, 0.08], sim: true }], dir: [-1, 0.15, 0.2] },
      { id: 'tuberosidad', nombre: 'tuberosidad sacra', sinonimos: ['tuberosidad del sacro'], en: 'sacral tuberosity', zonas: [{ c: [0.13, 0.74, 0.42], r: [0.07, 0.09, 0.06], sim: true }], dir: [-0.7, 0.3, -1] },
      { id: 'interoseo', nombre: 'región para el ligamento interóseo', sinonimos: ['region del ligamento interoseo', 'zona del ligamento interoseo'], en: 'area for interosseous ligament', zonas: [{ c: [0.07, 0.83, 0.58], r: 0.05, sim: true }], dir: [-1, 0.5, -0.6] },
      // cara pelviana
      {
        id: 'lineas-transversales',
        nombre: 'líneas transversales',
        sinonimos: ['lineas transversas', 'crestas transversales'],
        en: 'transverse ridges',
        enSin: ['transverse lines'],
        zonas: [
          { c: [0.5, 0.72, 0.75], r: [0.11, 0.022, 0.06] },
          { c: [0.5, 0.6, 0.41], r: [0.11, 0.022, 0.06] },
          { c: [0.5, 0.51, 0.26], r: [0.1, 0.022, 0.05] },
          { c: [0.5, 0.4, 0.22], r: [0.09, 0.022, 0.05] },
        ],
        dir: [0.2, -0.6, 1],
      },
      {
        id: 'agujeros-anteriores',
        nombre: 'agujeros sacros anteriores',
        sinonimos: ['agujeros sacros pelvianos', 'forámenes sacros anteriores'],
        en: 'anterior sacral foramina',
        enSin: ['pelvic sacral foramina'],
        zonas: [
          { c: [0.33, 0.71, 0.62], r: 0.06, sim: true },
          { c: [0.38, 0.62, 0.47], r: 0.055, sim: true },
          { c: [0.38, 0.51, 0.27], r: 0.07, sim: true },
          { c: [0.4, 0.39, 0.21], r: 0.06, sim: true },
        ],
        dir: [0.2, -0.6, 1],
      },
      {
        id: 'intervertebrales',
        nombre: 'agujeros intervertebrales del sacro',
        sinonimos: ['agujeros intervertebrales'],
        en: 'intervertebral foramina',
        zonas: [
          { c: [0.36, 0.72, 0.45], r: 0.045, sim: true },
          { c: [0.39, 0.62, 0.3], r: 0.045, sim: true },
          { c: [0.39, 0.52, 0.17], r: 0.045, sim: true },
          { c: [0.41, 0.4, 0.14], r: 0.04, sim: true },
        ],
        dir: [0.3, -0.4, 1],
      },
      // cara dorsal
      {
        id: 'cresta-media',
        nombre: 'cresta sacra media',
        sinonimos: ['cresta sacra mediana'],
        en: 'median sacral crest',
        zonas: [
          { c: [0.5, 0.77, 0.27], r: [0.035, 0.06, 0.05] },
          { c: [0.5, 0.66, 0.14], r: [0.035, 0.06, 0.05] },
          { c: [0.5, 0.54, 0.04], r: [0.035, 0.06, 0.05] },
          { c: [0.5, 0.44, 0.04], r: [0.035, 0.06, 0.05] },
          { c: [0.5, 0.35, 0.06], r: [0.03, 0.05, 0.05] },
        ],
        dir: [0.3, 0.3, -1],
      },
      {
        id: 'agujeros-posteriores',
        nombre: 'agujeros sacros posteriores',
        sinonimos: ['agujeros sacros dorsales', 'forámenes sacros posteriores'],
        en: 'posterior sacral foramina',
        enSin: ['dorsal sacral foramina'],
        zonas: [
          { c: [0.3, 0.75, 0.42], r: 0.05, sim: true },
          { c: [0.36, 0.645, 0.3], r: 0.05, sim: true },
          { c: [0.36, 0.53, 0.16], r: 0.06, sim: true },
          { c: [0.375, 0.395, 0.14], r: 0.055, sim: true },
        ],
        dir: [0.2, 0.4, -1],
      },
      {
        id: 'cresta-intermedia',
        nombre: 'cresta sacra intermedia',
        sinonimos: ['cresta sacra articular'],
        en: 'intermediate sacral crest',
        zonas: [
          { c: [0.39, 0.77, 0.36], r: [0.022, 0.05, 0.05], sim: true },
          { c: [0.43, 0.64, 0.2], r: [0.02, 0.05, 0.05], sim: true },
          { c: [0.455, 0.53, 0.09], r: [0.02, 0.05, 0.05], sim: true },
          { c: [0.455, 0.42, 0.08], r: [0.02, 0.05, 0.05], sim: true },
        ],
        dir: [0.3, 0.4, -1],
      },
      {
        id: 'cresta-lateral',
        nombre: 'cresta sacra lateral',
        sinonimos: ['cresta sacra transversa'],
        en: 'lateral sacral crest',
        zonas: [
          { c: [0.18, 0.75, 0.4], r: [0.035, 0.06, 0.06], sim: true },
          { c: [0.2, 0.65, 0.27], r: [0.035, 0.06, 0.06], sim: true },
          { c: [0.25, 0.53, 0.19], r: [0.035, 0.06, 0.06], sim: true },
          { c: [0.29, 0.4, 0.16], r: [0.03, 0.05, 0.06], sim: true },
        ],
        dir: [0.3, 0.4, -1],
      },
      { id: 'asta', nombre: 'asta del sacro', sinonimos: ['astas del sacro', 'cuerno del sacro', 'cuernos sacros'], en: 'sacral cornu', enSin: ['sacral horn'], zonas: [{ c: [0.43, 0.27, 0.17], r: 0.035, sim: true }], dir: [0.2, -0.3, -1] },
      {
        id: 'conducto',
        nombre: 'conducto sacro',
        sinonimos: ['canal sacro'],
        en: 'sacral canal',
        // en el modelo solo se ve la entrada de arriba (el resto es macizo)
        zonas: [{ c: [0.5, 0.87, 0.58], r: [0.1, 0.04, 0.06] }],
        dir: [0.1, 1, -0.7],
      },
      { id: 'hiato', nombre: 'hiato sacro', sinonimos: ['hiato del sacro'], en: 'sacral hiatus', zonas: [{ c: [0.5, 0.27, 0.1], r: [0.05, 0.06, 0.05] }], dir: [0.1, -0.3, -1] },
      { id: 'vertice', nombre: 'vértice del sacro', sinonimos: ['vertice', 'apice del sacro'], en: 'apex of sacrum', enSin: ['sacral apex'], zonas: [{ c: [0.5, 0.03, 0.18], r: 0.06 }], dir: [0.4, -0.5, 1] },
    ],
  },
  // cóccix (malla NIH): astas arriba y detrás, x 0.2/0.8
  {
    id: 'coxis',
    nombre: 'Cóccix',
    en: 'Coccyx',
    region: 'tronco',
    seccion: 'Columna vertebral',
    huesos: [COCCIX],
    partes: [{ id: 'asta', nombre: 'asta del cóccix', sinonimos: ['asta del coxis', 'astas del coxis', 'cuerno del coxis', 'cuernos coccigeos'], en: 'coccygeal cornu', enSin: ['coccygeal horn'], zonas: [{ c: [0.22, 0.92, 0.08], r: 0.13, sim: true }], dir: [0.3, 0.4, -1] }],
  },
  // ======================= TÓRAX ÓSEO =======================
  // caja torácica: costillas + esternón + vértebras torácicas, todo junto
  {
    id: 'caja',
    nombre: 'Caja torácica',
    en: 'Thoracic cage',
    region: 'tronco',
    seccion: 'Tórax óseo',
    conjunto: true,
    huesos: [...T, ...COST_D, ...COST_I, ...ESTERNON],
    partes: [
      {
        id: 'abertura-superior',
        nombre: 'abertura superior del tórax',
        sinonimos: ['abertura torácica superior', 'estrecho superior del torax', 'abertura superior'],
        en: 'superior thoracic aperture',
        enSin: ['thoracic inlet'],
        zonas: { ...todos([T[0], COST_D[0], COST_I[0]]), [ESTERNON[0]]: [{ c: [0.5, 1, 0.3], r: [0.7, 0.2, 0.6], norm: true }] },
        dir: [0.1, 0.8, 1],
      },
      {
        id: 'abertura-inferior',
        nombre: 'abertura inferior del tórax',
        sinonimos: ['abertura torácica inferior', 'estrecho inferior del torax', 'abertura inferior'],
        en: 'inferior thoracic aperture',
        enSin: ['thoracic outlet'],
        zonas: {
          ...todos([T[11], ...COST_D.slice(10), ...COST_I.slice(10), ESTERNON[2]]),
          ...todos([...COST_D.slice(6, 10), ...COST_I.slice(6, 10)], [{ c: [0.5, 0, 1], r: [1.2, 0.35, 0.45], norm: true }]),
        },
        dir: [0.2, -0.8, 1],
      },
      {
        id: 'angulo-infraesternal',
        nombre: 'ángulo infraesternal',
        sinonimos: ['angulo subesternal', 'angulo xifoideo'],
        en: 'infrasternal angle',
        enSin: ['subcostal angle'],
        zonas: {
          [ESTERNON[2]]: TODO,
          [ESTERNON[1]]: [{ c: [0.5, 0, 0.9], r: [0.7, 0.18, 0.6], norm: true }],
          ...todos([COST_D[6], COST_I[6], COST_D[7], COST_I[7]], [{ c: [0.5, 0, 1], r: [1.2, 0.3, 0.3], norm: true }]),
        },
        dir: [0, -0.2, 1],
      },
      { id: 'verdaderas', nombre: 'costillas verdaderas', sinonimos: ['costillas esternales', 'costillas i a vii'], en: 'true ribs', enSin: ['vertebrosternal ribs'], zonas: todos([...COST_D.slice(0, 7), ...COST_I.slice(0, 7)]), dir: [0.3, 0.2, 1] },
      { id: 'falsas', nombre: 'costillas falsas', sinonimos: ['costillas asternales', 'costillas viii a xii'], en: 'false ribs', enSin: ['vertebrochondral ribs'], zonas: todos([...COST_D.slice(7), ...COST_I.slice(7)]), dir: [0.3, 0.2, 1] },
      { id: 'flotantes', nombre: 'costillas flotantes', sinonimos: ['costillas libres', 'costillas xi y xii'], en: 'floating ribs', enSin: ['free ribs'], zonas: todos([...COST_D.slice(10), ...COST_I.slice(10)]), dir: [0.3, 0.1, -1] },
    ],
  },
  // costilla típica (derecha; en las izquierdas se usa el espejo). Medida en la 6ª:
  //   línea media: cabeza (0.97,0.93,0.2) → tubérculo (0.8,0.9,0.08) → ángulo (0.55,0.8,0.03) → lateral (0.03,0.42,0.45) → extremo anterior (0.34,0.1,0.97)
  {
    id: 'costilla',
    nombre: 'Costilla típica',
    en: 'Typical rib',
    region: 'tronco',
    seccion: 'Tórax óseo',
    huesos: [...COST_D.slice(3, 8), ...COST_I.slice(3, 8)],
    partes: [
      { id: 'cabeza', nombre: 'cabeza de la costilla', sinonimos: ['cabeza costal', 'cabeza'], en: 'head of rib', enSin: ['costal head'], zonas: [{ c: [0.97, 0.93, 0.2], r: 0.035 }], dir: [0.6, 0.4, -1] },
      { id: 'carilla-cabeza', nombre: 'carilla articular de la cabeza costal', sinonimos: ['carilla articular de la cabeza', 'cara articular de la cabeza'], en: 'articular facet of head of rib', enSin: ['articular surface of head of rib'], zonas: [{ c: [1, 0.93, 0.21], r: [0.02, 0.04, 0.03] }], dir: [1, 0.3, -0.3] },
      { id: 'cresta-cabeza', nombre: 'cresta de la cabeza costal', sinonimos: ['cresta de la cabeza'], en: 'crest of head of rib', zonas: [{ c: [1, 0.93, 0.21], r: [0.02, 0.012, 0.035] }], dir: [1, 0.2, -0.3] },
      { id: 'cuello', nombre: 'cuello de la costilla', sinonimos: ['cuello costal', 'cuello'], en: 'neck of rib', zonas: [{ c: [0.88, 0.92, 0.14], r: 0.045 }, { c: [0.97, 0.93, 0.2], r: 0.03, menos: true }], dir: [0.4, 0.6, -1] },
      { id: 'cresta-cuello', nombre: 'cresta del cuello de la costilla', sinonimos: ['cresta del cuello'], en: 'crest of neck of rib', zonas: [{ c: [0.88, 0.99, 0.14], r: [0.05, 0.015, 0.035] }], dir: [0.3, 1, -0.6] },
      { id: 'cuerpo', nombre: 'cuerpo de la costilla', sinonimos: ['cuerpo costal', 'cuerpo'], en: 'body of rib', enSin: ['shaft of rib'], zonas: [{ c: [0.5, 0.5, 0.5], r: 3 }, { c: [0.93, 0.93, 0.18], r: 0.07, menos: true }], dir: [-1, 0.3, 0.2] },
      { id: 'tuberculo', nombre: 'tubérculo costal', sinonimos: ['tuberculo de la costilla'], en: 'tubercle of rib', zonas: [{ c: [0.8, 0.88, 0.06], r: 0.035 }], dir: [0.3, 0.3, -1] },
      { id: 'carilla-tuberculo', nombre: 'carilla articular del tubérculo costal', sinonimos: ['carilla articular del tuberculo', 'cara articular del tuberculo'], en: 'articular facet of tubercle of rib', zonas: [{ c: [0.83, 0.86, 0.06], r: 0.03 }], dir: [0.5, 0.2, -1] },
      { id: 'angulo', nombre: 'ángulo de la costilla', sinonimos: ['angulo costal'], en: 'angle of rib', enSin: ['costal angle'], zonas: [{ c: [0.5, 0.79, 0.04], r: 0.04 }], dir: [-0.2, 0.2, -1] },
      {
        id: 'surco',
        nombre: 'surco costal',
        sinonimos: ['surco de la costilla', 'canal costal'],
        en: 'costal groove',
        enSin: ['subcostal groove'],
        zonas: cadena([[0.55, 0.77, 0.046], [0.4, 0.72, 0.095], [0.26, 0.635, 0.17], [0.125, 0.525, 0.31], [0.055, 0.39, 0.455]], 0.035),
        dir: [0.7, -0.5, 0.6],
      },
      {
        id: 'cresta-cuerpo',
        nombre: 'cresta del cuerpo de la costilla',
        sinonimos: ['cresta costal', 'cresta de la costilla', 'borde inferior de la costilla'],
        en: 'crest of body of rib',
        enSin: ['crest of rib'],
        zonas: cadena([[0.55, 0.755, 0.025], [0.39, 0.705, 0.072], [0.235, 0.62, 0.15], [0.095, 0.51, 0.295], [0.025, 0.375, 0.45], [0.035, 0.24, 0.6]], 0.03),
        dir: [-0.8, -0.6, -0.2],
      },
      { id: 'cara-externa', nombre: 'cara externa de la costilla', sinonimos: ['cara externa', 'cara lateral de la costilla'], en: 'external surface of rib', enSin: ['outer surface'], zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, fuera: [1.05, 0.5, 0.5] }], dir: [-1, 0.2, 0.3] },
      { id: 'cara-interna', nombre: 'cara interna de la costilla', sinonimos: ['cara interna', 'cara medial de la costilla'], en: 'internal surface of rib', enSin: ['inner surface'], zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, dentro: [1.05, 0.5, 0.5] }], dir: [1, 0.3, 0.3] },
      { id: 'borde-superior', nombre: 'borde superior de la costilla', sinonimos: ['borde superior'], en: 'superior border of rib', zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, cara: [0, 1, 0] }, { c: [0.93, 0.93, 0.18], r: 0.12, menos: true }], dir: [-0.6, 1, 0.2] },
      { id: 'extremo-anterior', nombre: 'extremo anterior (esternal) de la costilla', sinonimos: ['extremo anterior', 'extremo esternal', 'extremo condral'], en: 'anterior (sternal) end of rib', enSin: ['costal end'], zonas: [{ c: [0.38, 0.05, 0.97], r: 0.07 }], dir: [0.3, 0, 1] },
    ],
  },
  // primera costilla (derecha). Plana y ancha; cara superior: vena delante, tubérculo del escaleno en el borde interno, arteria detrás
  {
    id: 'primera-costilla',
    nombre: 'Primera costilla',
    en: 'First rib',
    region: 'tronco',
    seccion: 'Tórax óseo',
    huesos: [COST_D[0], COST_I[0]],
    partes: [
      { id: 'cabeza', nombre: 'cabeza de la primera costilla', sinonimos: ['cabeza', 'cabeza costal'], en: 'head of first rib', zonas: [{ c: [0.97, 0.86, 0.15], r: 0.05 }], dir: [0.6, 0.5, -1] },
      { id: 'cuello', nombre: 'cuello de la primera costilla', sinonimos: ['cuello', 'cuello costal'], en: 'neck of first rib', zonas: [{ c: [0.83, 0.87, 0.09], r: 0.06 }, { c: [0.97, 0.86, 0.15], r: 0.05, menos: true }], dir: [0.2, 1, -0.6] },
      { id: 'tuberculo', nombre: 'tubérculo de la primera costilla', sinonimos: ['tuberculo', 'tuberculo costal'], en: 'tubercle of first rib', zonas: [{ c: [0.65, 0.96, 0.02], r: 0.055 }], dir: [0, 0.5, -1] },
      { id: 'cuerpo', nombre: 'cuerpo de la primera costilla', sinonimos: ['cuerpo', 'cuerpo costal'], en: 'body of first rib', zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }, { c: [0.85, 0.88, 0.1], r: 0.17, menos: true }], dir: [0, 1, 0.2] },
      { id: 'cara-superior', nombre: 'cara superior de la primera costilla', sinonimos: ['cara superior'], en: 'superior surface of first rib', zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, cara: [0, 1, 0] }], dir: [0, 1, 0.2] },
      { id: 'cara-inferior', nombre: 'cara inferior de la primera costilla', sinonimos: ['cara inferior'], en: 'inferior surface of first rib', zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, cara: [0, -1, 0] }], dir: [0, -1, 0.2] },
      { id: 'borde-interno', nombre: 'borde interno de la primera costilla', sinonimos: ['borde interno', 'borde medial'], en: 'inner border of first rib', zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, dentro: [1, 0.5, 0.6] }], dir: [0.3, 1, 0.3] },
      { id: 'borde-externo', nombre: 'borde externo de la primera costilla', sinonimos: ['borde externo', 'borde lateral'], en: 'outer border of first rib', zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, fuera: [1, 0.5, 0.6] }], dir: [-0.6, 1, 0.2] },
      { id: 'extremo-anterior', nombre: 'extremo anterior de la primera costilla', sinonimos: ['extremo anterior', 'extremo esternal'], en: 'anterior end of first rib', zonas: [{ c: [0.38, 0.08, 0.95], r: 0.06 }], dir: [0, 0.3, 1] },
      { id: 'surco-arteria', nombre: 'surco de la arteria subclavia', sinonimos: ['surco arteria subclavia'], en: 'groove for subclavian artery', zonas: [{ c: [0.2, 0.47, 0.52], r: [0.22, 0.08, 0.08] }], dir: [0.3, 1, 0.2] },
      { id: 'escaleno', nombre: 'tubérculo del músculo escaleno anterior', sinonimos: ['tuberculo del escaleno anterior', 'tuberculo de lisfranc', 'tuberculo escaleno'], en: 'scalene tubercle', enSin: ['tubercle for scalenus anterior'], zonas: [{ c: [0.38, 0.27, 0.66], r: 0.1 }], dir: [0.5, 1, 0.3] },
      { id: 'surco-vena', nombre: 'surco de la vena subclavia', sinonimos: ['surco vena subclavia'], en: 'groove for subclavian vein', zonas: [{ c: [0.2, 0.26, 0.8], r: [0.22, 0.08, 0.07] }], dir: [0.3, 1, 0.4] },
    ],
  },
  // esternón: manubrio + cuerpo + xifoides juntos. Está inclinado (arriba más atrás).
  {
    id: 'esternon',
    nombre: 'Esternón',
    en: 'Sternum',
    region: 'tronco',
    seccion: 'Tórax óseo',
    conjunto: true,
    huesos: ESTERNON,
    partes: [
      { id: 'manubrio', nombre: 'manubrio del esternón', sinonimos: ['manubrio', 'manubrio esternal'], en: 'manubrium of sternum', enSin: ['manubrium'], zonas: { [ESTERNON[0]]: TODO }, dir: [0.2, 0.1, 1] },
      { id: 'yugular', nombre: 'escotadura yugular', sinonimos: ['escotadura supraesternal', 'horquilla esternal'], en: 'jugular notch', enSin: ['suprasternal notch'], zonas: { [ESTERNON[0]]: [{ c: [0.5, 0.97, 0.27], r: [0.12, 0.1, 0.12] }] }, dir: [0.1, 0.6, 1] },
      { id: 'clavicular', nombre: 'escotadura clavicular', sinonimos: ['escotaduras claviculares', 'carilla clavicular'], en: 'clavicular notch', zonas: { [ESTERNON[0]]: [{ c: [0.12, 0.86, 0.3], r: 0.1, sim: true }] }, dir: [0.1, 0.6, 1] },
      { id: 'cuerpo', nombre: 'cuerpo del esternón', sinonimos: ['cuerpo esternal', 'mesoesternon'], en: 'body of sternum', enSin: ['gladiolus'], zonas: { [ESTERNON[1]]: TODO }, dir: [0.2, 0.1, 1] },
      {
        id: 'angulo',
        nombre: 'ángulo del esternón',
        sinonimos: ['angulo esternal', 'angulo de louis'],
        en: 'sternal angle',
        enSin: ['angle of louis'],
        zonas: { [ESTERNON[0]]: [{ c: [0.5, 0.05, 0.9], r: [0.3, 0.1, 0.15] }], [ESTERNON[1]]: [{ c: [0.5, 0.98, 0.3], r: [0.13, 0.03, 0.08] }] },
        dir: [0.6, 0.2, 1],
      },
      {
        id: 'costales',
        nombre: 'escotaduras costales',
        sinonimos: ['escotadura costal', 'incisuras costales'],
        en: 'costal notches',
        enSin: ['costal incisures'],
        zonas: {
          [ESTERNON[0]]: [
            { c: [0.03, 0.52, 0.55], r: 0.1, sim: true },
            { c: [0.12, 0.06, 0.85], r: 0.08, sim: true },
          ],
          // borde lateral del cuerpo, medido: x y z cambian con la altura porque el esternón está inclinado
          [ESTERNON[1]]: (
            [
              [0.22, 0.97, 0.24],
              [0.16, 0.8, 0.26],
              [0.11, 0.62, 0.37],
              [0.07, 0.45, 0.5],
              [0.03, 0.27, 0.62],
              [0.08, 0.1, 0.8],
            ] as [number, number, number][]
          ).map((c) => ({ c, r: 0.05, sim: true })),
        },
        dir: [1, 0.1, 0.5],
      },
      { id: 'xifoides', nombre: 'apéndice xifoides', sinonimos: ['apofisis xifoides', 'xifoides', 'proceso xifoides'], en: 'xiphoid process', zonas: { [ESTERNON[2]]: TODO }, dir: [0.2, -0.2, 1] },
    ],
  },
  // ======================= CINTURA ESCAPULAR Y MIEMBRO SUPERIOR =======================
  // escápula derecha (la izquierda en espejo). El cuerpo es una lámina inclinada: su cara costal mira delante y hacia dentro (≈ 0.58, 0, 0.82).
  //   glena (0.23,0.77,0.65), coracoides base (0.42,0.87,0.65) → punta (0.25,0.84,0.97), acromion (0.03,0.9,0.41) → (0.06,0.97,0.74)
  //   ángulo superior (0.88,0.93,0.35), inferior (0.68,0.03,0.05)
  {
    id: 'escapula',
    nombre: 'Escápula',
    en: 'Scapula',
    region: 'superior',
    seccion: 'Miembro superior',
    huesos: ['FMA13395', 'FMA13396'],
    partes: [
      { id: 'angulo-superior', nombre: 'ángulo superior de la escápula', sinonimos: ['angulo superior'], en: 'superior angle', zonas: [{ c: [0.86, 0.93, 0.31], r: 0.05 }], dir: [0.3, 0.5, -1] },
      { id: 'angulo-inferior', nombre: 'ángulo inferior de la escápula', sinonimos: ['angulo inferior'], en: 'inferior angle', zonas: [{ c: [0.68, 0.03, 0.05], r: 0.06 }], dir: [0.2, -0.2, -1] },
      { id: 'angulo-lateral', nombre: 'ángulo lateral de la escápula', sinonimos: ['angulo lateral', 'cabeza de la escapula', 'cabeza'], en: 'lateral angle', enSin: ['head of scapula'], zonas: [{ c: [0.22, 0.75, 0.6], r: 0.11 }], dir: [-1, 0.2, 0.3] },
      { id: 'borde-medial', nombre: 'borde medial de la escápula', sinonimos: ['borde medial', 'borde vertebral'], en: 'medial border', enSin: ['vertebral border'], zonas: cadena([[0.88, 0.92, 0.35], [0.95, 0.85, 0.25], [0.97, 0.75, 0.17], [0.98, 0.55, 0.13], [0.95, 0.4, 0.1], [0.9, 0.25, 0.07], [0.8, 0.12, 0.04], [0.68, 0.03, 0.04]], 0.028, 2), dir: [0.6, 0.1, -1] },
      { id: 'borde-superior', nombre: 'borde superior de la escápula', sinonimos: ['borde superior'], en: 'superior border', zonas: cadena([[0.86, 0.93, 0.31], [0.8, 0.93, 0.33], [0.75, 0.91, 0.38], [0.7, 0.88, 0.44], [0.65, 0.86, 0.48], [0.6, 0.85, 0.52], [0.55, 0.84, 0.55]], 0.028, 2), dir: [0.2, 1, -0.5] },
      { id: 'supraescapular', nombre: 'escotadura supraescapular', sinonimos: ['escotadura de la escapula', 'escotadura coracoidea'], en: 'suprascapular notch', enSin: ['scapular notch'], zonas: [{ c: [0.52, 0.83, 0.57], r: 0.04 }], dir: [0, 1, 0.2] },
      { id: 'costal', nombre: 'cara costal de la escápula', sinonimos: ['fosa subescapular', 'cara costal', 'cara anterior de la escapula'], en: 'costal surface', enSin: ['subscapular fossa'], zonas: [{ c: [0.65, 0.42, 0.35], r: 0.45, cara: [0.58, 0, 0.82] }], dir: [0.6, 0.1, 1] },
      { id: 'dorsal', nombre: 'cara dorsal de la escápula', sinonimos: ['cara dorsal', 'cara posterior de la escapula'], en: 'posterior surface', enSin: ['dorsal surface'], zonas: [{ c: [0.65, 0.45, 0.3], r: 0.48, cara: [-0.58, 0, -0.82] }], dir: [-0.3, 0.1, -1] },
      { id: 'espina', nombre: 'espina de la escápula', sinonimos: ['espina escapular'], en: 'spine of scapula', zonas: cadena([[0.85, 0.85, 0.25], [0.65, 0.82, 0.15], [0.5, 0.84, 0.17], [0.35, 0.87, 0.27], [0.2, 0.9, 0.37]], 0.045, 2), dir: [-0.2, 0.4, -1] },
      { id: 'supraespinosa', nombre: 'fosa supraespinosa', sinonimos: ['fosa supraespinosa de la escapula'], en: 'supraspinous fossa', zonas: [{ c: [0.68, 0.91, 0.32], r: [0.18, 0.05, 0.15], cara: [-0.3, 0.6, -0.7] }], dir: [-0.1, 1, -0.6] },
      { id: 'infraespinosa', nombre: 'fosa infraespinosa', sinonimos: ['fosa infraespinosa de la escapula'], en: 'infraspinous fossa', zonas: [{ c: [0.65, 0.42, 0.2], r: [0.32, 0.33, 0.3], cara: [-0.58, 0, -0.82] }], dir: [-0.3, 0, -1] },
      { id: 'acromion', nombre: 'acromion', sinonimos: ['acromion de la escapula'], en: 'acromion', zonas: cadena([[0.03, 0.9, 0.41], [0, 0.95, 0.56], [0.06, 0.97, 0.74]], 0.055, 2), dir: [-0.6, 1, -0.3] },
      { id: 'carilla-clavicular', nombre: 'carilla articular para la clavícula', sinonimos: ['carilla clavicular del acromion', 'carilla articular clavicular'], en: 'clavicular facet', enSin: ['articular surface for the clavicle'], zonas: [{ c: [0.1, 0.96, 0.74], r: 0.035 }], dir: [0.5, 1, 0.5] },
      { id: 'espinoglenoidea', nombre: 'escotadura espinoglenoidea', sinonimos: ['escotadura escapular mayor', 'escotadura espinoglenoidea'], en: 'spinoglenoid notch', zonas: [{ c: [0.3, 0.82, 0.45], r: 0.045 }], dir: [-0.6, 0.4, -1] },
      { id: 'glenoidea', nombre: 'cavidad glenoidea', sinonimos: ['glena', 'fosa glenoidea'], en: 'glenoid cavity', enSin: ['glenoid fossa', 'glenoid'], zonas: [{ c: [0.22, 0.76, 0.65], r: 0.12, cara: [-0.8, 0.05, 0.6] }], dir: [-1, 0.1, 0.6] },
      { id: 'supraglenoideo', nombre: 'tubérculo supraglenoideo', sinonimos: ['tuberculo supraglenoideo'], en: 'supraglenoid tubercle', zonas: [{ c: [0.21, 0.86, 0.66], r: 0.035 }], dir: [-1, 0.4, 0.6] },
      { id: 'infraglenoideo', nombre: 'tubérculo infraglenoideo', sinonimos: ['tuberculo infraglenoideo'], en: 'infraglenoid tubercle', zonas: [{ c: [0.2, 0.63, 0.59], r: 0.04 }], dir: [-1, -0.2, 0.4] },
      { id: 'cuello', nombre: 'cuello de la escápula', sinonimos: ['cuello escapular', 'cuello'], en: 'neck of scapula', zonas: [{ c: [0.3, 0.74, 0.53], r: 0.06 }, { c: [0.2, 0.76, 0.66], r: 0.06, menos: true }], dir: [-0.6, 0.2, -1] },
      { id: 'coracoides', nombre: 'apófisis coracoides', sinonimos: ['coracoides', 'proceso coracoides'], en: 'coracoid process', zonas: cadena([[0.42, 0.87, 0.65], [0.35, 0.89, 0.77], [0.25, 0.84, 0.96]], 0.045, 2), dir: [-0.3, 0.5, 1] },
      { id: 'base-coracoides', nombre: 'base de la apófisis coracoides', sinonimos: ['base de la coracoides', 'porcion vertical de la coracoides'], en: 'base of coracoid process', zonas: [{ c: [0.42, 0.87, 0.64], r: 0.05 }], dir: [-0.3, 0.6, 1] },
      { id: 'horizontal-coracoides', nombre: 'porción horizontal de la coracoides', sinonimos: ['porcion horizontal', 'porcion horizontal de la apofisis coracoides'], en: 'horizontal part of coracoid process', zonas: cadena([[0.33, 0.89, 0.8], [0.25, 0.84, 0.96]], 0.045, 2), dir: [-0.3, 0.6, 1] },
    ],
  },
  // clavícula derecha: extremo acromial x≈0 (alto, plano, atrás) → extremo esternal x≈1 (bajo, grueso, delante)
  {
    id: 'clavicula',
    nombre: 'Clavícula',
    en: 'Clavicle',
    region: 'superior',
    seccion: 'Miembro superior',
    huesos: ['FMA13322', 'FMA13323'],
    partes: [
      { id: 'dos-tercios', nombre: 'dos tercios mediales de la clavícula', sinonimos: ['dos tercios mediales', 'porcion medial convexa'], en: 'medial two thirds', zonas: [{ c: [0.685, 0.5, 0.5], r: [0.315, 3, 3], norm: true }], dir: [0, 1, 0.15] },
      { id: 'tercio-lateral', nombre: 'tercio lateral de la clavícula', sinonimos: ['tercio lateral', 'porcion lateral concava'], en: 'lateral third', zonas: [{ c: [0.185, 0.5, 0.5], r: [0.185, 3, 3], norm: true }], dir: [0, 1, 0.15] },
      { id: 'carilla-acromial', nombre: 'carilla articular acromial', sinonimos: ['extremo acromial', 'carilla articular del extremo acromial', 'superficie articular acromial'], en: 'acromial facet', enSin: ['acromial end', 'acromial articular surface'], zonas: [{ c: [0, 0.85, 0.15], r: [0.05, 3, 3], norm: true, cara: [-1, 0, 0] }], dir: [-1, 0.3, 0.2] },
      { id: 'lateral-superior', nombre: 'superficie superior del tercio lateral', sinonimos: ['cara superior del tercio lateral'], en: 'superior surface of lateral third', zonas: [{ c: [0.185, 0.5, 0.5], r: [0.185, 3, 3], norm: true, cara: [0, 1, 0] }], dir: [0, 1, 0.3] },
      { id: 'lateral-inferior', nombre: 'superficie inferior del tercio lateral', sinonimos: ['cara inferior del tercio lateral'], en: 'inferior surface of lateral third', zonas: [{ c: [0.185, 0.5, 0.5], r: [0.185, 3, 3], norm: true, cara: [0, -1, 0] }], dir: [0, -1, 0.3] },
      { id: 'conoideo', nombre: 'tubérculo conoideo', sinonimos: ['tuberculo conoide'], en: 'conoid tubercle', zonas: [{ c: [0.3, 0.63, 0.08], r: 0.04 }], dir: [0.2, -1, -0.4] },
      { id: 'trapezoidea', nombre: 'línea trapezoidea', sinonimos: ['linea trapezoide'], en: 'trapezoid line', zonas: cadena([[0.28, 0.62, 0.09], [0.22, 0.68, 0.09], [0.16, 0.71, 0.07], [0.1, 0.72, 0.05]], 0.03, 2), dir: [0, -1, 0.2] },
      { id: 'medial-anterior', nombre: 'superficie anterior del tercio medial', sinonimos: ['cara anterior del tercio medial'], en: 'anterior surface of medial third', zonas: [{ c: [0.81, 0.5, 0.5], r: [0.19, 3, 3], norm: true, cara: [0, 0, 1] }], dir: [0.2, 0.2, 1] },
      { id: 'medial-superior', nombre: 'superficie superior del tercio medial', sinonimos: ['cara superior del tercio medial'], en: 'superior surface of medial third', zonas: [{ c: [0.81, 0.5, 0.5], r: [0.19, 3, 3], norm: true, cara: [0, 1, 0] }], dir: [0.2, 1, 0.3] },
      { id: 'medial-posterior', nombre: 'superficie posterior del tercio medial', sinonimos: ['cara posterior del tercio medial'], en: 'posterior surface of medial third', zonas: [{ c: [0.81, 0.5, 0.5], r: [0.19, 3, 3], norm: true, cara: [0, 0, -1] }], dir: [0.2, 0.2, -1] },
      { id: 'medial-inferior', nombre: 'superficie inferior del tercio medial', sinonimos: ['cara inferior del tercio medial'], en: 'inferior surface of medial third', zonas: [{ c: [0.81, 0.5, 0.5], r: [0.19, 3, 3], norm: true, cara: [0, -1, 0] }], dir: [0.2, -1, 0.3] },
      { id: 'costoclavicular', nombre: 'impresión del ligamento costoclavicular', sinonimos: ['impresion costoclavicular', 'tuberosidad costoclavicular'], en: 'impression for costoclavicular ligament', enSin: ['costoclavicular tubercle'], zonas: [{ c: [0.87, 0.14, 0.92], r: 0.06, cara: [0, -1, 0] }], dir: [0.2, -1, 0.4] },
      { id: 'esternal', nombre: 'extremo esternal de la clavícula', sinonimos: ['extremo esternal', 'carilla articular esternal'], en: 'sternal end', zonas: [{ c: [1, 0.3, 0.88], r: [0.07, 3, 3], norm: true }], dir: [1, 0.2, 0.5] },
    ],
  },
  {
    id: 'humero',
    nombre: 'Húmero',
    en: 'Humerus',
    region: 'superior',
    seccion: 'Miembro superior',
    huesos: ['FMA23130', 'FMA23131'],
    partes: [
      { id: 'cabeza', nombre: 'cabeza del húmero', sinonimos: ['cabeza humeral', 'cabeza'], en: 'head of humerus', zonas: [{ c: [0.86, 0.93, 0.82], r: 0.075 }], dir: [0.8, 0.3, 0.7] },
      { id: 'cuello-anatomico', nombre: 'cuello anatómico', sinonimos: ['cuello anatomico del humero'], en: 'anatomical neck', zonas: cadena([[0.96, 0.9, 0.62], [0.9, 0.9, 0.74], [0.84, 0.905, 0.85], [0.79, 0.906, 0.91], [0.72, 0.92, 0.9]], 0.022, 2), dir: [0.6, 0.2, 1] },
      { id: 'tuberculo-mayor', nombre: 'tubérculo mayor (troquíter)', sinonimos: ['troquiter', 'tuberculo mayor', 'troquiter del humero'], en: 'greater tubercle', zonas: [{ c: [0.56, 0.93, 0.45], r: 0.055 }], dir: [-1, 0.3, 0] },
      { id: 'tuberculo-menor', nombre: 'tubérculo menor (troquín)', sinonimos: ['troquin', 'tuberculo menor'], en: 'lesser tubercle', zonas: [{ c: [0.64, 0.92, 0.8], r: 0.035 }], dir: [0, 0.2, 1] },
      { id: 'intertubercular', nombre: 'surco intertubercular (corredera bicipital)', sinonimos: ['corredera bicipital', 'surco intertubercular', 'surco bicipital'], en: 'intertubercular sulcus', enSin: ['bicipital groove'], zonas: cadena([[0.57, 0.93, 0.74], [0.53, 0.895, 0.68], [0.5, 0.84, 0.65], [0.47, 0.78, 0.63]], 0.022, 2), dir: [-0.4, 0.2, 1] },
      { id: 'cuerpo', nombre: 'cuerpo (diáfisis) del húmero', sinonimos: ['diafisis', 'cuerpo del humero', 'cuerpo'], en: 'shaft of humerus', enSin: ['body of humerus'], zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 0.3, 3], norm: true }], dir: [0, 0, 1] },
      { id: 'surco-radial', nombre: 'surco del nervio radial', sinonimos: ['surco radial', 'canal de torsion', 'surco espiral'], en: 'radial groove', enSin: ['spiral groove', 'groove for radial nerve'], zonas: cadena([[0.52, 0.6, 0.2], [0.46, 0.5, 0.15], [0.4, 0.41, 0.11], [0.33, 0.32, 0.13]], 0.05, 2), dir: [-0.3, 0, -1] },
      { id: 'deltoidea', nombre: 'tuberosidad deltoidea', sinonimos: ['tuberosidad deltoidea', 'v deltoidea', 'impresion deltoidea'], en: 'deltoid tuberosity', zonas: cadena([[0.42, 0.68, 0.48], [0.37, 0.6, 0.45]], 0.055, 2), dir: [-1, 0, 0.4] },
      { id: 'epitroclea', nombre: 'epicóndilo medial (epitróclea)', sinonimos: ['epitroclea', 'epicondilo medial'], en: 'medial epicondyle', zonas: [{ c: [0.61, 0.07, 0.33], r: 0.045 }], dir: [1, 0, 0.3] },
      { id: 'epicondilo', nombre: 'epicóndilo lateral (epicóndilo)', sinonimos: ['epicondilo', 'epicondilo lateral'], en: 'lateral epicondyle', zonas: [{ c: [0.02, 0.085, 0.3], r: 0.035 }], dir: [-1, 0, 0.3] },
      { id: 'troclea', nombre: 'tróclea humeral', sinonimos: ['troclea', 'troclea del humero'], en: 'trochlea', zonas: [...cadena([[0.22, 0.05, 0.55], [0.3, 0.04, 0.52], [0.4, 0.018, 0.5]], 0.04, 2), ...cadena([[0.4, 0.018, 0.3], [0.3, 0.045, 0.22]], 0.04, 2)], dir: [0.2, -0.3, 1] },
      { id: 'capitulo', nombre: 'capítulo (cóndilo humeral)', sinonimos: ['capitulo', 'condilo humeral', 'condilo', 'capitulo humeral'], en: 'capitulum', zonas: [{ c: [0.09, 0.055, 0.53], r: 0.045 }], dir: [-0.3, -0.3, 1] },
      { id: 'surco-cubital', nombre: 'surco del nervio cubital', sinonimos: ['surco cubital', 'canal epitrocleo-olecraniano'], en: 'groove for ulnar nerve', enSin: ['ulnar groove'], zonas: [{ c: [0.5, 0.065, 0.22], r: 0.04, cara: [0, 0, -1] }], dir: [0.5, 0, -1] },
      { id: 'fosa-coronoidea', nombre: 'fosa coronoidea', sinonimos: ['fosa coronoidea'], en: 'coronoid fossa', zonas: [{ c: [0.32, 0.095, 0.37], r: 0.03, cara: [0, 0, 1] }], dir: [0, 0, 1] },
      { id: 'fosa-radial', nombre: 'fosa radial', sinonimos: ['fosa radial'], en: 'radial fossa', zonas: [{ c: [0.155, 0.097, 0.34], r: 0.032, cara: [0, 0, 1] }], dir: [0, 0, 1] },
      { id: 'fosa-olecraniana', nombre: 'fosa olecraniana', sinonimos: ['fosa del olecranon', 'fosa olecraneana'], en: 'olecranon fossa', zonas: [{ c: [0.33, 0.1, 0.27], r: 0.04, cara: [0, 0, -1] }], dir: [0, 0, -1] },
    ],
  },
  {
    id: 'cubito',
    nombre: 'Cúbito',
    en: 'Ulna',
    region: 'superior',
    seccion: 'Miembro superior',
    huesos: ['FMA23467', 'FMA23468'],
    partes: [
      { id: 'cara-anterior', nombre: 'cara anterior del cúbito', sinonimos: ['cara anterior'], en: 'anterior surface of ulna', zonas: [{ c: [0.5, 0.47, 0.5], r: [3, 0.32, 3], norm: true, cara: [0, 0.25, 1] }], dir: [0.3, 0, 1] },
      { id: 'cara-posterior', nombre: 'cara posterior del cúbito', sinonimos: ['cara posterior'], en: 'posterior surface of ulna', zonas: [{ c: [0.5, 0.47, 0.5], r: [3, 0.32, 3], norm: true, cara: [-0.3, -0.25, -1] }], dir: [-0.3, 0, -1] },
      { id: 'cara-medial', nombre: 'cara medial del cúbito', sinonimos: ['cara medial'], en: 'medial surface of ulna', zonas: [{ c: [0.5, 0.47, 0.5], r: [3, 0.32, 3], norm: true, cara: [1, -0.1, 0] }], dir: [1, 0, 0.2] },
      { id: 'borde-anterior', nombre: 'borde anterior del cúbito', sinonimos: ['borde anterior'], en: 'anterior border of ulna', zonas: cadena([[0.37, 0.17, 0.82], [0.44, 0.29, 0.72], [0.49, 0.45, 0.59], [0.55, 0.58, 0.45], [0.65, 0.7, 0.38]], 0.022, 2), dir: [0.8, 0, 1] },
      { id: 'borde-posterior', nombre: 'borde posterior del cúbito', sinonimos: ['borde posterior'], en: 'posterior border of ulna', zonas: cadena([[0.36, 0.27, 0.63], [0.46, 0.37, 0.54], [0.48, 0.54, 0.37], [0.55, 0.67, 0.22], [0.65, 0.79, 0.1]], 0.022, 2), dir: [0.3, 0, -1] },
      { id: 'borde-interoseo', nombre: 'borde interóseo del cúbito', sinonimos: ['borde interoseo', 'borde lateral del cubito'], en: 'interosseous border of ulna', zonas: cadena([[0.17, 0.15, 0.82], [0.27, 0.29, 0.7], [0.29, 0.42, 0.59], [0.3, 0.54, 0.51], [0.35, 0.67, 0.35]], 0.022, 2), dir: [-1, 0, 0.3] },
      { id: 'olecranon', nombre: 'olécranon', sinonimos: ['olecranon', 'olecranon del cubito'], en: 'olecranon', zonas: [{ c: [0.68, 0.975, 0.12], r: 0.06 }], dir: [-0.4, 0.3, -1] },
      { id: 'escotadura-troclear', nombre: 'escotadura troclear', sinonimos: ['incisura troclear', 'cavidad sigmoidea mayor', 'escotadura semilunar'], en: 'trochlear notch', zonas: cadena([[0.78, 0.965, 0.22], [0.76, 0.935, 0.27], [0.7, 0.915, 0.34]], 0.04, 2), dir: [-0.6, 0.2, 1] },
      { id: 'coronoides', nombre: 'apófisis coronoides del cúbito', sinonimos: ['apofisis coronoides', 'coronoides'], en: 'coronoid process', zonas: [{ c: [0.65, 0.91, 0.42], r: 0.04 }], dir: [-0.6, 0, 1] },
      { id: 'tuberosidad', nombre: 'tuberosidad del cúbito', sinonimos: ['tuberosidad cubital'], en: 'tuberosity of ulna', zonas: [{ c: [0.72, 0.86, 0.38], r: 0.03 }], dir: [0.3, -0.2, 1] },
      { id: 'escotadura-radial', nombre: 'escotadura radial del cúbito', sinonimos: ['incisura radial', 'cavidad sigmoidea menor'], en: 'radial notch', zonas: [{ c: [0.57, 0.9, 0.4], r: 0.03 }], dir: [-1, 0, 0.4] },
      { id: 'supinador', nombre: 'cresta del músculo supinador', sinonimos: ['cresta del supinador'], en: 'supinator crest', zonas: cadena([[0.5, 0.875, 0.24], [0.49, 0.85, 0.21], [0.5, 0.82, 0.19]], 0.022, 2), dir: [-1, 0, 0] },
      { id: 'cabeza-cubito', nombre: 'cabeza del cúbito', sinonimos: ['cabeza cubital', 'cabeza'], en: 'head of ulna', zonas: [{ c: [0.12, 0.05, 0.94], r: 0.05 }], dir: [0.2, 0, 1] },
      { id: 'circunferencia-cubito', nombre: 'circunferencia articular del cúbito', sinonimos: ['circunferencia articular'], en: 'articular circumference of ulna', zonas: [{ c: [0.06, 0.045, 0.95], r: 0.035, cara: [-1, 0, 0.3] }], dir: [-0.7, 0, 1] },
      { id: 'estiloides-cubito', nombre: 'apófisis estiloides del cúbito', sinonimos: ['estiloides cubital', 'apofisis estiloides'], en: 'ulnar styloid process', zonas: [{ c: [0.21, 0.012, 0.88], r: 0.03 }], dir: [0.6, -0.2, 1] },
    ],
  },
  {
    id: 'radio',
    nombre: 'Radio',
    en: 'Radius',
    region: 'superior',
    seccion: 'Miembro superior',
    huesos: ['FMA23464', 'FMA23465'],
    partes: [
      { id: 'cabeza', nombre: 'cabeza del radio', sinonimos: ['cabeza radial', 'cabeza'], en: 'head of radius', zonas: [{ c: [0.82, 0.975, 0.28], r: [3, 0.03, 3], norm: true }], dir: [0, 0.4, 1] },
      { id: 'circunferencia', nombre: 'circunferencia articular del radio', sinonimos: ['circunferencia articular'], en: 'articular circumference of radius', zonas: [{ c: [0.82, 0.968, 0.28], r: [3, 0.014, 3], norm: true }], dir: [0, 0.1, 1] },
      { id: 'cuello', nombre: 'cuello del radio', sinonimos: ['cuello radial', 'cuello'], en: 'neck of radius', zonas: [{ c: [0.82, 0.93, 0.3], r: [3, 0.017, 3], norm: true }], dir: [0, 0, 1] },
      { id: 'tuberosidad', nombre: 'tuberosidad del radio (bicipital)', sinonimos: ['tuberosidad bicipital', 'tuberosidad radial'], en: 'radial tuberosity', enSin: ['bicipital tuberosity'], zonas: [{ c: [0.82, 0.855, 0.36], r: 0.04 }], dir: [0.7, 0, 1] },
      { id: 'borde-interoseo', nombre: 'borde interóseo del radio', sinonimos: ['borde interoseo', 'borde medial del radio'], en: 'interosseous border of radius', zonas: cadena([[0.53, 0.27, 0.59], [0.58, 0.4, 0.49], [0.68, 0.54, 0.42], [0.76, 0.66, 0.37]], 0.022, 2), dir: [1, 0, 0.3] },
      { id: 'estiloides', nombre: 'apófisis estiloides del radio', sinonimos: ['estiloides radial', 'apofisis estiloides'], en: 'radial styloid process', zonas: [{ c: [0.07, 0.015, 0.9], r: 0.035 }], dir: [-1, -0.2, 0.5] },
      { id: 'tuberculo-dorsal', nombre: 'tubérculo dorsal del radio', sinonimos: ['tuberculo de lister', 'tuberculo dorsal'], en: 'dorsal tubercle', enSin: ["Lister's tubercle"], zonas: [{ c: [0.26, 0.045, 0.65], r: 0.025 }], dir: [0, 0, -1] },
      { id: 'canales', nombre: 'canales para los tendones extensores', sinonimos: ['canales de los extensores', 'surcos de los extensores'], en: 'grooves for extensor tendons', zonas: [{ c: [0.39, 0.042, 0.7], r: 0.025, cara: [0, 0, -1] }, { c: [0.1, 0.042, 0.75], r: 0.025, cara: [0, 0, -1] }], dir: [0, 0, -1] },
      { id: 'escotadura-cubital', nombre: 'escotadura cubital del radio', sinonimos: ['incisura cubital', 'cavidad sigmoidea del radio'], en: 'ulnar notch', zonas: [{ c: [0.53, 0.04, 0.92], r: 0.035, cara: [1, 0, 0] }], dir: [1, -0.2, 0.3] },
      { id: 'carpiana', nombre: 'cara articular carpiana', sinonimos: ['superficie articular carpiana', 'cara carpiana'], en: 'carpal articular surface', zonas: [{ c: [0.3, 0, 0.8], r: [0.6, 0.05, 3], norm: true, cara: [0, -1, 0] }], dir: [0, -1, 0.4] },
      { id: 'carilla-semilunar', nombre: 'superficie cuadrangular para el semilunar', sinonimos: ['carilla para el semilunar', 'superficie para el semilunar'], en: 'facet for lunate', zonas: [{ c: [0.42, 0.02, 0.82], r: 0.035, cara: [0, -1, 0] }], dir: [0.2, -1, 0.4] },
      { id: 'carilla-escafoides', nombre: 'superficie triangular para el escafoides', sinonimos: ['carilla para el escafoides', 'superficie para el escafoides'], en: 'facet for scaphoid', zonas: [{ c: [0.18, 0.015, 0.85], r: 0.04, cara: [0, -1, 0] }], dir: [-0.2, -1, 0.4] },
    ],
  },
  {
    id: 'carpo',
    nombre: 'Carpo',
    en: 'Carpus',
    region: 'superior',
    seccion: 'Miembro superior',
    huesos: ['FMA24435', 'FMA24437', 'FMA24439', 'FMA24441', 'FMA24443', 'FMA23725', 'FMA24446', 'FMA24448'],
    conjunto: true,
    partes: [
      { id: 'escafoides', nombre: 'escafoides', sinonimos: ['escafoides de la mano','navicular de la mano'], en: 'scaphoid', zonas: { FMA24435: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [-0.3, 0.2, 1] },
      { id: 'tuberculo-escafoides', nombre: 'tubérculo del escafoides', sinonimos: ['tuberculo del escafoides'], en: 'scaphoid tubercle', zonas: { FMA24435: [{ c: [0.1, 0.5, 0.9], r: 0.25 }] }, dir: [-0.5, 0, 1] },
      { id: 'escafoides-radio', nombre: 'superficie del escafoides para el radio', sinonimos: ['carilla del escafoides para el radio'], en: 'radial facet of scaphoid', zonas: { FMA24435: [{ c: [0.418, 0.772, 0.323], r: 0.45, cara: [-0.42, 0.7, -0.58] }] }, dir: [-0.3, 1, -0.4] },
      { id: 'escafoides-grande', nombre: 'superficie del escafoides para el grande', sinonimos: ['carilla del escafoides para el grande'], en: 'capitate facet of scaphoid', zonas: { FMA24435: [{ c: [0.602, 0.323, 0.396], r: 0.4, cara: [0.44, -0.87, 0.22] }] }, dir: [0.5, -0.6, 1] },
      { id: 'semilunar', nombre: 'semilunar', sinonimos: ['hueso semilunar'], en: 'lunate', zonas: { FMA24437: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0, 0.2, 1] },
      { id: 'semilunar-radio', nombre: 'superficie del semilunar para el radio', sinonimos: ['carilla del semilunar para el radio'], en: 'radial facet of lunate', zonas: { FMA24437: [{ c: [0.4, 0.75, 0.4], r: 0.55, cara: [-0.3, 0.9, -0.3] }] }, dir: [0, 1, -0.3] },
      { id: 'semilunar-grande', nombre: 'superficie del semilunar para el grande', sinonimos: ['carilla del semilunar para el grande'], en: 'capitate facet of lunate', zonas: { FMA24437: [{ c: [0.13, 0.31, 0.475], r: 0.45, cara: [-0.82, -0.54, 0.2] }] }, dir: [-0.4, -0.6, 1] },
      { id: 'piramidal', nombre: 'piramidal', sinonimos: ['hueso piramidal'], en: 'triquetrum', zonas: { FMA24439: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0.6, 0, 1] },
      { id: 'pisiforme', nombre: 'pisiforme', sinonimos: ['hueso pisiforme'], en: 'pisiform', zonas: { FMA24441: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0.5, 0, 1] },
      { id: 'pisiforme-piramidal', nombre: 'superficie articular del pisiforme (para el piramidal)', sinonimos: ['carilla del pisiforme','superficie articular circular del pisiforme'], en: 'triquetral facet of pisiform', zonas: { FMA24441: [{ c: [0.558, 0.418, 0.231], r: 0.5, cara: [-0.18, -0.35, -0.92] }] }, dir: [0.5, 0, -1] },
      { id: 'trapecio', nombre: 'trapecio', sinonimos: ['trapecio mayor'], en: 'trapezium', zonas: { FMA24443: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [-0.5, 0, 1] },
      { id: 'trapecio-silla', nombre: 'superficie en silla de montar del trapecio (para el 1er metacarpiano)', sinonimos: ['silla de montar','carilla del trapecio para el primer metacarpiano'], en: 'saddle facet of trapezium', zonas: { FMA24443: [{ c: [0.252, 0.375, 0.643], r: 0.45, cara: [-0.7, -0.5, 0.51] }] }, dir: [-0.7, -0.6, 0.6] },
      { id: 'trapezoide', nombre: 'trapezoide', sinonimos: ['trapecio menor'], en: 'trapezoid', zonas: { FMA23725: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [-0.2, 0, 1] },
      { id: 'grande', nombre: 'hueso grande', sinonimos: ['grande','capitato'], en: 'capitate', zonas: { FMA24446: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0, 0, 1] },
      { id: 'cabeza-grande', nombre: 'cabeza del hueso grande', sinonimos: ['cabeza del grande'], en: 'head of capitate', zonas: { FMA24446: [{ c: [0.48, 0.92, 0.55], r: [3, 0.22, 3], norm: true }] }, dir: [0.3, 0.5, 1] },
      { id: 'grande-m3', nombre: 'superficie del grande para el 3er metacarpiano', sinonimos: ['carilla del grande para el tercer metacarpiano'], en: 'facet of capitate for 3rd metacarpal', zonas: { FMA24446: [{ c: [0.389, 0.093, 0.516], r: 0.4, cara: [-0.16, -0.93, 0.33] }] }, dir: [0, -1, 0.5] },
      { id: 'ganchoso', nombre: 'ganchoso', sinonimos: ['hueso ganchoso','unciforme'], en: 'hamate', zonas: { FMA24448: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0.4, 0, 1] },
      { id: 'gancho', nombre: 'gancho del ganchoso', sinonimos: ['apofisis unciforme','gancho'], en: 'hook of hamate', zonas: { FMA24448: [{ c: [0.43, 0.51, 1], r: 0.3 }] }, dir: [0.6, 0, 1] },
      { id: 'ganchoso-grande', nombre: 'superficie del ganchoso para el grande', sinonimos: ['carilla del ganchoso para el grande'], en: 'capitate facet of hamate', zonas: { FMA24448: [{ c: [0.138, 0.522, 0.195], r: 0.45, cara: [-0.98, 0.14, -0.12] }] }, dir: [-1, 0.2, -0.4] },
      { id: 'ganchoso-m45', nombre: 'superficie del ganchoso para el 4º y 5º metacarpianos', sinonimos: ['carilla del ganchoso para los metacarpianos'], en: 'facet of hamate for 4th and 5th metacarpals', zonas: { FMA24448: [{ c: [0.477, 0.172, 0.437], r: 0.45, cara: [-0.02, -0.94, 0.34] }] }, dir: [0.3, -1, 0.5] },
    ],
  },
  {
    id: 'metacarpianos',
    nombre: 'Metacarpianos',
    en: 'Metacarpals',
    region: 'superior',
    seccion: 'Miembro superior',
    huesos: ['FMA24464', 'FMA24466', 'FMA24468', 'FMA24470', 'FMA24472'],
    conjunto: true,
    partes: [
      { id: 'base', nombre: 'base del metacarpiano', sinonimos: ['base','base de los metacarpianos'], en: 'base of metacarpal', zonas: { FMA24464: [{ c: [0.873, 0.825, 0.252], r: 0.28 }], FMA24466: [{ c: [0.757, 0.914, 0.296], r: 0.231 }], FMA24468: [{ c: [0.649, 0.919, 0.209], r: 0.233 }], FMA24470: [{ c: [0.336, 0.899, 0.214], r: 0.223 }], FMA24472: [{ c: [0.292, 0.912, 0.248], r: 0.227 }] }, dir: [0, 0.3, 1] },
      { id: 'cuerpo', nombre: 'cuerpo del metacarpiano', sinonimos: ['cuerpo','diafisis del metacarpiano'], en: 'shaft of metacarpal', zonas: { FMA24464: [{ c: [0.679, 0.647, 0.401], r: 0.178 }, { c: [0.6, 0.575, 0.462], r: 0.178 }, { c: [0.52, 0.502, 0.524], r: 0.178 }, { c: [0.441, 0.429, 0.585], r: 0.178 }, { c: [0.362, 0.357, 0.646], r: 0.178 }], FMA24466: [{ c: [0.625, 0.688, 0.425], r: 0.147 }, { c: [0.571, 0.596, 0.477], r: 0.147 }, { c: [0.517, 0.503, 0.529], r: 0.147 }, { c: [0.463, 0.41, 0.582], r: 0.147 }, { c: [0.409, 0.318, 0.634], r: 0.147 }], FMA24468: [{ c: [0.573, 0.691, 0.37], r: 0.148 }, { c: [0.541, 0.598, 0.436], r: 0.148 }, { c: [0.51, 0.504, 0.502], r: 0.148 }, { c: [0.479, 0.411, 0.567], r: 0.148 }, { c: [0.447, 0.318, 0.633], r: 0.148 }], FMA24470: [{ c: [0.388, 0.676, 0.347], r: 0.142 }, { c: [0.409, 0.585, 0.402], r: 0.142 }, { c: [0.429, 0.493, 0.457], r: 0.142 }, { c: [0.45, 0.402, 0.511], r: 0.142 }, { c: [0.471, 0.311, 0.566], r: 0.142 }], FMA24472: [{ c: [0.408, 0.688, 0.401], r: 0.144 }, { c: [0.456, 0.596, 0.463], r: 0.144 }, { c: [0.504, 0.505, 0.526], r: 0.144 }, { c: [0.551, 0.413, 0.588], r: 0.144 }, { c: [0.599, 0.321, 0.65], r: 0.144 }] }, dir: [0, 0, 1] },
      { id: 'concavidad', nombre: 'concavidad longitudinal palmar del metacarpiano', sinonimos: ['concavidad palmar','concavidad longitudinal'], en: 'palmar longitudinal concavity', zonas: { FMA24464: [{ c: [0.679, 0.647, 0.401], r: 0.178, cara: [0.31, 0.28, 0.91] }, { c: [0.6, 0.575, 0.462], r: 0.178, cara: [0.31, 0.28, 0.91] }, { c: [0.52, 0.502, 0.524], r: 0.178, cara: [0.31, 0.28, 0.91] }, { c: [0.441, 0.429, 0.585], r: 0.178, cara: [0.31, 0.28, 0.91] }, { c: [0.362, 0.357, 0.646], r: 0.178, cara: [0.31, 0.28, 0.91] }], FMA24466: [{ c: [0.625, 0.688, 0.425], r: 0.147, cara: [0.05, 0.2, 0.98] }, { c: [0.571, 0.596, 0.477], r: 0.147, cara: [0.05, 0.2, 0.98] }, { c: [0.517, 0.503, 0.529], r: 0.147, cara: [0.05, 0.2, 0.98] }, { c: [0.463, 0.41, 0.582], r: 0.147, cara: [0.05, 0.2, 0.98] }, { c: [0.409, 0.318, 0.634], r: 0.147, cara: [0.05, 0.2, 0.98] }], FMA24468: [{ c: [0.573, 0.691, 0.37], r: 0.148, cara: [0.03, 0.31, 0.95] }, { c: [0.541, 0.598, 0.436], r: 0.148, cara: [0.03, 0.31, 0.95] }, { c: [0.51, 0.504, 0.502], r: 0.148, cara: [0.03, 0.31, 0.95] }, { c: [0.479, 0.411, 0.567], r: 0.148, cara: [0.03, 0.31, 0.95] }, { c: [0.447, 0.318, 0.633], r: 0.148, cara: [0.03, 0.31, 0.95] }], FMA24470: [{ c: [0.388, 0.676, 0.347], r: 0.142, cara: [-0.01, 0.25, 0.97] }, { c: [0.409, 0.585, 0.402], r: 0.142, cara: [-0.01, 0.25, 0.97] }, { c: [0.429, 0.493, 0.457], r: 0.142, cara: [-0.01, 0.25, 0.97] }, { c: [0.45, 0.402, 0.511], r: 0.142, cara: [-0.01, 0.25, 0.97] }, { c: [0.471, 0.311, 0.566], r: 0.142, cara: [-0.01, 0.25, 0.97] }], FMA24472: [{ c: [0.408, 0.688, 0.401], r: 0.144, cara: [-0.05, 0.28, 0.96] }, { c: [0.456, 0.596, 0.463], r: 0.144, cara: [-0.05, 0.28, 0.96] }, { c: [0.504, 0.505, 0.526], r: 0.144, cara: [-0.05, 0.28, 0.96] }, { c: [0.551, 0.413, 0.588], r: 0.144, cara: [-0.05, 0.28, 0.96] }, { c: [0.599, 0.321, 0.65], r: 0.144, cara: [-0.05, 0.28, 0.96] }] }, dir: [0, 0.2, 1] },
      { id: 'cabeza', nombre: 'cabeza del metacarpiano', sinonimos: ['cabeza','cabeza de los metacarpianos'], en: 'head of metacarpal', zonas: { FMA24464: [{ c: [0.168, 0.179, 0.795], r: 0.254 }], FMA24466: [{ c: [0.277, 0.092, 0.763], r: 0.21 }], FMA24468: [{ c: [0.371, 0.09, 0.794], r: 0.211 }], FMA24470: [{ c: [0.523, 0.087, 0.699], r: 0.203 }], FMA24472: [{ c: [0.715, 0.097, 0.803], r: 0.206 }] }, dir: [0, -0.3, 1] },
    ],
  },
  {
    id: 'falanges-mano',
    nombre: 'Falanges de la mano',
    en: 'Phalanges of the hand',
    region: 'superior',
    seccion: 'Miembro superior',
    huesos: ['FMA24450', 'FMA24451', 'FMA24452', 'FMA24453', 'FMA24454', 'FMA24455', 'FMA24456', 'FMA24457', 'FMA24458', 'FMA24459', 'FMA24460', 'FMA24461', 'FMA24462', 'FMA24463'],
    conjunto: true,
    partes: [
      { id: 'proximales', nombre: 'falanges proximales', sinonimos: ['falange proximal','primera falange','falange'], en: 'proximal phalanges', zonas: { FMA24450: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA24451: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA24452: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA24453: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA24454: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0, 0, 1] },
      { id: 'medias', nombre: 'falanges medias', sinonimos: ['falange media','segunda falange','falangina'], en: 'middle phalanges', zonas: { FMA24455: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA24456: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA24457: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA24458: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0, 0, 1] },
      { id: 'distales', nombre: 'falanges distales', sinonimos: ['falange distal','tercera falange','falangeta'], en: 'distal phalanges', zonas: { FMA24459: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA24460: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA24461: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA24462: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA24463: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0, 0, 1] },
      { id: 'base', nombre: 'base de la falange', sinonimos: ['base'], en: 'base of phalanx', zonas: { FMA24450: [{ c: [0.697, 0.852, 0.323], r: 0.218 }], FMA24451: [{ c: [0.644, 0.887, 0.225], r: 0.236 }], FMA24452: [{ c: [0.57, 0.878, 0.182], r: 0.244 }], FMA24453: [{ c: [0.466, 0.9, 0.242], r: 0.237 }], FMA24454: [{ c: [0.509, 0.894, 0.265], r: 0.232 }], FMA24455: [{ c: [0.645, 0.796, 0.188], r: 0.266 }], FMA24456: [{ c: [0.613, 0.85, 0.182], r: 0.265 }], FMA24457: [{ c: [0.628, 0.872, 0.212], r: 0.272 }], FMA24458: [{ c: [0.42, 0.825, 0.221], r: 0.254 }], FMA24459: [{ c: [0.712, 0.862, 0.337], r: 0.236 }], FMA24460: [{ c: [0.549, 0.841, 0.176], r: 0.249 }], FMA24461: [{ c: [0.526, 0.778, 0.148], r: 0.237 }], FMA24462: [{ c: [0.612, 0.71, 0.13], r: 0.226 }], FMA24463: [{ c: [0.451, 0.82, 0.156], r: 0.26 }] }, dir: [0, 0.3, 1] },
      { id: 'base-condilea', nombre: 'base condílea de la falange proximal', sinonimos: ['base de la falange proximal','cavidad glenoidea de la falange proximal'], en: 'base of proximal phalanx', zonas: { FMA24450: [{ c: [0.697, 0.852, 0.323], r: 0.218 }], FMA24451: [{ c: [0.644, 0.887, 0.225], r: 0.236 }], FMA24452: [{ c: [0.57, 0.878, 0.182], r: 0.244 }], FMA24453: [{ c: [0.466, 0.9, 0.242], r: 0.237 }], FMA24454: [{ c: [0.509, 0.894, 0.265], r: 0.232 }] }, dir: [0, 0.3, 1] },
      { id: 'base-troclear', nombre: 'base troclear de las falanges media y distal', sinonimos: ['base de la falange media','base de la falange distal'], en: 'base of middle and distal phalanges', zonas: { FMA24455: [{ c: [0.645, 0.796, 0.188], r: 0.266 }], FMA24456: [{ c: [0.613, 0.85, 0.182], r: 0.265 }], FMA24457: [{ c: [0.628, 0.872, 0.212], r: 0.272 }], FMA24458: [{ c: [0.42, 0.825, 0.221], r: 0.254 }], FMA24459: [{ c: [0.712, 0.862, 0.337], r: 0.236 }], FMA24460: [{ c: [0.549, 0.841, 0.176], r: 0.249 }], FMA24461: [{ c: [0.526, 0.778, 0.148], r: 0.237 }], FMA24462: [{ c: [0.612, 0.71, 0.13], r: 0.226 }], FMA24463: [{ c: [0.451, 0.82, 0.156], r: 0.26 }] }, dir: [0, 0.3, 1] },
      { id: 'cuerpo', nombre: 'cuerpo de la falange', sinonimos: ['cuerpo','diafisis de la falange'], en: 'shaft of phalanx', zonas: { FMA24450: [{ c: [0.553, 0.659, 0.441], r: 0.139 }, { c: [0.494, 0.581, 0.489], r: 0.139 }, { c: [0.435, 0.502, 0.536], r: 0.139 }, { c: [0.377, 0.423, 0.584], r: 0.139 }, { c: [0.318, 0.345, 0.632], r: 0.139 }], FMA24451: [{ c: [0.517, 0.674, 0.399], r: 0.15 }, { c: [0.466, 0.587, 0.47], r: 0.15 }, { c: [0.414, 0.5, 0.541], r: 0.15 }, { c: [0.362, 0.413, 0.613], r: 0.15 }, { c: [0.311, 0.326, 0.684], r: 0.15 }], FMA24452: [{ c: [0.494, 0.664, 0.373], r: 0.155 }, { c: [0.463, 0.576, 0.452], r: 0.155 }, { c: [0.432, 0.488, 0.53], r: 0.155 }, { c: [0.402, 0.401, 0.608], r: 0.155 }, { c: [0.371, 0.313, 0.687], r: 0.155 }], FMA24453: [{ c: [0.43, 0.679, 0.414], r: 0.151 }, { c: [0.415, 0.589, 0.485], r: 0.151 }, { c: [0.4, 0.499, 0.555], r: 0.151 }, { c: [0.386, 0.408, 0.625], r: 0.151 }, { c: [0.371, 0.318, 0.696], r: 0.151 }], FMA24454: [{ c: [0.561, 0.673, 0.427], r: 0.148 }, { c: [0.582, 0.583, 0.493], r: 0.148 }, { c: [0.603, 0.493, 0.559], r: 0.148 }, { c: [0.623, 0.402, 0.625], r: 0.148 }, { c: [0.644, 0.312, 0.691], r: 0.148 }], FMA24455: [{ c: [0.521, 0.618, 0.387], r: 0.169 }, { c: [0.471, 0.545, 0.469], r: 0.169 }, { c: [0.42, 0.472, 0.55], r: 0.169 }, { c: [0.369, 0.399, 0.631], r: 0.169 }, { c: [0.319, 0.326, 0.713], r: 0.169 }], FMA24456: [{ c: [0.54, 0.647, 0.381], r: 0.169 }, { c: [0.51, 0.564, 0.462], r: 0.169 }, { c: [0.481, 0.48, 0.543], r: 0.169 }, { c: [0.451, 0.397, 0.625], r: 0.169 }, { c: [0.421, 0.314, 0.706], r: 0.169 }], FMA24457: [{ c: [0.553, 0.662, 0.402], r: 0.173 }, { c: [0.522, 0.576, 0.48], r: 0.173 }, { c: [0.492, 0.49, 0.558], r: 0.173 }, { c: [0.461, 0.405, 0.636], r: 0.173 }, { c: [0.43, 0.319, 0.714], r: 0.173 }], FMA24458: [{ c: [0.53, 0.627, 0.407], r: 0.161 }, { c: [0.575, 0.546, 0.483], r: 0.161 }, { c: [0.619, 0.465, 0.559], r: 0.161 }, { c: [0.664, 0.384, 0.635], r: 0.161 }, { c: [0.709, 0.303, 0.711], r: 0.161 }], FMA24459: [{ c: [0.551, 0.654, 0.474], r: 0.15 }, { c: [0.485, 0.568, 0.531], r: 0.15 }, { c: [0.419, 0.483, 0.587], r: 0.15 }, { c: [0.353, 0.398, 0.643], r: 0.15 }, { c: [0.287, 0.312, 0.7], r: 0.15 }], FMA24460: [{ c: [0.501, 0.643, 0.38], r: 0.158 }, { c: [0.481, 0.562, 0.464], r: 0.158 }, { c: [0.461, 0.481, 0.547], r: 0.158 }, { c: [0.441, 0.4, 0.631], r: 0.158 }, { c: [0.421, 0.319, 0.715], r: 0.158 }], FMA24461: [{ c: [0.487, 0.603, 0.356], r: 0.151 }, { c: [0.471, 0.531, 0.442], r: 0.151 }, { c: [0.455, 0.46, 0.527], r: 0.151 }, { c: [0.439, 0.389, 0.612], r: 0.151 }, { c: [0.423, 0.317, 0.698], r: 0.151 }], FMA24462: [{ c: [0.541, 0.551, 0.344], r: 0.144 }, { c: [0.512, 0.486, 0.432], r: 0.144 }, { c: [0.484, 0.421, 0.52], r: 0.144 }, { c: [0.455, 0.356, 0.608], r: 0.144 }, { c: [0.426, 0.291, 0.696], r: 0.144 }], FMA24463: [{ c: [0.514, 0.627, 0.357], r: 0.166 }, { c: [0.54, 0.549, 0.439], r: 0.166 }, { c: [0.567, 0.47, 0.52], r: 0.166 }, { c: [0.593, 0.391, 0.602], r: 0.166 }, { c: [0.619, 0.313, 0.684], r: 0.166 }] }, dir: [0, 0, 1] },
      { id: 'concavidad', nombre: 'concavidad longitudinal palmar de la falange', sinonimos: ['concavidad palmar','concavidad longitudinal'], en: 'palmar longitudinal concavity of phalanx', zonas: { FMA24450: [{ c: [0.553, 0.659, 0.441], r: 0.139, cara: [0.15, 0.32, 0.93] }, { c: [0.494, 0.581, 0.489], r: 0.139, cara: [0.15, 0.32, 0.93] }, { c: [0.435, 0.502, 0.536], r: 0.139, cara: [0.15, 0.32, 0.93] }, { c: [0.377, 0.423, 0.584], r: 0.139, cara: [0.15, 0.32, 0.93] }, { c: [0.318, 0.345, 0.632], r: 0.139, cara: [0.15, 0.32, 0.93] }], FMA24451: [{ c: [0.517, 0.674, 0.399], r: 0.15, cara: [0.14, 0.4, 0.91] }, { c: [0.466, 0.587, 0.47], r: 0.15, cara: [0.14, 0.4, 0.91] }, { c: [0.414, 0.5, 0.541], r: 0.15, cara: [0.14, 0.4, 0.91] }, { c: [0.362, 0.413, 0.613], r: 0.15, cara: [0.14, 0.4, 0.91] }, { c: [0.311, 0.326, 0.684], r: 0.15, cara: [0.14, 0.4, 0.91] }], FMA24452: [{ c: [0.494, 0.664, 0.373], r: 0.155, cara: [0.08, 0.53, 0.85] }, { c: [0.463, 0.576, 0.452], r: 0.155, cara: [0.08, 0.53, 0.85] }, { c: [0.432, 0.488, 0.53], r: 0.155, cara: [0.08, 0.53, 0.85] }, { c: [0.402, 0.401, 0.608], r: 0.155, cara: [0.08, 0.53, 0.85] }, { c: [0.371, 0.313, 0.687], r: 0.155, cara: [0.08, 0.53, 0.85] }], FMA24453: [{ c: [0.43, 0.679, 0.414], r: 0.151, cara: [0.03, 0.46, 0.89] }, { c: [0.415, 0.589, 0.485], r: 0.151, cara: [0.03, 0.46, 0.89] }, { c: [0.4, 0.499, 0.555], r: 0.151, cara: [0.03, 0.46, 0.89] }, { c: [0.386, 0.408, 0.625], r: 0.151, cara: [0.03, 0.46, 0.89] }, { c: [0.371, 0.318, 0.696], r: 0.151, cara: [0.03, 0.46, 0.89] }], FMA24454: [{ c: [0.561, 0.673, 0.427], r: 0.148, cara: [-0.04, 0.41, 0.91] }, { c: [0.582, 0.583, 0.493], r: 0.148, cara: [-0.04, 0.41, 0.91] }, { c: [0.603, 0.493, 0.559], r: 0.148, cara: [-0.04, 0.41, 0.91] }, { c: [0.623, 0.402, 0.625], r: 0.148, cara: [-0.04, 0.41, 0.91] }, { c: [0.644, 0.312, 0.691], r: 0.148, cara: [-0.04, 0.41, 0.91] }], FMA24455: [{ c: [0.521, 0.618, 0.387], r: 0.169, cara: [0.32, 0.64, 0.7] }, { c: [0.471, 0.545, 0.469], r: 0.169, cara: [0.32, 0.64, 0.7] }, { c: [0.42, 0.472, 0.55], r: 0.169, cara: [0.32, 0.64, 0.7] }, { c: [0.369, 0.399, 0.631], r: 0.169, cara: [0.32, 0.64, 0.7] }, { c: [0.319, 0.326, 0.713], r: 0.169, cara: [0.32, 0.64, 0.7] }], FMA24456: [{ c: [0.54, 0.647, 0.381], r: 0.169, cara: [0.12, 0.65, 0.75] }, { c: [0.51, 0.564, 0.462], r: 0.169, cara: [0.12, 0.65, 0.75] }, { c: [0.481, 0.48, 0.543], r: 0.169, cara: [0.12, 0.65, 0.75] }, { c: [0.451, 0.397, 0.625], r: 0.169, cara: [0.12, 0.65, 0.75] }, { c: [0.421, 0.314, 0.706], r: 0.169, cara: [0.12, 0.65, 0.75] }], FMA24457: [{ c: [0.553, 0.662, 0.402], r: 0.173, cara: [0.11, 0.65, 0.75] }, { c: [0.522, 0.576, 0.48], r: 0.173, cara: [0.11, 0.65, 0.75] }, { c: [0.492, 0.49, 0.558], r: 0.173, cara: [0.11, 0.65, 0.75] }, { c: [0.461, 0.405, 0.636], r: 0.173, cara: [0.11, 0.65, 0.75] }, { c: [0.43, 0.319, 0.714], r: 0.173, cara: [0.11, 0.65, 0.75] }], FMA24458: [{ c: [0.53, 0.627, 0.407], r: 0.161, cara: [-0.19, 0.58, 0.79] }, { c: [0.575, 0.546, 0.483], r: 0.161, cara: [-0.19, 0.58, 0.79] }, { c: [0.619, 0.465, 0.559], r: 0.161, cara: [-0.19, 0.58, 0.79] }, { c: [0.664, 0.384, 0.635], r: 0.161, cara: [-0.19, 0.58, 0.79] }, { c: [0.709, 0.303, 0.711], r: 0.161, cara: [-0.19, 0.58, 0.79] }], FMA24459: [{ c: [0.551, 0.654, 0.474], r: 0.15, cara: [0.16, 0.34, 0.93] }, { c: [0.485, 0.568, 0.531], r: 0.15, cara: [0.16, 0.34, 0.93] }, { c: [0.419, 0.483, 0.587], r: 0.15, cara: [0.16, 0.34, 0.93] }, { c: [0.353, 0.398, 0.643], r: 0.15, cara: [0.16, 0.34, 0.93] }, { c: [0.287, 0.312, 0.7], r: 0.15, cara: [0.16, 0.34, 0.93] }], FMA24460: [{ c: [0.501, 0.643, 0.38], r: 0.158, cara: [0.14, 0.78, 0.61] }, { c: [0.481, 0.562, 0.464], r: 0.158, cara: [0.14, 0.78, 0.61] }, { c: [0.461, 0.481, 0.547], r: 0.158, cara: [0.14, 0.78, 0.61] }, { c: [0.441, 0.4, 0.631], r: 0.158, cara: [0.14, 0.78, 0.61] }, { c: [0.421, 0.319, 0.715], r: 0.158, cara: [0.14, 0.78, 0.61] }], FMA24461: [{ c: [0.487, 0.603, 0.356], r: 0.151, cara: [0.13, 0.83, 0.54] }, { c: [0.471, 0.531, 0.442], r: 0.151, cara: [0.13, 0.83, 0.54] }, { c: [0.455, 0.46, 0.527], r: 0.151, cara: [0.13, 0.83, 0.54] }, { c: [0.439, 0.389, 0.612], r: 0.151, cara: [0.13, 0.83, 0.54] }, { c: [0.423, 0.317, 0.698], r: 0.151, cara: [0.13, 0.83, 0.54] }], FMA24462: [{ c: [0.541, 0.551, 0.344], r: 0.144, cara: [0.33, 0.85, 0.41] }, { c: [0.512, 0.486, 0.432], r: 0.144, cara: [0.33, 0.85, 0.41] }, { c: [0.484, 0.421, 0.52], r: 0.144, cara: [0.33, 0.85, 0.41] }, { c: [0.455, 0.356, 0.608], r: 0.144, cara: [0.33, 0.85, 0.41] }, { c: [0.426, 0.291, 0.696], r: 0.144, cara: [0.33, 0.85, 0.41] }], FMA24463: [{ c: [0.514, 0.627, 0.357], r: 0.166, cara: [-0.15, 0.73, 0.67] }, { c: [0.54, 0.549, 0.439], r: 0.166, cara: [-0.15, 0.73, 0.67] }, { c: [0.567, 0.47, 0.52], r: 0.166, cara: [-0.15, 0.73, 0.67] }, { c: [0.593, 0.391, 0.602], r: 0.166, cara: [-0.15, 0.73, 0.67] }, { c: [0.619, 0.313, 0.684], r: 0.166, cara: [-0.15, 0.73, 0.67] }] }, dir: [0, 0.3, 1] },
      { id: 'cabeza', nombre: 'cabeza de la falange', sinonimos: ['cabeza'], en: 'head of phalanx', zonas: { FMA24450: [{ c: [0.174, 0.152, 0.75], r: 0.198 }], FMA24451: [{ c: [0.184, 0.113, 0.858], r: 0.214 }], FMA24452: [{ c: [0.295, 0.099, 0.878], r: 0.222 }], FMA24453: [{ c: [0.335, 0.097, 0.868], r: 0.215 }], FMA24454: [{ c: [0.696, 0.091, 0.853], r: 0.211 }], FMA24455: [{ c: [0.195, 0.148, 0.912], r: 0.242 }], FMA24456: [{ c: [0.348, 0.111, 0.905], r: 0.241 }], FMA24457: [{ c: [0.355, 0.109, 0.904], r: 0.248 }], FMA24458: [{ c: [0.819, 0.105, 0.897], r: 0.231 }], FMA24459: [{ c: [0.126, 0.104, 0.837], r: 0.214 }], FMA24460: [{ c: [0.373, 0.121, 0.919], r: 0.226 }], FMA24461: [{ c: [0.384, 0.142, 0.906], r: 0.215 }], FMA24462: [{ c: [0.355, 0.132, 0.91], r: 0.205 }], FMA24463: [{ c: [0.682, 0.12, 0.885], r: 0.237 }] }, dir: [0, -0.2, 1] },
      { id: 'troclea', nombre: 'tróclea de la cabeza (falanges proximal y media)', sinonimos: ['troclea','cabeza troclear','troclea de la falange'], en: 'trochlea of head of phalanx', zonas: { FMA24450: [{ c: [0.174, 0.152, 0.75], r: 0.198 }], FMA24451: [{ c: [0.184, 0.113, 0.858], r: 0.214 }], FMA24452: [{ c: [0.295, 0.099, 0.878], r: 0.222 }], FMA24453: [{ c: [0.335, 0.097, 0.868], r: 0.215 }], FMA24454: [{ c: [0.696, 0.091, 0.853], r: 0.211 }], FMA24455: [{ c: [0.195, 0.148, 0.912], r: 0.242 }], FMA24456: [{ c: [0.348, 0.111, 0.905], r: 0.241 }], FMA24457: [{ c: [0.355, 0.109, 0.904], r: 0.248 }], FMA24458: [{ c: [0.819, 0.105, 0.897], r: 0.231 }] }, dir: [0, -0.2, 1] },
      { id: 'tuberosidad', nombre: 'tuberosidad de la falange distal', sinonimos: ['tuberosidad distal','tuberosidad ungueal','penacho'], en: 'tuberosity of distal phalanx', enSin: ['ungual tuberosity'], zonas: { FMA24459: [{ c: [0.126, 0.104, 0.837], r: 0.214 }], FMA24460: [{ c: [0.373, 0.121, 0.919], r: 0.226 }], FMA24461: [{ c: [0.384, 0.142, 0.906], r: 0.215 }], FMA24462: [{ c: [0.355, 0.132, 0.91], r: 0.205 }], FMA24463: [{ c: [0.682, 0.12, 0.885], r: 0.237 }] }, dir: [0, -0.2, 1] },
    ],
  },
  // ======================= MIEMBRO INFERIOR =======================
  // coxal derecho: lateral x 0, arriba y 1, delante z 1. Medido con contactos (fémur, sacro) y perfiles de los bordes.
  {
    id: 'coxal',
    nombre: 'Coxal',
    en: 'Hip bone',
    region: 'inferior',
    seccion: 'Miembro inferior',
    huesos: ['FMA16586', 'FMA16587'],
    partes: [
      { id: 'acetabulo', nombre: 'acetábulo', sinonimos: ['acetabulo', 'cotilo', 'cavidad cotiloidea'], en: 'acetabulum', zonas: [{ c: [0.43, 0.29, 0.57], r: 0.15 }], dir: [-1, -0.2, 0.6] },
      { id: 'escotadura-acetabular', nombre: 'escotadura acetabular', sinonimos: ['escotadura del acetabulo', 'escotadura isquiopubica'], en: 'acetabular notch', zonas: [{ c: [0.55, 0.245, 0.62], r: 0.045 }], dir: [-0.7, -0.6, 0.5] },
      { id: 'semilunar', nombre: 'superficie semilunar del acetábulo', sinonimos: ['superficie semilunar', 'carilla semilunar', 'media luna articular'], en: 'lunate surface', zonas: [{ c: [0.43, 0.29, 0.57], r: 0.15 }, { c: [0.578, 0.329, 0.484], r: 0.055, menos: true }, { c: [0.55, 0.245, 0.62], r: 0.05, menos: true }], dir: [-1, -0.2, 0.6] },
      { id: 'fosa-acetabular', nombre: 'fosa acetabular', sinonimos: ['trasfondo del acetabulo', 'fosa del acetabulo'], en: 'acetabular fossa', zonas: [{ c: [0.578, 0.329, 0.484], r: 0.05 }], dir: [-1, -0.2, 0.6] },
      { id: 'cuerpo-ilion', nombre: 'cuerpo del ilion', sinonimos: ['cuerpo del ileon', 'cuerpo del hueso iliaco'], en: 'body of ilium', zonas: [{ c: [0.4, 0.47, 0.5], r: 0.1 }], dir: [-1, 0.2, 0.4] },
      { id: 'ala-ilion', nombre: 'ala del ilion', sinonimos: ['ala iliaca', 'ala del ileon'], en: 'wing of ilium', enSin: ['ala of ilium'], zonas: [{ c: [0.4, 0.8, 0.5], r: [3, 0.21, 3], norm: true }], dir: [-1, 0.3, 0.3] },
      { id: 'cresta', nombre: 'cresta ilíaca', sinonimos: ['cresta iliaca'], en: 'iliac crest', zonas: cadena([[0.63, 0.85, 0.09], [0.59, 0.91, 0.18], [0.47, 0.97, 0.3], [0.34, 1, 0.38], [0.21, 0.99, 0.5], [0.11, 0.96, 0.6], [0.1, 0.92, 0.7], [0.09, 0.86, 0.82], [0.1, 0.78, 0.92]], 0.03, 2), dir: [-1, 0.5, 0.1] },
      { id: 'tuberculo-cresta', nombre: 'tubérculo de la cresta ilíaca', sinonimos: ['tuberculo iliaco', 'tuberculo de la cresta'], en: 'iliac tubercle', enSin: ['tubercle of iliac crest'], zonas: [{ c: [0.025, 0.894, 0.679], r: 0.05 }], dir: [-1, 0.4, 0.3] },
      { id: 'eias', nombre: 'espina ilíaca anterosuperior', sinonimos: ['eias', 'espina iliaca anterior superior'], en: 'anterior superior iliac spine', enSin: ['ASIS'], zonas: [{ c: [0.12, 0.7, 0.99], r: 0.04 }], dir: [-0.6, 0.2, 1] },
      { id: 'eiai', nombre: 'espina ilíaca anteroinferior', sinonimos: ['eiai', 'espina iliaca anterior inferior'], en: 'anterior inferior iliac spine', enSin: ['AIIS'], zonas: [{ c: [0.26, 0.5, 0.81], r: 0.04 }], dir: [-0.6, 0, 1] },
      { id: 'eips', nombre: 'espina ilíaca posterosuperior', sinonimos: ['eips', 'espina iliaca posterior superior'], en: 'posterior superior iliac spine', enSin: ['PSIS'], zonas: [{ c: [0.71, 0.74, 0.01], r: 0.04 }], dir: [0, 0.2, -1] },
      { id: 'eipi', nombre: 'espina ilíaca posteroinferior', sinonimos: ['eipi', 'espina iliaca posterior inferior'], en: 'posterior inferior iliac spine', enSin: ['PIIS'], zonas: [{ c: [0.69, 0.58, 0.17], r: 0.035 }], dir: [-0.3, 0, -1] },
      { id: 'cuerpo-isquion', nombre: 'cuerpo del isquion', sinonimos: ['cuerpo isquiatico'], en: 'body of ischium', zonas: [{ c: [0.55, 0.2, 0.36], r: 0.08 }], dir: [-1, -0.3, -0.3] },
      { id: 'tuberosidad-isquiatica', nombre: 'tuberosidad isquiática', sinonimos: ['tuberosidad del isquion', 'tuberosidad isquiatica'], en: 'ischial tuberosity', zonas: [{ c: [0.62, 0.07, 0.26], r: 0.07 }], dir: [-0.3, -0.6, -1] },
      { id: 'rama-isquion', nombre: 'rama del isquion', sinonimos: ['rama isquiatica'], en: 'ramus of ischium', zonas: cadena([[0.72, 0.03, 0.42], [0.8, 0.03, 0.52], [0.86, 0.05, 0.62]], 0.045, 2), dir: [0.2, -1, 0.3] },
      { id: 'obturado', nombre: 'agujero obturado', sinonimos: ['agujero obturador', 'foramen obturador', 'agujero isquiopubiano'], en: 'obturator foramen', zonas: [{ c: [0.8, 0.17, 0.64], r: [0.1, 0.09, 0.1] }], dir: [-1, -0.2, 0.5] },
      { id: 'ciatica-mayor', nombre: 'escotadura ciática mayor', sinonimos: ['escotadura isquiatica mayor', 'gran escotadura ciatica'], en: 'greater sciatic notch', zonas: cadena([[0.66, 0.37, 0.27], [0.6, 0.42, 0.31], [0.56, 0.47, 0.34], [0.56, 0.51, 0.35], [0.66, 0.55, 0.24]], 0.035, 2), dir: [-0.4, 0, -1] },
      { id: 'espina-ciatica', nombre: 'espina ciática', sinonimos: ['espina isquiatica', 'espina del isquion'], en: 'ischial spine', enSin: ['sciatic spine'], zonas: [{ c: [0.69, 0.33, 0.24], r: 0.035 }], dir: [0, 0, -1] },
      { id: 'ciatica-menor', nombre: 'escotadura ciática menor', sinonimos: ['escotadura isquiatica menor', 'pequeña escotadura ciatica'], en: 'lesser sciatic notch', zonas: [{ c: [0.56, 0.25, 0.26], r: 0.035 }], dir: [-0.4, 0, -1] },
      { id: 'auricular', nombre: 'cara auricular del coxal', sinonimos: ['carilla auricular', 'superficie auricular', 'cara auricular'], en: 'auricular surface', zonas: [{ c: [0.671, 0.615, 0.326], r: 0.11, cara: [0.97, 0.05, 0.24] }], dir: [1, 0.1, 0.2] },
      { id: 'tuberosidad-iliaca', nombre: 'tuberosidad ilíaca', sinonimos: ['tuberosidad iliaca'], en: 'iliac tuberosity', zonas: [{ c: [0.7, 0.74, 0.16], r: 0.06 }, { c: [0.671, 0.615, 0.326], r: 0.08, menos: true }], dir: [1, 0.3, -0.3] },
      { id: 'fosa-iliaca', nombre: 'fosa ilíaca', sinonimos: ['fosa iliaca interna', 'fosa iliaca'], en: 'iliac fossa', zonas: [{ c: [0.45, 0.78, 0.6], r: 0.25, cara: [1, 0.2, 0.5] }, { c: [0.671, 0.615, 0.326], r: 0.12, menos: true }], dir: [1, 0.5, 0.5] },
      { id: 'linea-arqueada', nombre: 'línea arqueada', sinonimos: ['linea arcuata', 'linea innominada'], en: 'arcuate line', zonas: cadena([[0.701, 0.572, 0.344], [0.671, 0.555, 0.416], [0.632, 0.542, 0.429], [0.576, 0.484, 0.477], [0.578, 0.457, 0.523], [0.595, 0.428, 0.555], [0.622, 0.393, 0.627]], 0.03, 2), dir: [1, 0.4, 0.3] },
      { id: 'eminencia-iliopubica', nombre: 'eminencia iliopúbica', sinonimos: ['eminencia iliopectinea', 'eminencia ileopubica'], en: 'iliopubic eminence', enSin: ['iliopectineal eminence'], zonas: [{ c: [0.622, 0.393, 0.627], r: 0.04 }], dir: [0.4, 0.6, 1] },
      { id: 'rama-superior-pubis', nombre: 'rama superior del pubis', sinonimos: ['rama horizontal del pubis'], en: 'superior pubic ramus', zonas: cadena([[0.6, 0.35, 0.66], [0.7, 0.3, 0.8], [0.85, 0.25, 0.92]], 0.05, 2), dir: [0.3, 0.4, 1] },
      { id: 'rama-inferior-pubis', nombre: 'rama inferior del pubis', sinonimos: ['rama descendente del pubis'], en: 'inferior pubic ramus', zonas: cadena([[0.93, 0.17, 0.92], [0.93, 0.12, 0.82], [0.91, 0.08, 0.71]], 0.045, 2), dir: [0.5, -0.6, 1] },
    ],
  },
  {
    id: 'pelvis',
    nombre: 'Pelvis',
    en: 'Pelvis',
    region: 'inferior',
    seccion: 'Miembro inferior',
    huesos: ['FMA16586', 'FMA16587', SACRO, COCCIX],
    conjunto: true,
    partes: [
      { id: 'cavidad', nombre: 'cavidad pelviana', sinonimos: ['cavidad pelvica'], en: 'pelvic cavity', zonas: { FMA16586: [{ c: [0.75, 0.27, 0.5], r: 0.22, cara: [1, 0, 0] }], FMA16587: [{ c: [0.75, 0.27, 0.5], r: 0.22, cara: [1, 0, 0] }], [SACRO]: [{ c: [0.5, 0.4, 0.5], r: [3, 0.42, 3], norm: true, cara: [0, -0.3, 1] }], [COCCIX]: TODO }, dir: [0, 0.8, 1] },
      { id: 'arco-pubis', nombre: 'arco del pubis (ángulo subpubiano)', sinonimos: ['arco del pubis', 'angulo subpubiano', 'arco pubiano'], en: 'pubic arch (subpubic angle)', enSin: ['pubic arch', 'subpubic angle'], zonas: { FMA16586: cadena([[0.95, 0.2, 0.93], [0.94, 0.12, 0.82], [0.9, 0.07, 0.7]], 0.045, 2), FMA16587: cadena([[0.95, 0.2, 0.93], [0.94, 0.12, 0.82], [0.9, 0.07, 0.7]], 0.045, 2) }, dir: [0, -0.4, 1] },
      { id: 'pelvis-mayor', nombre: 'pelvis mayor (falsa)', sinonimos: ['pelvis mayor', 'pelvis falsa', 'gran pelvis'], en: 'greater pelvis (false pelvis)', enSin: ['false pelvis', 'greater pelvis'], zonas: { FMA16586: [{ c: [0.45, 0.78, 0.6], r: 0.2, cara: [1, 0.3, 0.3] }], FMA16587: [{ c: [0.45, 0.78, 0.6], r: 0.2, cara: [1, 0.3, 0.3] }], [SACRO]: [{ c: [0.13, 0.9, 0.67], r: [0.13, 0.05, 0.15], sim: true }] }, dir: [0, 1, 0.8] },
      { id: 'pelvis-menor', nombre: 'pelvis menor (verdadera)', sinonimos: ['pelvis menor', 'pelvis verdadera', 'pequeña pelvis'], en: 'lesser pelvis (true pelvis)', enSin: ['true pelvis', 'lesser pelvis'], zonas: { FMA16586: [{ c: [0.75, 0.27, 0.5], r: 0.22, cara: [1, 0, 0] }], FMA16587: [{ c: [0.75, 0.27, 0.5], r: 0.22, cara: [1, 0, 0] }], [SACRO]: [{ c: [0.5, 0.4, 0.5], r: [3, 0.42, 3], norm: true, cara: [0, -0.3, 1] }], [COCCIX]: TODO }, dir: [0, 0.8, 1] },
      { id: 'linea-terminal', nombre: 'línea terminal', sinonimos: ['linea terminal', 'linea innominada'], en: 'linea terminalis', enSin: ['terminal line'], zonas: { FMA16586: cadena([[0.71, 0.57, 0.35], [0.65, 0.5, 0.48], [0.62, 0.39, 0.6], [0.66, 0.34, 0.72], [0.74, 0.29, 0.86], [0.85, 0.26, 0.93]], 0.045, 2), FMA16587: cadena([[0.71, 0.57, 0.35], [0.65, 0.5, 0.48], [0.62, 0.39, 0.6], [0.66, 0.34, 0.72], [0.74, 0.29, 0.86], [0.85, 0.26, 0.93]], 0.045, 2) }, dir: [0, 1, 0.35] },
      { id: 'pecten', nombre: 'pecten del pubis (cresta pectínea)', sinonimos: ['pecten del pubis', 'cresta pectinea', 'linea pectinea'], en: 'pecten pubis', enSin: ['pectineal line'], zonas: { FMA16586: cadena([[0.62, 0.39, 0.6], [0.66, 0.34, 0.72], [0.74, 0.29, 0.86], [0.82, 0.27, 0.9]], 0.04, 2), FMA16587: cadena([[0.62, 0.39, 0.6], [0.66, 0.34, 0.72], [0.74, 0.29, 0.86], [0.82, 0.27, 0.9]], 0.04, 2) }, dir: [0, 1, 0.35] },
      { id: 'estrecho-superior', nombre: 'estrecho superior de la pelvis', sinonimos: ['estrecho superior', 'abertura superior de la pelvis'], en: 'pelvic inlet', enSin: ['superior pelvic aperture'], zonas: { FMA16586: cadena([[0.71, 0.57, 0.35], [0.65, 0.5, 0.48], [0.62, 0.39, 0.6], [0.66, 0.34, 0.72], [0.74, 0.29, 0.86], [0.85, 0.26, 0.93]], 0.045, 2), FMA16587: cadena([[0.71, 0.57, 0.35], [0.65, 0.5, 0.48], [0.62, 0.39, 0.6], [0.66, 0.34, 0.72], [0.74, 0.29, 0.86], [0.85, 0.26, 0.93]], 0.045, 2), [SACRO]: [{ c: [0.5, 0.82, 0.97], r: [0.12, 0.035, 0.05] }, { c: [0.25, 0.88, 0.85], r: 0.05, sim: true }] }, dir: [0, 1, 0.35] },
      { id: 'estrecho-inferior', nombre: 'estrecho inferior de la pelvis', sinonimos: ['estrecho inferior', 'abertura inferior de la pelvis'], en: 'pelvic outlet', enSin: ['inferior pelvic aperture'], zonas: { FMA16586: [...cadena([[0.95, 0.2, 0.93], [0.93, 0.12, 0.82], [0.86, 0.05, 0.62], [0.72, 0.03, 0.42]], 0.045, 2), { c: [0.62, 0.07, 0.26], r: 0.07 }], FMA16587: [...cadena([[0.95, 0.2, 0.93], [0.93, 0.12, 0.82], [0.86, 0.05, 0.62], [0.72, 0.03, 0.42]], 0.045, 2), { c: [0.62, 0.07, 0.26], r: 0.07 }], [COCCIX]: TODO }, dir: [0, -1, 0.3] },
    ],
  },
  // fémur derecho (oblicuo: la cabeza arriba en x 0.4–0.72, los cóndilos abajo en x 0.35–1)
  {
    id: 'femur',
    nombre: 'Fémur',
    en: 'Femur',
    region: 'inferior',
    seccion: 'Miembro inferior',
    huesos: ['FMA24474', 'FMA24475'],
    partes: [
      { id: 'cabeza', nombre: 'cabeza del fémur', sinonimos: ['cabeza femoral', 'cabeza'], en: 'head of femur', enSin: ['femoral head'], zonas: [{ c: [0.54, 0.95, 0.48], r: 0.056 }], dir: [0.6, 0.3, 1] },
      { id: 'fovea', nombre: 'fosita de la cabeza del fémur', sinonimos: ['fovea capitis', 'fosita de la cabeza', 'fosita del ligamento redondo'], en: 'fovea of head of femur', enSin: ['fovea capitis'], zonas: [{ c: [0.724, 0.953, 0.507], r: 0.018 }], dir: [1, 0.2, 0.2] },
      { id: 'cuello', nombre: 'cuello del fémur', sinonimos: ['cuello femoral', 'cuello'], en: 'neck of femur', enSin: ['femoral neck'], zonas: [{ c: [0.35, 0.9, 0.47], r: 0.045 }, { c: [0.54, 0.95, 0.48], r: 0.05, menos: true }], dir: [0.2, 0.2, 1] },
      { id: 'trocanter-mayor', nombre: 'trocánter mayor', sinonimos: ['trocanter mayor'], en: 'greater trochanter', zonas: [{ c: [0.08, 0.92, 0.38], r: 0.05 }], dir: [-1, 0.3, 0.3] },
      { id: 'trocanter-menor', nombre: 'trocánter menor', sinonimos: ['trocanter menor'], en: 'lesser trochanter', zonas: [{ c: [0.456, 0.797, 0.161], r: 0.03 }], dir: [0.5, 0, -1] },
      { id: 'fosa-trocanterea', nombre: 'fosa trocantérea', sinonimos: ['fosa trocanterica', 'fosa digital'], en: 'trochanteric fossa', zonas: [{ c: [0.19, 0.927, 0.342], r: 0.035 }], dir: [0.3, 0.6, -1] },
      { id: 'linea-intertrocanterea', nombre: 'línea intertrocantérea', sinonimos: ['linea intertrocanterea', 'linea intertrocanterica'], en: 'intertrochanteric line', zonas: cadena([[0.117, 0.887, 0.63], [0.29, 0.829, 0.627], [0.441, 0.802, 0.441]], 0.022, 3), dir: [0, 0, 1] },
      { id: 'cresta-intertrocanterica', nombre: 'cresta intertrocantérica', sinonimos: ['cresta intertrocanterea'], en: 'intertrochanteric crest', zonas: cadena([[0.19, 0.91, 0.01], [0.257, 0.87, 0.012], [0.31, 0.84, 0.1], [0.41, 0.81, 0.12]], 0.022, 2), dir: [0, 0.2, -1] },
      { id: 'tuberculo-cuadrado', nombre: 'tubérculo cuadrado', sinonimos: ['tuberculo del cuadrado femoral'], en: 'quadrate tubercle', zonas: [{ c: [0.257, 0.87, 0.012], r: 0.022 }], dir: [0, 0.2, -1] },
      { id: 'agujero-nutricio', nombre: 'agujero nutricio del fémur', sinonimos: ['agujero nutricio', 'foramen nutricio'], en: 'nutrient foramen', zonas: [{ c: [0.43, 0.553, 0.482], r: 0.015 }], dir: [0, 0, -1] },
      { id: 'linea-aspera', nombre: 'línea áspera (labios medial y lateral)', sinonimos: ['linea aspera', 'labio medial', 'labio lateral'], en: 'linea aspera (medial and lateral lips)', enSin: ['linea aspera'], zonas: cadena([[0.52, 0.26, 0.5], [0.47, 0.38, 0.5], [0.44, 0.49, 0.48], [0.38, 0.62, 0.46], [0.35, 0.7, 0.39]], 0.016, 3), dir: [0, 0, -1] },
      { id: 'supracondilea-medial', nombre: 'línea supracondílea medial', sinonimos: ['linea supracondilea medial'], en: 'medial supracondylar line', zonas: cadena([[0.52, 0.26, 0.5], [0.731, 0.175, 0.545], [0.944, 0.098, 0.398]], 0.018, 3), dir: [0.3, 0, -1] },
      { id: 'supracondilea-lateral', nombre: 'línea supracondílea lateral', sinonimos: ['linea supracondilea lateral'], en: 'lateral supracondylar line', zonas: cadena([[0.52, 0.26, 0.5], [0.457, 0.172, 0.49], [0.33, 0.08, 0.42]], 0.018, 3), dir: [-0.3, 0, -1] },
      { id: 'poplitea', nombre: 'superficie poplítea', sinonimos: ['cara poplitea', 'triangulo popliteo'], en: 'popliteal surface', zonas: [{ c: [0.6, 0.16, 0.47], r: 0.05, cara: [0, 0, -1] }], dir: [0, 0, -1] },
      { id: 'rotuliana', nombre: 'superficie rotuliana (tróclea femoral)', sinonimos: ['troclea femoral', 'superficie patelar', 'superficie rotuliana'], en: 'patellar surface (trochlea)', enSin: ['patellar surface', 'femoral trochlea'], zonas: [{ c: [0.621, 0.07, 0.926], r: 0.05, cara: [0, -0.2, 1] }], dir: [0, -0.2, 1] },
      { id: 'condilo-medial', nombre: 'cóndilo medial del fémur', sinonimos: ['condilo medial', 'condilo interno'], en: 'medial condyle', zonas: [{ c: [0.83, 0.05, 0.42], r: 0.065 }], dir: [0.4, -0.4, -1] },
      { id: 'condilo-lateral', nombre: 'cóndilo lateral del fémur', sinonimos: ['condilo lateral', 'condilo externo'], en: 'lateral condyle', zonas: [{ c: [0.45, 0.05, 0.42], r: 0.065 }], dir: [-0.4, -0.4, -1] },
      { id: 'epicondilo-medial', nombre: 'epicóndilo medial del fémur', sinonimos: ['epicondilo medial', 'epicondilo interno'], en: 'medial epicondyle', zonas: [{ c: [0.99, 0.073, 0.32], r: 0.03 }], dir: [1, 0, 0.2] },
      { id: 'epicondilo-lateral', nombre: 'epicóndilo lateral del fémur', sinonimos: ['epicondilo lateral', 'epicondilo externo'], en: 'lateral epicondyle', zonas: [{ c: [0.32, 0.06, 0.44], r: 0.03 }], dir: [-1, 0, 0.2] },
      { id: 'aductor', nombre: 'tubérculo del aductor', sinonimos: ['tuberculo del aductor mayor', 'tuberculo aductor'], en: 'adductor tubercle', zonas: [{ c: [0.944, 0.1, 0.398], r: 0.02 }], dir: [1, 0.2, 0] },
      { id: 'fosa-intercondilea', nombre: 'fosa intercondílea', sinonimos: ['escotadura intercondilea', 'fosa intercondilea'], en: 'intercondylar fossa', enSin: ['intercondylar notch'], zonas: [{ c: [0.6, 0.045, 0.26], r: 0.035 }], dir: [0, -0.4, -1] },
      { id: 'surco-popliteo', nombre: 'surco poplíteo (cóndilo lateral)', sinonimos: ['surco popliteo', 'surco del popliteo'], en: 'popliteal groove', enSin: ['groove for popliteus'], zonas: [{ c: [0.352, 0.04, 0.347], r: 0.02 }], dir: [-1, -0.2, 0] },
    ],
  },
  {
    id: 'rotula',
    nombre: 'Rótula',
    en: 'Patella',
    region: 'inferior',
    seccion: 'Miembro inferior',
    huesos: ['FMA24486', 'FMA24487'],
    partes: [
      { id: 'base', nombre: 'base de la rótula', sinonimos: ['base', 'borde superior de la rotula'], en: 'base of patella', zonas: [{ c: [0.5, 1, 0.5], r: [3, 0.18, 3], norm: true }], dir: [0, 0.6, 1] },
      { id: 'vertice', nombre: 'vértice de la rótula', sinonimos: ['vertice', 'apice de la rotula', 'apex'], en: 'apex of patella', zonas: [{ c: [0.5, 0, 0.5], r: [0.3, 0.2, 3], norm: true }], dir: [0, -0.4, 1] },
      { id: 'cara-anterior', nombre: 'cara anterior de la rótula', sinonimos: ['cara anterior'], en: 'anterior surface of patella', zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, cara: [0, 0, 1] }], dir: [0, 0, 1] },
      { id: 'cara-articular', nombre: 'cara articular de la rótula', sinonimos: ['cara articular', 'cara posterior de la rotula'], en: 'articular surface of patella', zonas: [{ c: [0.5, 0.6, 0.5], r: [3, 0.42, 3], norm: true, cara: [0, 0, -1] }], dir: [0, 0, -1] },
      { id: 'carilla-interna', nombre: 'carilla articular interna (medial)', sinonimos: ['carilla medial', 'carilla interna'], en: 'medial articular facet', zonas: [{ c: [0.78, 0.6, 0.5], r: [0.28, 0.42, 3], norm: true, cara: [0, 0, -1] }], dir: [0.3, 0, -1] },
      { id: 'carilla-externa', nombre: 'carilla articular externa (lateral, más amplia)', sinonimos: ['carilla lateral', 'carilla externa'], en: 'lateral articular facet (wider)', zonas: [{ c: [0.25, 0.6, 0.5], r: [0.35, 0.42, 3], norm: true, cara: [0, 0, -1] }], dir: [-0.3, 0, -1] },
    ],
  },
  {
    id: 'tibia',
    nombre: 'Tibia',
    en: 'Tibia',
    region: 'inferior',
    seccion: 'Miembro inferior',
    huesos: ['FMA24477', 'FMA24478'],
    partes: [
      { id: 'condilo-medial', nombre: 'cóndilo medial de la tibia', sinonimos: ['condilo medial', 'condilo interno', 'platillo tibial medial'], en: 'medial condyle of tibia', zonas: [{ c: [0.72, 0.95, 0.5], r: 0.07 }], dir: [0.4, 1, 0.3] },
      { id: 'condilo-lateral', nombre: 'cóndilo lateral de la tibia', sinonimos: ['condilo lateral', 'condilo externo', 'platillo tibial lateral'], en: 'lateral condyle of tibia', zonas: [{ c: [0.25, 0.95, 0.5], r: 0.07 }], dir: [-0.4, 1, 0.3] },
      { id: 'eminencia', nombre: 'eminencia intercondílea', sinonimos: ['eminencia intercondilea', 'espinas tibiales'], en: 'intercondylar eminence', zonas: [{ c: [0.54, 1, 0.42], r: 0.03 }], dir: [0, 1, 0.4] },
      { id: 'tuberculo-medial', nombre: 'tubérculo intercondíleo medial', sinonimos: ['tuberculo intercondileo medial', 'espina tibial medial'], en: 'medial intercondylar tubercle', zonas: [{ c: [0.62, 1, 0.42], r: 0.016 }], dir: [0.2, 1, 0.4] },
      { id: 'tuberculo-lateral', nombre: 'tubérculo intercondíleo lateral', sinonimos: ['tuberculo intercondileo lateral', 'espina tibial lateral'], en: 'lateral intercondylar tubercle', zonas: [{ c: [0.46, 1, 0.41], r: 0.016 }], dir: [-0.2, 1, 0.4] },
      { id: 'area-anterior', nombre: 'área intercondílea anterior', sinonimos: ['area intercondilea anterior', 'area preespinal'], en: 'anterior intercondylar area', zonas: [{ c: [0.5, 0.98, 0.72], r: 0.025, cara: [0, 1, 0] }], dir: [0, 1, 0.6] },
      { id: 'area-posterior', nombre: 'área intercondílea posterior', sinonimos: ['area intercondilea posterior', 'area retroespinal'], en: 'posterior intercondylar area', zonas: [{ c: [0.52, 0.97, 0.18], r: 0.025, cara: [0, 1, 0] }], dir: [0, 1, -0.6] },
      { id: 'tuberosidad', nombre: 'tuberosidad de la tibia', sinonimos: ['tuberosidad tibial', 'tuberosidad anterior de la tibia'], en: 'tibial tuberosity', zonas: [{ c: [0.32, 0.896, 0.992], r: 0.03 }], dir: [-0.2, 0, 1] },
      { id: 'borde-interoseo', nombre: 'borde interóseo de la tibia', sinonimos: ['borde interoseo', 'borde lateral de la tibia'], en: 'interosseous border of tibia', zonas: cadena([[0.26, 0.12, 0.4], [0.29, 0.28, 0.51], [0.27, 0.42, 0.63], [0.23, 0.6, 0.7], [0.19, 0.77, 0.76]], 0.016, 3), dir: [-1, 0, 0.3] },
      { id: 'maleolo-medial', nombre: 'maléolo medial', sinonimos: ['maleolo medial', 'maleolo tibial', 'maleolo interno'], en: 'medial malleolus', zonas: [{ c: [0.8, 0.03, 0.48], r: 0.045 }], dir: [1, -0.2, 0.3] },
      { id: 'cara-posterior', nombre: 'cara posterior de la tibia', sinonimos: ['cara posterior'], en: 'posterior surface of tibia', zonas: [{ c: [0.5, 0.48, 0.5], r: [3, 0.34, 3], norm: true, cara: [0, 0, -1] }], dir: [0, 0, -1] },
      { id: 'linea-soleo', nombre: 'línea del sóleo', sinonimos: ['linea del soleo', 'linea poplitea'], en: 'soleal line', zonas: cadena([[0.303, 0.755, 0.435], [0.471, 0.711, 0.423], [0.58, 0.64, 0.42]], 0.02, 3), dir: [0, 0, -1] },
      { id: 'surco-maleolar', nombre: 'surco maleolar', sinonimos: ['surco maleolar medial', 'surco del tibial posterior'], en: 'malleolar groove', zonas: [{ c: [0.806, 0.053, 0.261], r: 0.022 }], dir: [0.4, 0, -1] },
      { id: 'agujero-nutricio', nombre: 'agujero nutricio de la tibia', sinonimos: ['agujero nutricio', 'foramen nutricio'], en: 'nutrient foramen', zonas: [{ c: [0.463, 0.66, 0.439], r: 0.02 }], dir: [0, 0, -1] },
      { id: 'escotadura-peronea', nombre: 'escotadura peronea', sinonimos: ['escotadura fibular', 'incisura peronea'], en: 'fibular notch', zonas: [{ c: [0.17, 0.05, 0.4], r: 0.03, cara: [-1, 0, 0] }], dir: [-1, 0, 0] },
      { id: 'articular-inferior', nombre: 'cara articular inferior de la tibia', sinonimos: ['cara articular inferior', 'superficie articular inferior'], en: 'inferior articular surface', zonas: [{ c: [0.5, 0.02, 0.42], r: 0.06, cara: [0, -1, 0] }], dir: [0, -1, 0.3] },
      { id: 'articular-maleolar', nombre: 'cara articular maleolar de la tibia', sinonimos: ['cara articular maleolar', 'carilla del maleolo medial'], en: 'malleolar articular surface', zonas: [{ c: [0.72, 0.04, 0.45], r: 0.03, cara: [-1, 0, 0] }], dir: [-1, -0.4, 0.3] },
    ],
  },
  {
    id: 'perone',
    nombre: 'Peroné',
    en: 'Fibula',
    region: 'inferior',
    seccion: 'Miembro inferior',
    huesos: ['FMA24480', 'FMA24481'],
    partes: [
      { id: 'cabeza', nombre: 'cabeza del peroné', sinonimos: ['cabeza del perone', 'cabeza de la fibula', 'cabeza'], en: 'head of fibula', zonas: [{ c: [0.45, 0.975, 0.4], r: 0.045 }], dir: [-0.6, 0.3, 1] },
      { id: 'vertice', nombre: 'vértice de la cabeza del peroné', sinonimos: ['vertice de la cabeza', 'apice de la cabeza del perone', 'apofisis estiloides del perone'], en: 'apex of fibular head', zonas: [{ c: [0.374, 1, 0.351], r: 0.016 }], dir: [-0.5, 0.6, 0.6] },
      { id: 'articular-cabeza', nombre: 'cara articular de la cabeza del peroné', sinonimos: ['carilla articular de la cabeza', 'cara articular de la cabeza'], en: 'articular facet of fibular head', zonas: [{ c: [0.673, 0.977, 0.525], r: 0.02 }], dir: [1, 0.5, 0.4] },
      { id: 'cuerpo', nombre: 'cuerpo del peroné', sinonimos: ['diafisis del perone', 'cuerpo'], en: 'shaft of fibula', enSin: ['body of fibula'], zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 0.36, 3], norm: true }], dir: [-1, 0, 0.4] },
      { id: 'borde-anterior', nombre: 'borde anterior del peroné', sinonimos: ['borde anterior'], en: 'anterior border of fibula', zonas: cadena([[0.63, 0.16, 0.61], [0.58, 0.37, 0.59], [0.44, 0.56, 0.64], [0.4, 0.7, 0.72]], 0.017, 3), dir: [-0.2, 0, 1] },
      { id: 'borde-interoseo', nombre: 'borde interóseo del peroné', sinonimos: ['borde interoseo', 'borde medial del perone'], en: 'interosseous border of fibula', zonas: cadena([[0.77, 0.3, 0.44], [0.73, 0.44, 0.46], [0.66, 0.57, 0.32], [0.59, 0.72, 0.31]], 0.017, 3), dir: [1, 0, 0.3] },
      { id: 'borde-posterior', nombre: 'borde posterior del peroné', sinonimos: ['borde posterior'], en: 'posterior border of fibula', zonas: cadena([[0.63, 0.29, 0.12], [0.56, 0.43, 0.16], [0.43, 0.6, 0.17], [0.49, 0.84, 0.17]], 0.017, 3), dir: [0, 0, -1] },
      { id: 'cara-lateral', nombre: 'cara lateral del peroné', sinonimos: ['cara lateral'], en: 'lateral surface of fibula', zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 0.36, 3], norm: true, cara: [-1, 0, 0] }], dir: [-1, 0, 0] },
      { id: 'cara-medial', nombre: 'cara medial del peroné', sinonimos: ['cara medial'], en: 'medial surface of fibula', zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 0.36, 3], norm: true, cara: [1, 0, 0] }], dir: [1, 0, 0] },
      { id: 'cara-posterior', nombre: 'cara posterior del peroné', sinonimos: ['cara posterior'], en: 'posterior surface of fibula', zonas: [{ c: [0.5, 0.5, 0.5], r: [3, 0.36, 3], norm: true, cara: [0, 0, -1] }], dir: [0, 0, -1] },
      { id: 'maleolo-lateral', nombre: 'maléolo lateral (peroneo)', sinonimos: ['maleolo lateral', 'maleolo peroneo', 'maleolo externo'], en: 'lateral malleolus', zonas: [{ c: [0.65, 0.04, 0.3], r: 0.04 }], dir: [-1, -0.2, 0.3] },
      { id: 'sindesmosis', nombre: 'superficie para la sindesmosis', sinonimos: ['superficie de la sindesmosis', 'carilla tibioperonea inferior'], en: 'surface for syndesmosis', zonas: [{ c: [0.95, 0.1, 0.35], r: 0.025, cara: [1, 0, 0] }], dir: [1, 0, 0.2] },
      { id: 'fosa-maleolar', nombre: 'fosa del maléolo lateral', sinonimos: ['fosa maleolar', 'fosa del maleolo lateral'], en: 'malleolar fossa', zonas: [{ c: [0.877, 0.057, 0.068], r: 0.02 }], dir: [0.4, 0, -1] },
      { id: 'articular-maleolo', nombre: 'cara articular del maléolo lateral', sinonimos: ['carilla articular del maleolo lateral', 'cara articular maleolar'], en: 'articular facet of lateral malleolus', zonas: [{ c: [0.782, 0.035, 0.537], r: 0.03, cara: [0.82, -0.39, 0.42] }], dir: [1, -0.3, 0.4] },
    ],
  },
  {
    id: 'tarso',
    nombre: 'Tarso',
    en: 'Tarsus',
    region: 'inferior',
    seccion: 'Miembro inferior',
    huesos: ['FMA24482', 'FMA24497', 'FMA24500', 'FMA24528', 'FMA24521', 'FMA24523', 'FMA24525'],
    conjunto: true,
    partes: [
      { id: 'astragalo', nombre: 'astrágalo', sinonimos: ['astragalo', 'talus'], en: 'talus', zonas: { FMA24482: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0.3, 0.6, 1] },
      { id: 'cabeza-astragalo', nombre: 'cabeza del astrágalo', sinonimos: ['cabeza del astragalo', 'cabeza del talus'], en: 'head of talus', zonas: { FMA24482: [{ c: [0.3, 0.5, 0.9], r: 0.2 }] }, dir: [0.3, 0.2, 1] },
      { id: 'astragalo-navicular', nombre: 'faceta del astrágalo para el navicular', sinonimos: ['carilla para el navicular', 'superficie articular navicular'], en: 'navicular articular surface of talus', zonas: { FMA24482: [{ c: [0.188, 0.454, 0.895], r: 0.17, cara: [-0.77, -0.32, 0.55] }] }, dir: [0.2, 0, 1] },
      { id: 'astragalo-calc-anterior', nombre: 'faceta anterior del astrágalo para el calcáneo', sinonimos: ['carilla calcanea anterior del astragalo'], en: 'anterior calcaneal facet of talus', zonas: { FMA24482: [{ c: [0.355, 0.143, 0.829], r: 0.1 }] }, dir: [0, -1, 0.5] },
      { id: 'cuello-astragalo', nombre: 'cuello del astrágalo', sinonimos: ['cuello del astragalo', 'cuello del talus'], en: 'neck of talus', zonas: { FMA24482: [{ c: [0.5, 0.62, 0.72], r: 0.13 }, { c: [0.3, 0.5, 0.9], r: 0.18, menos: true }] }, dir: [0.2, 0.6, 1] },
      { id: 'astragalo-calc-media', nombre: 'faceta media del astrágalo para el calcáneo', sinonimos: ['carilla calcanea media del astragalo'], en: 'middle calcaneal facet of talus', zonas: { FMA24482: [{ c: [0.593, 0.169, 0.647], r: 0.1, cara: [0.25, -0.95, -0.17] }] }, dir: [0.3, -1, 0.2] },
      { id: 'cuerpo-astragalo', nombre: 'cuerpo del astrágalo', sinonimos: ['cuerpo del astragalo', 'cuerpo del talus'], en: 'body of talus', zonas: { FMA24482: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }, { c: [0.4, 0.55, 0.88], r: 0.32, menos: true }] }, dir: [0.3, 0.6, -0.5] },
      { id: 'troclea', nombre: 'tróclea del astrágalo', sinonimos: ['troclea astragalina', 'troclea del talus', 'polea astragalina'], en: 'trochlea of talus', zonas: { FMA24482: [{ c: [0.674, 0.928, 0.506], r: 0.23, cara: [0.2, 1, 0] }] }, dir: [0, 1, 0.3] },
      { id: 'faceta-maleolar-lateral', nombre: 'faceta maleolar lateral del astrágalo', sinonimos: ['carilla maleolar lateral', 'carilla peronea del astragalo'], en: 'lateral malleolar facet of talus', zonas: { FMA24482: [{ c: [0.054, 0.591, 0.344], r: 0.18, cara: [-0.94, 0.19, -0.3] }] }, dir: [-1, 0.2, 0] },
      { id: 'faceta-maleolar-medial', nombre: 'faceta maleolar medial del astrágalo', sinonimos: ['carilla maleolar medial', 'carilla tibial del astragalo'], en: 'medial malleolar facet of talus', zonas: { FMA24482: [{ c: [0.887, 0.815, 0.412], r: 0.12, cara: [0.84, 0.55, -0.03] }] }, dir: [1, 0.2, 0] },
      { id: 'astragalo-calc-posterior', nombre: 'faceta articular posterior del astrágalo para el calcáneo', sinonimos: ['carilla calcanea posterior del astragalo'], en: 'posterior calcaneal facet of talus', zonas: { FMA24482: [{ c: [0.371, 0.208, 0.241], r: 0.25, cara: [0.05, -0.89, -0.46] }] }, dir: [0, -1, -0.3] },
      { id: 'apofisis-posterior', nombre: 'apófisis posterior del astrágalo', sinonimos: ['apofisis astragalina posterior', 'proceso posterior del talus'], en: 'posterior process of talus', zonas: { FMA24482: [{ c: [0.6, 0.32, 0.03], r: 0.15 }] }, dir: [0, 0.2, -1] },
      { id: 'tuberculo-lateral-astragalo', nombre: 'tubérculo lateral de la apófisis posterior', sinonimos: ['tuberculo lateral del astragalo', 'tuberculo posterolateral'], en: 'lateral tubercle of posterior process', zonas: { FMA24482: [{ c: [0.5, 0.33, 0.01], r: 0.07 }] }, dir: [-0.4, 0.2, -1] },
      { id: 'tuberculo-medial-astragalo', nombre: 'tubérculo medial de la apófisis posterior', sinonimos: ['tuberculo medial del astragalo', 'tuberculo posteromedial'], en: 'medial tubercle of posterior process', zonas: { FMA24482: [{ c: [0.684, 0.311, 0.032], r: 0.07 }] }, dir: [0.4, 0.2, -1] },
      { id: 'surco-flexor-astragalo', nombre: 'surco del flexor largo del dedo gordo (astrágalo)', sinonimos: ['surco del flexor largo del hallux en el astragalo', 'surco del flexor largo del primer dedo'], en: 'groove for flexor hallucis longus on talus', zonas: { FMA24482: [{ c: [0.6, 0.3, 0.02], r: 0.045 }] }, dir: [0, 0, -1] },
      { id: 'calcaneo', nombre: 'calcáneo', sinonimos: ['calcaneo', 'hueso del talon'], en: 'calcaneus', zonas: { FMA24497: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0, 0.3, -1] },
      { id: 'tuberosidad-calcaneo', nombre: 'tuberosidad del calcáneo', sinonimos: ['tuberosidad calcanea', 'tuber calcanei'], en: 'calcaneal tuberosity', zonas: { FMA24497: [{ c: [0.6, 0.3, 0.06], r: 0.2 }] }, dir: [0, -0.2, -1] },
      { id: 'sustentaculo', nombre: 'sustentáculo del astrágalo', sinonimos: ['sustentaculum tali', 'sustentaculo tali', 'apofisis menor del calcaneo'], en: 'sustentaculum tali', zonas: { FMA24497: [{ c: [0.8, 0.78, 0.72], r: 0.09 }] }, dir: [1, 0, 0.2] },
      { id: 'surco-flexor-calcaneo', nombre: 'surco del flexor largo del dedo gordo (calcáneo)', sinonimos: ['surco del flexor largo del hallux en el calcaneo'], en: 'groove for flexor hallucis longus on calcaneus', zonas: { FMA24497: [{ c: [0.692, 0.649, 0.655], r: 0.07 }] }, dir: [1, -0.4, 0] },
      { id: 'calcaneo-astragalo-posterior', nombre: 'faceta posterior del calcáneo para el astrágalo', sinonimos: ['carilla astragalina posterior'], en: 'posterior talar facet of calcaneus', zonas: { FMA24497: [{ c: [0.488, 0.888, 0.468], r: 0.2, cara: [0.08, 0.94, -0.33] }] }, dir: [0, 1, -0.3] },
      { id: 'calcaneo-astragalo-media', nombre: 'faceta media del calcáneo para el astrágalo', sinonimos: ['carilla astragalina media', 'faceta del sustentaculo'], en: 'middle talar facet of calcaneus', zonas: { FMA24497: [{ c: [0.65, 0.858, 0.708], r: 0.08, cara: [0, 1, 0] }] }, dir: [0.3, 1, 0.2] },
      { id: 'calcaneo-astragalo-anterior', nombre: 'faceta anterior del calcáneo para el astrágalo', sinonimos: ['carilla astragalina anterior'], en: 'anterior talar facet of calcaneus', zonas: { FMA24497: [{ c: [0.647, 0.873, 0.829], r: 0.07, cara: [0, 1, 0.3] }] }, dir: [0, 1, 0.5] },
      { id: 'surco-calcaneo', nombre: 'surco del calcáneo', sinonimos: ['surco calcaneo', 'sulcus calcanei'], en: 'calcaneal sulcus', zonas: { FMA24497: [{ c: [0.62, 0.55, 0.62], r: 0.07 }] }, dir: [-0.2, 1, 0] },
      { id: 'seno-tarso', nombre: 'seno del tarso', sinonimos: ['sinus tarsi', 'seno del tarso'], en: 'sinus tarsi', zonas: { FMA24497: [{ c: [0.3, 0.68, 0.6], r: 0.09 }] }, dir: [-1, 0.6, 0.2] },
      { id: 'calcaneo-cuboides', nombre: 'faceta del calcáneo para el cuboides', sinonimos: ['carilla cuboidea del calcaneo', 'superficie articular para el cuboides'], en: 'cuboid articular surface of calcaneus', zonas: { FMA24497: [{ c: [0.171, 0.733, 0.917], r: 0.17, cara: [-0.51, -0.09, 0.85] }] }, dir: [-0.3, 0, 1] },
      { id: 'navicular', nombre: 'navicular', sinonimos: ['escafoides del pie', 'escafoides tarsiano'], en: 'navicular', zonas: { FMA24500: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0.5, 0.4, 1] },
      { id: 'tuberosidad-navicular', nombre: 'tuberosidad del navicular', sinonimos: ['tuberosidad del escafoides', 'tuberosidad del navicular'], en: 'navicular tuberosity', zonas: { FMA24500: [{ c: [0.989, 0.191, 0.55], r: 0.15 }] }, dir: [1, -0.2, 0.3] },
      { id: 'navicular-astragalo', nombre: 'cara del navicular para el astrágalo', sinonimos: ['carilla astragalina del navicular', 'cara posterior del navicular'], en: 'talar facet of navicular', zonas: { FMA24500: [{ c: [0.4, 0.592, 0.297], r: 0.25, cara: [0.31, 0.27, -0.91] }] }, dir: [0, 0.2, -1] },
      { id: 'navicular-cunas', nombre: 'cara del navicular para las cuñas', sinonimos: ['carillas para los cuneiformes', 'cara anterior del navicular'], en: 'cuneiform facets of navicular', zonas: { FMA24500: [{ c: [0.278, 0.499, 0.66], r: 0.35, cara: [-0.67, 0.01, 0.74] }] }, dir: [0, 0.2, 1] },
      { id: 'cuboides', nombre: 'cuboides', sinonimos: ['hueso cuboides'], en: 'cuboid', zonas: { FMA24528: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [-1, 0.3, 0.5] },
      { id: 'tuberosidad-cuboides', nombre: 'tuberosidad del cuboides', sinonimos: ['tuberosidad del cuboides'], en: 'tuberosity of cuboid', zonas: { FMA24528: [{ c: [0.146, 0.011, 0.399], r: 0.15 }] }, dir: [-0.5, -1, 0] },
      { id: 'surco-peroneo', nombre: 'surco del peroneo largo (cuboides)', sinonimos: ['surco del peroneo largo', 'surco del fibular largo'], en: 'groove for fibularis longus', enSin: ['groove for peroneus longus'], zonas: { FMA24528: [{ c: [0.35, 0.1, 0.62], r: 0.18, cara: [0, -1, 0] }] }, dir: [-0.3, -1, 0.3] },
      { id: 'cuboides-calcaneo', nombre: 'cara del cuboides para el calcáneo', sinonimos: ['carilla calcanea del cuboides'], en: 'calcaneal facet of cuboid', zonas: { FMA24528: [{ c: [0.735, 0.535, 0.164], r: 0.35, cara: [0.5, 0.06, -0.86] }] }, dir: [0.3, 0, -1] },
      { id: 'cuboides-metatarsianos', nombre: 'cara del cuboides para el 4º y 5º metatarsianos', sinonimos: ['carilla metatarsiana del cuboides'], en: 'facet of cuboid for 4th and 5th metatarsals', zonas: { FMA24528: [{ c: [0.166, 0.294, 0.7], r: 0.35, cara: [-0.66, -0.54, 0.52] }] }, dir: [-0.3, 0, 1] },
      { id: 'cuna-medial', nombre: 'cuña medial (primera)', sinonimos: ['cuneiforme medial', 'primera cuña', 'cuneiforme interno'], en: 'medial cuneiform', zonas: { FMA24521: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [1, 0.3, 0.5] },
      { id: 'cuna-medial-cara', nombre: 'faceta medial no articular de la cuña medial', sinonimos: ['cara medial de la cuña medial'], en: 'medial non-articular surface of medial cuneiform', zonas: { FMA24521: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, cara: [1, 0, 0] }] }, dir: [1, 0, 0] },
      { id: 'cuna-intermedia', nombre: 'cuña intermedia (segunda, la más pequeña)', sinonimos: ['cuneiforme intermedio', 'segunda cuña', 'cuña intermedia'], en: 'intermediate cuneiform', zonas: { FMA24523: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0, 1, 0.5] },
      { id: 'cuna-lateral', nombre: 'cuña lateral (tercera)', sinonimos: ['cuneiforme lateral', 'tercera cuña', 'cuneiforme externo'], en: 'lateral cuneiform', zonas: { FMA24525: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [-0.3, 1, 0.5] },
      { id: 'cunas-dorsal', nombre: 'cara dorsal de las cuñas (ancha y rugosa)', sinonimos: ['superficie dorsal de las cuñas', 'cara dorsal de los cuneiformes'], en: 'dorsal surface of cuneiforms', zonas: { FMA24521: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, cara: [0, 1, 0] }], FMA24523: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, cara: [0, 1, 0] }], FMA24525: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true, cara: [0, 1, 0] }] }, dir: [0, 1, 0.3] },
    ],
  },
  {
    id: 'metatarsianos',
    nombre: 'Metatarsianos',
    en: 'Metatarsals',
    region: 'inferior',
    seccion: 'Miembro inferior',
    huesos: ['FMA24507', 'FMA24509', 'FMA24511', 'FMA24513', 'FMA24515'],
    conjunto: true,
    partes: [
      { id: 'base', nombre: 'base del metatarsiano', sinonimos: ['base', 'base de los metatarsianos'], en: 'base of metatarsal', zonas: { FMA24507: [{ c: [0.638, 0.693, 0.192], r: 0.241 }], FMA24509: [{ c: [0.748, 0.774, 0.155], r: 0.288 }], FMA24511: [{ c: [0.756, 0.691, 0.148], r: 0.287 }], FMA24513: [{ c: [0.765, 0.716, 0.181], r: 0.277 }], FMA24515: [{ c: [0.815, 0.733, 0.316], r: 0.264 }] }, dir: [0, 0.6, 1] },
      { id: 'tuberosidad-quinto', nombre: 'tuberosidad del quinto metatarsiano', sinonimos: ['tuberosidad del 5 metatarsiano', 'apofisis estiloides del quinto metatarsiano'], en: 'tuberosity of fifth metatarsal', zonas: { FMA24515: [{ c: [0.647, 0.54, 0.134], r: 0.12 }] }, dir: [-1, 0, -0.3] },
      { id: 'cuerpo', nombre: 'cuerpo del metatarsiano', sinonimos: ['cuerpo', 'diafisis del metatarsiano'], en: 'shaft of metatarsal', zonas: { FMA24507: [{ c: [0.548, 0.562, 0.374], r: 0.153 }, { c: [0.512, 0.509, 0.448], r: 0.153 }, { c: [0.475, 0.456, 0.522], r: 0.153 }, { c: [0.438, 0.402, 0.596], r: 0.153 }, { c: [0.402, 0.349, 0.67], r: 0.153 }], FMA24509: [{ c: [0.604, 0.624, 0.355], r: 0.183 }, { c: [0.546, 0.563, 0.436], r: 0.183 }, { c: [0.487, 0.502, 0.518], r: 0.183 }, { c: [0.428, 0.441, 0.6], r: 0.183 }, { c: [0.37, 0.38, 0.681], r: 0.183 }], FMA24511: [{ c: [0.597, 0.555, 0.344], r: 0.182 }, { c: [0.532, 0.499, 0.424], r: 0.182 }, { c: [0.467, 0.444, 0.504], r: 0.182 }, { c: [0.402, 0.388, 0.584], r: 0.182 }, { c: [0.337, 0.332, 0.664], r: 0.182 }], FMA24513: [{ c: [0.605, 0.594, 0.372], r: 0.176 }, { c: [0.54, 0.544, 0.45], r: 0.176 }, { c: [0.475, 0.494, 0.528], r: 0.176 }, { c: [0.41, 0.444, 0.607], r: 0.176 }, { c: [0.345, 0.394, 0.685], r: 0.176 }], FMA24515: [{ c: [0.644, 0.609, 0.473], r: 0.168 }, { c: [0.574, 0.558, 0.538], r: 0.168 }, { c: [0.504, 0.506, 0.602], r: 0.168 }, { c: [0.434, 0.455, 0.666], r: 0.168 }, { c: [0.364, 0.404, 0.731], r: 0.168 }] }, dir: [0, 1, 0.5] },
      { id: 'cabeza', nombre: 'cabeza del metatarsiano', sinonimos: ['cabeza', 'cabeza de los metatarsianos'], en: 'head of metatarsal', zonas: { FMA24507: [{ c: [0.312, 0.218, 0.852], r: 0.219 }], FMA24509: [{ c: [0.226, 0.23, 0.881], r: 0.262 }], FMA24511: [{ c: [0.178, 0.196, 0.86], r: 0.261 }], FMA24513: [{ c: [0.185, 0.272, 0.876], r: 0.252 }], FMA24515: [{ c: [0.193, 0.28, 0.888], r: 0.24 }] }, dir: [0, 0.3, 1] },
      { id: 'surcos-sesamoideos', nombre: 'surcos para los sesamoideos (cabeza del 1er metatarsiano)', sinonimos: ['surcos sesamoideos', 'carillas sesamoideas'], en: 'grooves for sesamoid bones', zonas: { FMA24507: [{ c: [0.32, 0.23, 0.835], r: 0.219, cara: [0, -1, -0.2] }] }, dir: [0, -1, 0.3] },
    ],
  },
  {
    id: 'falanges-pie',
    nombre: 'Falanges del pie',
    en: 'Phalanges of the foot',
    region: 'inferior',
    seccion: 'Miembro inferior',
    huesos: ['FMA43253', 'FMA32634', 'FMA32636', 'FMA32638', 'FMA32640', 'FMA32642', 'FMA32644', 'FMA32646', 'FMA230986', 'FMA32650', 'FMA32652', 'FMA32654', 'FMA32656', 'FMA32658'],
    conjunto: true,
    partes: [
      { id: 'proximales', nombre: 'falanges proximales del pie', sinonimos: ['falange proximal', 'primera falange'], en: 'proximal phalanges of foot', zonas: { FMA43253: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA32634: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA32636: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA32638: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA32640: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0, 1, 0.5] },
      { id: 'medias', nombre: 'falanges medias del pie', sinonimos: ['falange media', 'segunda falange'], en: 'middle phalanges of foot', zonas: { FMA32642: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA32644: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA32646: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA230986: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0, 1, 0.5] },
      { id: 'distales', nombre: 'falanges distales del pie', sinonimos: ['falange distal', 'tercera falange'], en: 'distal phalanges of foot', zonas: { FMA32650: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA32652: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA32654: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA32656: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }], FMA32658: [{ c: [0.5, 0.5, 0.5], r: [3, 3, 3], norm: true }] }, dir: [0, 1, 0.5] },
      { id: 'base', nombre: 'base de la falange', sinonimos: ['base'], en: 'base of phalanx', zonas: { FMA43253: [{ c: [0.663, 0.654, 0.202], r: 0.207 }], FMA32634: [{ c: [0.738, 0.649, 0.195], r: 0.232 }], FMA32636: [{ c: [0.683, 0.471, 0.195], r: 0.22 }], FMA32638: [{ c: [0.703, 0.556, 0.211], r: 0.221 }], FMA32640: [{ c: [0.722, 0.489, 0.239], r: 0.214 }], FMA32642: [{ c: [0.603, 0.514, 0.211], r: 0.181 }], FMA32644: [{ c: [0.628, 0.493, 0.224], r: 0.182 }], FMA32646: [{ c: [0.676, 0.442, 0.216], r: 0.171 }], FMA230986: [{ c: [0.651, 0.424, 0.308], r: 0.115 }], FMA32650: [{ c: [0.614, 0.49, 0.251], r: 0.203 }], FMA32652: [{ c: [0.589, 0.598, 0.229], r: 0.204 }], FMA32654: [{ c: [0.544, 0.569, 0.277], r: 0.193 }], FMA32656: [{ c: [0.548, 0.573, 0.293], r: 0.204 }], FMA32658: [{ c: [0.547, 0.563, 0.283], r: 0.183 }] }, dir: [0, 0.6, 1] },
      { id: 'cuerpo', nombre: 'cuerpo de la falange', sinonimos: ['cuerpo', 'diafisis de la falange'], en: 'shaft of phalanx', zonas: { FMA43253: [{ c: [0.553, 0.569, 0.355], r: 0.132 }, { c: [0.508, 0.535, 0.418], r: 0.132 }, { c: [0.462, 0.5, 0.481], r: 0.132 }, { c: [0.417, 0.465, 0.544], r: 0.132 }, { c: [0.372, 0.431, 0.607], r: 0.132 }], FMA32634: [{ c: [0.62, 0.547, 0.367], r: 0.148 }, { c: [0.571, 0.505, 0.437], r: 0.148 }, { c: [0.523, 0.463, 0.507], r: 0.148 }, { c: [0.475, 0.422, 0.577], r: 0.148 }, { c: [0.426, 0.38, 0.647], r: 0.148 }], FMA32636: [{ c: [0.558, 0.413, 0.365], r: 0.14 }, { c: [0.506, 0.389, 0.435], r: 0.14 }, { c: [0.455, 0.365, 0.505], r: 0.14 }, { c: [0.404, 0.342, 0.574], r: 0.14 }, { c: [0.352, 0.318, 0.644], r: 0.14 }], FMA32638: [{ c: [0.573, 0.494, 0.379], r: 0.141 }, { c: [0.52, 0.469, 0.448], r: 0.141 }, { c: [0.467, 0.444, 0.516], r: 0.141 }, { c: [0.413, 0.418, 0.585], r: 0.141 }, { c: [0.36, 0.393, 0.654], r: 0.141 }], FMA32640: [{ c: [0.598, 0.434, 0.405], r: 0.136 }, { c: [0.547, 0.411, 0.472], r: 0.136 }, { c: [0.496, 0.389, 0.54], r: 0.136 }, { c: [0.446, 0.366, 0.608], r: 0.136 }, { c: [0.395, 0.343, 0.675], r: 0.136 }], FMA32642: [{ c: [0.522, 0.456, 0.362], r: 0.115 }, { c: [0.488, 0.432, 0.424], r: 0.115 }, { c: [0.455, 0.408, 0.485], r: 0.115 }, { c: [0.422, 0.383, 0.547], r: 0.115 }, { c: [0.388, 0.359, 0.609], r: 0.115 }], FMA32644: [{ c: [0.554, 0.45, 0.385], r: 0.116 }, { c: [0.524, 0.432, 0.451], r: 0.116 }, { c: [0.494, 0.414, 0.516], r: 0.116 }, { c: [0.464, 0.396, 0.582], r: 0.116 }, { c: [0.434, 0.378, 0.648], r: 0.116 }], FMA32646: [{ c: [0.581, 0.445, 0.358], r: 0.109 }, { c: [0.542, 0.446, 0.416], r: 0.109 }, { c: [0.503, 0.448, 0.475], r: 0.109 }, { c: [0.464, 0.449, 0.533], r: 0.109 }, { c: [0.425, 0.45, 0.591], r: 0.109 }], FMA230986: [{ c: [0.582, 0.399, 0.395], r: 0.073 }, { c: [0.553, 0.389, 0.431], r: 0.073 }, { c: [0.524, 0.379, 0.467], r: 0.073 }, { c: [0.496, 0.368, 0.503], r: 0.073 }, { c: [0.467, 0.358, 0.539], r: 0.073 }], FMA32650: [{ c: [0.542, 0.434, 0.433], r: 0.129 }, { c: [0.512, 0.411, 0.507], r: 0.129 }, { c: [0.483, 0.389, 0.581], r: 0.129 }, { c: [0.453, 0.366, 0.655], r: 0.129 }, { c: [0.423, 0.343, 0.729], r: 0.129 }], FMA32652: [{ c: [0.555, 0.525, 0.417], r: 0.13 }, { c: [0.541, 0.496, 0.494], r: 0.13 }, { c: [0.526, 0.466, 0.571], r: 0.13 }, { c: [0.512, 0.436, 0.648], r: 0.13 }, { c: [0.498, 0.407, 0.725], r: 0.13 }], FMA32654: [{ c: [0.48, 0.522, 0.454], r: 0.123 }, { c: [0.453, 0.503, 0.526], r: 0.123 }, { c: [0.427, 0.484, 0.598], r: 0.123 }, { c: [0.401, 0.465, 0.67], r: 0.123 }, { c: [0.374, 0.446, 0.742], r: 0.123 }], FMA32656: [{ c: [0.478, 0.49, 0.466], r: 0.13 }, { c: [0.449, 0.456, 0.536], r: 0.13 }, { c: [0.42, 0.422, 0.607], r: 0.13 }, { c: [0.391, 0.388, 0.678], r: 0.13 }, { c: [0.362, 0.354, 0.748], r: 0.13 }], FMA32658: [{ c: [0.498, 0.539, 0.458], r: 0.116 }, { c: [0.478, 0.53, 0.53], r: 0.116 }, { c: [0.458, 0.52, 0.602], r: 0.116 }, { c: [0.438, 0.511, 0.673], r: 0.116 }, { c: [0.418, 0.502, 0.745], r: 0.116 }] }, dir: [0, 1, 0.5] },
      { id: 'cabeza', nombre: 'cabeza de la falange (tróclea)', sinonimos: ['cabeza', 'troclea', 'cabeza troclear'], en: 'head of phalanx (trochlea)', zonas: { FMA43253: [{ c: [0.262, 0.346, 0.76], r: 0.188 }], FMA32634: [{ c: [0.308, 0.277, 0.819], r: 0.211 }], FMA32636: [{ c: [0.227, 0.259, 0.815], r: 0.2 }], FMA32638: [{ c: [0.23, 0.331, 0.822], r: 0.201 }], FMA32640: [{ c: [0.271, 0.288, 0.841], r: 0.194 }], FMA32642: [{ c: [0.307, 0.301, 0.76], r: 0.165 }], FMA32644: [{ c: [0.36, 0.335, 0.809], r: 0.166 }], FMA32646: [{ c: [0.33, 0.453, 0.733], r: 0.155 }], FMA230986: [{ c: [0.398, 0.333, 0.626], r: 0.104 }] }, dir: [0, 0.3, 1] },
      { id: 'tuberosidad', nombre: 'tuberosidad de la falange distal', sinonimos: ['tuberosidad distal', 'tuberosidad ungueal'], en: 'tuberosity of distal phalanx', enSin: ['ungual tuberosity'], zonas: { FMA32650: [{ c: [0.351, 0.287, 0.911], r: 0.185 }], FMA32652: [{ c: [0.464, 0.334, 0.913], r: 0.186 }], FMA32654: [{ c: [0.31, 0.399, 0.919], r: 0.176 }], FMA32656: [{ c: [0.292, 0.271, 0.921], r: 0.185 }], FMA32658: [{ c: [0.369, 0.479, 0.919], r: 0.166 }] }, dir: [0, 0.3, 1] },
    ],
  },
];

export const apartadoPorId = new Map(APARTADOS.map((a) => [a.id, a]));

/** Zonas de una parte: iguales para todos los huesos del apartado, o una lista por hueso. */
export type ZonasParte = Zona[] | Record<string, Zona[]>;

// ---------- partes añadidas y borradas por el usuario ----------
// Se guardan en el móvil. Las partes añadidas tienen id que empieza por «u».
const CLAVE_PROPIAS = 'skelly-partes';
interface PartePropia {
  id: string;
  nombre: string;
  sinonimos: string[];
  zonas: ZonasParte;
}
interface Propias {
  /** partes nuevas por apartado */
  nuevas: Record<string, PartePropia[]>;
  /** partes borradas (id de pregunta PT:apartado:parte) */
  borradas: string[];
}
let propias: Propias = { nuevas: {}, borradas: [] };
try {
  propias = { nuevas: {}, borradas: [], ...JSON.parse(localStorage.getItem(CLAVE_PROPIAS) ?? '{}') };
} catch {
  /* datos rotos: se empieza de cero */
}
/** partes del código, antes de añadir o borrar nada */
const ORIGINALES = new Map(APARTADOS.map((a) => [a.id, a.partes]));

/** Una parte como pregunta (para corregir respuestas y para el editor de nombres). id = PT:apartado:parte */
export interface PreguntaParte extends Pregunta {
  apartado: Apartado;
  parte: Parte;
}
export const PREGUNTAS_PARTES: PreguntaParte[] = [];
export const partePorId = new Map<string, PreguntaParte>();

/** Vuelve a montar las listas de partes con lo que el usuario ha añadido o borrado. */
function montar() {
  for (const a of APARTADOS) {
    const nuevas: Parte[] = (propias.nuevas[a.id] ?? []).map((p) => ({ id: p.id, nombre: p.nombre, sinonimos: p.sinonimos, en: p.nombre, zonas: p.zonas }));
    a.partes = [...ORIGINALES.get(a.id)!, ...nuevas].filter((p) => !propias.borradas.includes(`PT:${a.id}:${p.id}`));
  }
  PREGUNTAS_PARTES.length = 0;
  partePorId.clear();
  for (const a of APARTADOS)
    for (const p of a.partes) {
      const q: PreguntaParte = {
        id: `PT:${a.id}:${p.id}`,
        nombre: p.nombre,
        sinonimos: p.sinonimos ?? [],
        en: [p.en, p.enSin ?? []] as [string, string[]],
        grupo: huesoPorId.get(a.huesos[0])!.grupo,
        region: a.region,
        miembros: [],
        apartado: a,
        parte: p,
      };
      PREGUNTAS_PARTES.push(q);
      partePorId.set(q.id, q);
    }
}
montar();
const guardarPropias = () => {
  localStorage.setItem(CLAVE_PROPIAS, JSON.stringify(propias));
  montar();
};

/** Añade una parte nueva a un apartado. Devuelve su id. */
export function anadirParte(ap: string, nombre: string, sinonimos: string[], zonas: ZonasParte) {
  const id = 'u' + Date.now().toString(36);
  (propias.nuevas[ap] ??= []).push({ id, nombre, sinonimos, zonas });
  guardarPropias();
  return id;
}

/** Borra una parte (las del código se esconden y se pueden recuperar; las añadidas se borran del todo). */
export function eliminarParte(ap: string, parte: string) {
  const nuevas = propias.nuevas[ap] ?? [];
  if (nuevas.some((p) => p.id === parte)) propias.nuevas[ap] = nuevas.filter((p) => p.id !== parte);
  else propias.borradas.push(`PT:${ap}:${parte}`);
  guardarZonas(`PT:${ap}:${parte}`, null);
  guardarPropias();
}

/** ¿Es una parte añadida por el usuario? */
export const esPropia = (ap: string, parte: string) => (propias.nuevas[ap] ?? []).some((p) => p.id === parte);
/** Cuántas partes del código ha borrado el usuario en un apartado. */
export const borradasEn = (ap: string) => propias.borradas.filter((b) => b.startsWith(`PT:${ap}:`)).length;
/** Recupera las partes del código borradas en un apartado. */
export function recuperarBorradas(ap: string) {
  propias.borradas = propias.borradas.filter((b) => !b.startsWith(`PT:${ap}:`));
  guardarPropias();
}
/** Todo lo que el usuario ha cambiado (para copiarlo y pasárselo a Claude). */
export const cambiosPropios = () => ({ zonas: corregidas, nuevas: propias.nuevas, borradas: propias.borradas });
export const hayCambiosPropios = () => Object.keys(corregidas).length + Object.values(propias.nuevas).flat().length + propias.borradas.length;

// ---------- zonas corregidas por el usuario (editor) ----------
// Se guardan en el móvil. Sustituyen a las zonas del código para esa parte.
const CLAVE_ZONAS = 'skelly-zonas';
let corregidas: Record<string, ZonasParte> = {};
try {
  corregidas = JSON.parse(localStorage.getItem(CLAVE_ZONAS) ?? '{}');
} catch {
  corregidas = {};
}
export const zonasCorregidas = () => corregidas;
export function guardarZonas(clave: string, zonas: ZonasParte | null) {
  if (zonas) corregidas[clave] = zonas;
  else delete corregidas[clave];
  localStorage.setItem(CLAVE_ZONAS, JSON.stringify(corregidas));
}

/** Zonas de una parte para unos huesos concretos. `clave` = id de la pregunta (PT:apartado:parte). */
export function zonasDe(p: Parte, ids: string[], clave?: string) {
  const z = (clave ? corregidas[clave] : undefined) ?? p.zonas;
  return new Map(ids.map((id) => [id, Array.isArray(z) ? z : (z[id] ?? [])]));
}

/** Huesos que se enseñan para una parte (todos si es de conjunto; si no, uno al azar o el i-ésimo). */
export function huesosDe(a: Apartado, i?: number) {
  if (a.conjunto) return a.huesos;
  const k = i ?? Math.floor(Math.random() * a.huesos.length);
  return [a.huesos[k % a.huesos.length]];
}
