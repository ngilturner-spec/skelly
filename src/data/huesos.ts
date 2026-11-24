// Huesos de cada región. id = nombre del nodo en el GLB (ID FMA o propio).
// nombre = respuesta principal. sinonimos = otras respuestas válidas.
// Revisa y corrige libremente: es solo texto.

export type RegionId = 'mano' | 'tronco';

export interface Region {
  id: RegionId;
  nombre: string;
  modelo: string; // archivo en public/models
}

export const REGIONES: Region[] = [
  { id: 'mano', nombre: 'Mano', modelo: 'mano.glb' },
  { id: 'tronco', nombre: 'Columna y tórax', modelo: 'tronco.glb' },
];

export const GRUPOS = {
  carpo: 'Carpo',
  metacarpo: 'Metacarpo',
  falanges: 'Falanges',
  cervicales: 'Vértebras cervicales',
  toracicas: 'Vértebras torácicas',
  lumbares: 'Vértebras lumbares',
  sacro: 'Sacro y cóccix',
  esternon: 'Esternón',
  costillas: 'Costillas',
} as const;
export type Grupo = keyof typeof GRUPOS;

export interface Hueso {
  id: string;
  nombre: string;
  sinonimos: string[];
  grupo: Grupo;
  region: RegionId;
}

type SinRegion = Omit<Hueso, 'region'>;

const ORD_M = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto'];
const ORD_F = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima', 'undécima', 'duodécima'];
const ROMANOS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];

// ================= MANO (derecha) =================
const dedos = [
  { n: 'pulgar', alt: ['primer dedo', 'dedo 1'] },
  { n: 'índice', alt: ['segundo dedo', 'dedo 2'] },
  { n: 'medio', alt: ['corazón', 'tercer dedo', 'dedo 3'] },
  { n: 'anular', alt: ['cuarto dedo', 'dedo 4'] },
  { n: 'meñique', alt: ['quinto dedo', 'dedo 5'] },
];

// Nomenclatura clásica española: falange, falangina, falangeta
const falanges = {
  proximal: { ids: ['FMA24450', 'FMA24451', 'FMA24452', 'FMA24453', 'FMA24454'], clasica: 'falange' },
  media: { ids: [null, 'FMA24455', 'FMA24456', 'FMA24457', 'FMA24458'], clasica: 'falangina' },
  distal: { ids: ['FMA24459', 'FMA24460', 'FMA24461', 'FMA24462', 'FMA24463'], clasica: 'falangeta' },
} as const;

const mano: SinRegion[] = [
  { id: 'FMA24435', nombre: 'escafoides', sinonimos: ['navicular', 'scaphoideum'], grupo: 'carpo' },
  { id: 'FMA24437', nombre: 'semilunar', sinonimos: ['lunatum', 'lunar'], grupo: 'carpo' },
  { id: 'FMA24439', nombre: 'piramidal', sinonimos: ['triquetrum', 'triquetro'], grupo: 'carpo' },
  { id: 'FMA24441', nombre: 'pisiforme', sinonimos: ['pisiforme'], grupo: 'carpo' },
  { id: 'FMA24443', nombre: 'trapecio', sinonimos: ['trapezium', 'trapecio mayor'], grupo: 'carpo' },
  { id: 'FMA23725', nombre: 'trapezoide', sinonimos: ['trapezoideum', 'trapecio menor'], grupo: 'carpo' },
  { id: 'FMA24446', nombre: 'grande', sinonimos: ['hueso grande', 'capitatum', 'capitado'], grupo: 'carpo' },
  { id: 'FMA24448', nombre: 'ganchoso', sinonimos: ['hamatum', 'unciforme'], grupo: 'carpo' },
  ...['FMA24464', 'FMA24466', 'FMA24468', 'FMA24470', 'FMA24472'].map((id, i) => ({
    id,
    nombre: `${ORD_M[i]} metacarpiano`,
    sinonimos: [`metacarpiano ${ROMANOS[i]}`, `metacarpiano ${i + 1}`, `${i + 1} metacarpiano`, `metacarpiano del ${dedos[i].n}`],
    grupo: 'metacarpo' as const,
  })),
  ...Object.entries(falanges).flatMap(([tipo, info]) =>
    info.ids.flatMap((id, i) => {
      if (!id) return [];
      const d = dedos[i];
      return [
        {
          id,
          nombre: `falange ${tipo} del ${d.n}`,
          sinonimos: [d.n, ...d.alt].flatMap((x) => [`falange ${tipo} del ${x}`, `${info.clasica} del ${x}`]),
          grupo: 'falanges' as const,
        },
      ];
    }),
  ),
];

// ================= COLUMNA Y TÓRAX =================
const vertebras = (ids: string[], tipo: string, letra: string, grupo: Grupo): SinRegion[] =>
  ids.map((id, i) => ({
    id,
    nombre: `${ORD_F[i]} vértebra ${tipo}`,
    sinonimos: [`${letra}${i + 1}`, `vertebra ${letra}${i + 1}`, `${i + 1} vertebra ${tipo}`, `vertebra ${tipo} ${i + 1}`],
    grupo,
  }));

const cervicales: SinRegion[] = [
  { id: 'FMA12519', nombre: 'atlas', sinonimos: ['c1', 'primera vertebra cervical', 'vertebra c1'], grupo: 'cervicales' },
  { id: 'FMA12520', nombre: 'axis', sinonimos: ['c2', 'segunda vertebra cervical', 'vertebra c2'], grupo: 'cervicales' },
  ...['FMA12521', 'FMA12522', 'FMA12523', 'FMA12524', 'FMA12525'].map((id, i) => ({
    id,
    nombre: `${ORD_F[i + 2]} vértebra cervical`,
    sinonimos: [`c${i + 3}`, `vertebra c${i + 3}`, `vertebra cervical ${i + 3}`, ...(i === 4 ? ['vertebra prominente', 'prominente'] : [])],
    grupo: 'cervicales' as const,
  })),
];

const toracicas = vertebras(
  ['FMA9165', 'FMA9187', 'FMA9209', 'FMA9248', 'FMA9922', 'FMA9945', 'FMA9968', 'FMA9991', 'FMA10014', 'FMA10037', 'FMA10059', 'FMA10081'],
  'torácica',
  't',
  'toracicas',
).map((v, i) => ({ ...v, sinonimos: [...v.sinonimos, `d${i + 1}`, `${ORD_F[i]} vertebra dorsal`, `vertebra dorsal ${i + 1}`] }));

const lumbares = vertebras(['FMA13072', 'FMA13073', 'FMA13074', 'FMA13075', 'FMA13076'], 'lumbar', 'l', 'lumbares');

const costilla = (ids: string[], lado: 'derecha' | 'izquierda'): SinRegion[] =>
  ids.map((id, i) => ({
    id,
    nombre: `${ORD_F[i]} costilla ${lado}`,
    sinonimos: [`costilla ${i + 1} ${lado}`, `${i + 1} costilla ${lado}`, `costilla ${ROMANOS[i]} ${lado}`, `${lado} ${i + 1}`],
    grupo: 'costillas',
  }));

const tronco: SinRegion[] = [
  ...cervicales,
  ...toracicas,
  ...lumbares,
  { id: 'FMA16202', nombre: 'sacro', sinonimos: ['hueso sacro', 'sacrum'], grupo: 'sacro' },
  { id: 'COCCIX', nombre: 'cóccix', sinonimos: ['coxis', 'coccyx', 'hueso coccigeo'], grupo: 'sacro' },
  { id: 'FMA7486', nombre: 'manubrio del esternón', sinonimos: ['manubrio', 'manubrio esternal'], grupo: 'esternon' },
  { id: 'FMA7487', nombre: 'cuerpo del esternón', sinonimos: ['cuerpo esternal', 'mesoesternon'], grupo: 'esternon' },
  { id: 'FMA7488', nombre: 'apófisis xifoides', sinonimos: ['xifoides', 'proceso xifoides', 'apendice xifoides'], grupo: 'esternon' },
  ...costilla(['FMA7857', 'FMA7882', 'FMA7909', 'FMA7957', 'FMA8066', 'FMA8175', 'FMA8229', 'FMA8283', 'FMA8364', 'FMA8445', 'FMA8531', 'FMA8533'], 'derecha'),
  ...costilla(['FMA7987', 'FMA8012', 'FMA8039', 'FMA8148', 'FMA8093', 'FMA8202', 'FMA8256', 'FMA8310', 'FMA8391', 'FMA8472', 'FMA8532', 'FMA8534'], 'izquierda'),
];

export const HUESOS: Hueso[] = [
  ...mano.map((h) => ({ ...h, region: 'mano' as const })),
  ...tronco.map((h) => ({ ...h, region: 'tronco' as const })),
];

export const huesoPorId = new Map(HUESOS.map((h) => [h.id, h]));
export const regionPorId = new Map(REGIONES.map((r) => [r.id, r]));
