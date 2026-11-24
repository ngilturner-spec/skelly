// Huesos de cada región. id = nombre del nodo en el GLB (ID FMA o propio).
// nombre = respuesta principal. sinonimos = otras respuestas válidas. en = inglés.
// Revisa y corrige libremente: es solo texto (o usa el editor de nombres de la app).
//
// Además de los huesos hay "preguntas agrupadas":
//  · TIPOS: vértebras y costillas, donde basta con saber el tipo (cervical, costilla verdadera derecha…).
//  · PARES: huesos con lado (fémur derecho/izquierdo). En "hueso aislado" se pregunta solo "fémur".

export type RegionId = 'cabeza' | 'tronco' | 'superior' | 'inferior';

export interface Region {
  id: RegionId;
  nombre: string;
  modelo: string; // archivo en public/models
}

export const REGIONES: Region[] = [
  { id: 'cabeza', nombre: 'Cabeza', modelo: 'cabeza.glb' },
  { id: 'tronco', nombre: 'Columna y tórax', modelo: 'tronco.glb' },
  { id: 'superior', nombre: 'Miembro superior', modelo: 'superior.glb' },
  { id: 'inferior', nombre: 'Miembro inferior', modelo: 'inferior.glb' },
];

export const GRUPOS = {
  neurocraneo: 'Neurocráneo',
  viscerocraneo: 'Viscerocráneo',
  cervicales: 'Vértebras cervicales',
  toracicas: 'Vértebras torácicas',
  lumbares: 'Vértebras lumbares',
  sacro: 'Sacro y cóccix',
  esternon: 'Esternón',
  costillas: 'Costillas',
  cinturaEscapular: 'Cintura escapular',
  brazo: 'Brazo y antebrazo',
  carpo: 'Carpo',
  metacarpo: 'Metacarpo',
  falanges: 'Falanges de la mano',
  pelvis: 'Cintura pélvica',
  pierna: 'Muslo y pierna',
  tarso: 'Tarso',
  metatarso: 'Metatarso',
  falangesPie: 'Falanges del pie',
} as const;
export type Grupo = keyof typeof GRUPOS;

/** Algo que se puede preguntar: un hueso, un tipo (vértebra cervical) o una pareja (fémur). */
export interface Pregunta {
  id: string;
  nombre: string;
  sinonimos: string[];
  en: [string, string[]];
  grupo: Grupo;
  region: RegionId;
  /** huesos 3D que cuentan como esta pregunta */
  miembros: string[];
}

export interface Hueso extends Pregunta {
  /** tipo al que pertenece (vértebras y costillas): se responde con el tipo */
  tipo?: string;
  /** pareja sin lado (en hueso aislado se pregunta esa) */
  par?: string;
}

const ORD_M = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto'];
const ORD_F = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima', 'undécima', 'duodécima'];
const ROMANOS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
const ORD_EN = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
const ORD_EN_N = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const limpia = (s: string) => s.replace(/\s+/g, ' ').trim();
const unico = <T>(xs: T[]) => [...new Set(xs)];

const huesos: Hueso[] = [];
const agrupadas: Pregunta[] = [];
let region: RegionId = 'cabeza';

/** Hueso sin lado. nombres[0] = principal. */
function uno(id: string, es: string[], en: string[], grupo: Grupo, extra: Partial<Hueso> = {}) {
  huesos.push({ id, nombre: es[0], sinonimos: es.slice(1), en: [en[0], en.slice(1)], grupo, region, miembros: [id], ...extra });
}

type Nombres = string[] | ((lado: string) => string[]);
const aplicar = (n: Nombres, lado: string, pos: 'antes' | 'despues') =>
  unico((typeof n === 'function' ? n(lado) : n.map((s) => (pos === 'antes' ? `${lado} ${s}` : `${s} ${lado}`))).map(limpia));

/**
 * Hueso con lado: crea el derecho, el izquierdo y la pareja sin lado.
 * genero: concordancia de "derecho/derecha" (da igual al responder: se aceptan las dos).
 */
function par(ids: [string, string], genero: 'm' | 'f', es: Nombres, en: Nombres, grupo: Grupo) {
  const parId = `P:${ids[0]}`;
  const ladosEs = genero === 'm' ? ['derecho', 'izquierdo'] : ['derecha', 'izquierda'];
  ids.forEach((id, i) => {
    const e = aplicar(es, ladosEs[i], 'despues');
    const n = aplicar(en, ['right', 'left'][i], 'antes');
    huesos.push({ id, nombre: e[0], sinonimos: e.slice(1), en: [n[0], n.slice(1)], grupo, region, miembros: [id], par: parId });
  });
  const e = aplicar(es, '', 'despues');
  const n = aplicar(en, '', 'antes');
  agrupadas.push({ id: parId, nombre: e[0], sinonimos: e.slice(1), en: [n[0], n.slice(1)], grupo, region, miembros: [...ids] });
}

/** Tipo (vértebra cervical, costilla verdadera derecha…): los miembros se responden con el tipo. */
function tipo(id: string, es: string[], en: string[], grupo: Grupo, miembros: string[]) {
  agrupadas.push({ id, nombre: es[0], sinonimos: es.slice(1), en: [en[0], en.slice(1)], grupo, region, miembros });
  for (const h of huesos) if (miembros.includes(h.id)) h.tipo = id;
}

// =====================================================================
// CABEZA
// =====================================================================
region = 'cabeza';
uno('FMA52734', ['frontal', 'hueso frontal', 'os frontale'], ['frontal bone', 'frontal'], 'neurocraneo');
uno('FMA52735', ['occipital', 'hueso occipital', 'os occipitale'], ['occipital bone', 'occipital'], 'neurocraneo');
uno('FMA52736', ['esfenoides', 'hueso esfenoides', 'os sphenoidale'], ['sphenoid bone', 'sphenoid'], 'neurocraneo');
uno('FMA52740', ['etmoides', 'hueso etmoides', 'os ethmoidale'], ['ethmoid bone', 'ethmoid'], 'neurocraneo');
par(['FMA52788', 'FMA52789'], 'm', ['parietal', 'hueso parietal'], ['parietal bone', 'parietal'], 'neurocraneo');
par(['FMA52738', 'FMA52739'], 'm', ['temporal', 'hueso temporal'], ['temporal bone', 'temporal'], 'neurocraneo');
uno('FMA52748', ['mandíbula', 'maxilar inferior', 'mandibula'], ['mandible', 'lower jaw', 'jawbone'], 'viscerocraneo');
uno('FMA9710', ['vómer', 'vomer'], ['vomer'], 'viscerocraneo');
uno('FMA52749', ['hioides', 'hueso hioides'], ['hyoid bone', 'hyoid'], 'viscerocraneo');
par(['FMA53649', 'FMA53650'], 'm', ['maxilar', 'maxilar superior', 'hueso maxilar'], ['maxilla', 'upper jaw'], 'viscerocraneo');
par(['FMA52892', 'FMA52893'], 'm', ['cigomático', 'malar', 'hueso cigomatico', 'pomulo', 'yugal'], ['zygomatic bone', 'zygomatic', 'malar bone', 'cheekbone'], 'viscerocraneo');
par(['FMA53647', 'FMA53648'], 'm', ['hueso nasal', 'nasal', 'hueso propio de la nariz'], ['nasal bone'], 'viscerocraneo');
par(['FMA53645', 'FMA53646'], 'm', ['lagrimal', 'hueso lagrimal', 'unguis'], ['lacrimal bone', 'lacrimal'], 'viscerocraneo');
par(['FMA53655', 'FMA53656'], 'm', ['palatino', 'hueso palatino'], ['palatine bone', 'palatine'], 'viscerocraneo');
par(['FMA54737', 'FMA54738'], 'm', ['cornete inferior', 'concha nasal inferior', 'cornete nasal inferior'], ['inferior nasal concha', 'inferior turbinate'], 'viscerocraneo');

// =====================================================================
// COLUMNA Y TÓRAX
// =====================================================================
region = 'tronco';
uno('FMA12519', ['atlas', 'c1', 'primera vertebra cervical', 'vertebra c1'], ['atlas', 'c1', 'first cervical vertebra'], 'cervicales');
uno('FMA12520', ['axis', 'c2', 'segunda vertebra cervical', 'vertebra c2'], ['axis', 'c2', 'second cervical vertebra'], 'cervicales');
const CERV = ['FMA12521', 'FMA12522', 'FMA12523', 'FMA12524', 'FMA12525'];
CERV.forEach((id, i) =>
  uno(
    id,
    [`${ORD_F[i + 2]} vértebra cervical`, `c${i + 3}`, `vertebra c${i + 3}`, `vertebra cervical ${i + 3}`, ...(i === 4 ? ['vertebra prominente'] : [])],
    [`${ORD_EN[i + 2]} cervical vertebra`, `c${i + 3}`, `vertebra c${i + 3}`, ...(i === 4 ? ['vertebra prominens'] : [])],
    'cervicales',
  ),
);
const TOR = ['FMA9165', 'FMA9187', 'FMA9209', 'FMA9248', 'FMA9922', 'FMA9945', 'FMA9968', 'FMA9991', 'FMA10014', 'FMA10037', 'FMA10059', 'FMA10081'];
TOR.forEach((id, i) =>
  uno(
    id,
    [`${ORD_F[i]} vértebra torácica`, `t${i + 1}`, `d${i + 1}`, `vertebra t${i + 1}`, `${ORD_F[i]} vertebra dorsal`],
    [`${ORD_EN[i]} thoracic vertebra`, `t${i + 1}`, `vertebra t${i + 1}`, `${ORD_EN_N[i]} thoracic vertebra`],
    'toracicas',
  ),
);
const LUM = ['FMA13072', 'FMA13073', 'FMA13074', 'FMA13075', 'FMA13076'];
LUM.forEach((id, i) =>
  uno(id, [`${ORD_F[i]} vértebra lumbar`, `l${i + 1}`, `vertebra l${i + 1}`], [`${ORD_EN[i]} lumbar vertebra`, `l${i + 1}`, `vertebra l${i + 1}`], 'lumbares'),
);
uno('FMA16202', ['sacro', 'hueso sacro', 'sacrum'], ['sacrum', 'sacral bone'], 'sacro');
uno('COCCIX', ['cóccix', 'coxis', 'coccyx', 'hueso coccigeo'], ['coccyx', 'tailbone', 'coccygeal bone'], 'sacro');
uno('FMA7486', ['manubrio del esternón', 'manubrio', 'manubrio esternal'], ['manubrium', 'manubrium of sternum', 'manubrium sterni'], 'esternon');
uno('FMA7487', ['cuerpo del esternón', 'cuerpo esternal', 'mesoesternon'], ['body of sternum', 'sternal body', 'gladiolus', 'mesosternum'], 'esternon');
uno('FMA7488', ['apófisis xifoides', 'xifoides', 'proceso xifoides', 'apendice xifoides'], ['xiphoid process', 'xiphoid', 'xiphisternum'], 'esternon');

const COST_DER = ['FMA7857', 'FMA7882', 'FMA7909', 'FMA7957', 'FMA8066', 'FMA8175', 'FMA8229', 'FMA8283', 'FMA8364', 'FMA8445', 'FMA8531', 'FMA8533'];
const COST_IZQ = ['FMA7987', 'FMA8012', 'FMA8039', 'FMA8148', 'FMA8093', 'FMA8202', 'FMA8256', 'FMA8310', 'FMA8391', 'FMA8472', 'FMA8532', 'FMA8534'];
for (const [ids, lado, side] of [
  [COST_DER, 'derecha', 'right'],
  [COST_IZQ, 'izquierda', 'left'],
] as const) {
  ids.forEach((id, i) =>
    uno(
      id,
      [`${ORD_F[i]} costilla ${lado}`, `costilla ${i + 1} ${lado}`, `${i + 1} costilla ${lado}`, `costilla ${ROMANOS[i]} ${lado}`],
      [`${side} ${ORD_EN[i]} rib`, `${ORD_EN[i]} ${side} rib`, `${side} rib ${i + 1}`, `${ORD_EN_N[i]} ${side} rib`],
      'costillas',
    ),
  );
}

// tipos: basta con saber de qué tipo es
tipo('T:cervical', ['vértebra cervical', 'cervical', 'vertebra cervical tipica'], ['cervical vertebra', 'cervical', 'typical cervical vertebra'], 'cervicales', CERV);
tipo('T:toracica', ['vértebra torácica', 'toracica', 'vertebra dorsal', 'dorsal'], ['thoracic vertebra', 'thoracic', 'dorsal vertebra'], 'toracicas', TOR);
tipo('T:lumbar', ['vértebra lumbar', 'lumbar'], ['lumbar vertebra', 'lumbar'], 'lumbares', LUM);
for (const [ids, lado, side, suf] of [
  [COST_DER, 'derecha', 'right', 'der'],
  [COST_IZQ, 'izquierda', 'left', 'izq'],
] as const) {
  tipo(`T:costilla-verdadera-${suf}`, [`costilla verdadera ${lado}`, `costilla esternal ${lado}`], [`${side} true rib`, `${side} vertebrosternal rib`], 'costillas', ids.slice(0, 7));
  tipo(`T:costilla-falsa-${suf}`, [`costilla falsa ${lado}`, `costilla asternal ${lado}`, `costilla vertebrocondral ${lado}`], [`${side} false rib`, `${side} vertebrochondral rib`], 'costillas', ids.slice(7, 10));
  tipo(`T:costilla-flotante-${suf}`, [`costilla flotante ${lado}`, `costilla libre ${lado}`, `costilla flotante falsa ${lado}`], [`${side} floating rib`, `${side} free rib`, `${side} vertebral rib`], 'costillas', ids.slice(10, 12));
}

// =====================================================================
// MIEMBRO SUPERIOR
// =====================================================================
region = 'superior';
par(['FMA13322', 'FMA13323'], 'f', ['clavícula'], ['clavicle', 'collarbone'], 'cinturaEscapular');
par(['FMA13395', 'FMA13396'], 'f', ['escápula', 'omoplato'], ['scapula', 'shoulder blade'], 'cinturaEscapular');
par(['FMA23130', 'FMA23131'], 'm', ['húmero'], ['humerus'], 'brazo');
par(['FMA23464', 'FMA23465'], 'm', ['radio'], ['radius'], 'brazo');
par(['FMA23467', 'FMA23468'], 'm', ['cúbito', 'ulna'], ['ulna'], 'brazo');

// mano: [derecha, izquierda]
par(['FMA24435', 'FMA24436'], 'm', ['escafoides', 'escafoides de la mano', 'navicular de la mano', 'scaphoideum'], ['scaphoid', 'scaphoid bone'], 'carpo');
par(['FMA24437', 'FMA24438'], 'm', ['semilunar', 'lunatum', 'lunar'], ['lunate', 'lunate bone', 'semilunar'], 'carpo');
par(['FMA24439', 'FMA24440'], 'm', ['piramidal', 'triquetrum', 'triquetro'], ['triquetrum', 'triquetral', 'triangular'], 'carpo');
par(['FMA24441', 'FMA24442'], 'm', ['pisiforme'], ['pisiform', 'pisiform bone'], 'carpo');
par(['FMA24443', 'FMA24444'], 'm', ['trapecio', 'trapezium', 'trapecio mayor'], ['trapezium', 'greater multangular'], 'carpo');
par(['FMA23725', 'FMA24445'], 'm', ['trapezoide', 'trapezoideum', 'trapecio menor'], ['trapezoid', 'lesser multangular'], 'carpo');
par(['FMA24446', 'FMA24447'], 'm', ['grande', 'hueso grande', 'capitatum', 'capitado'], ['capitate', 'capitate bone', 'os magnum'], 'carpo');
par(['FMA24448', 'FMA24449'], 'm', ['ganchoso', 'hamatum', 'unciforme'], ['hamate', 'unciform', 'hamate bone'], 'carpo');

const dedosMano = [
  { n: 'pulgar', alt: ['primer dedo', 'dedo 1'], en: 'thumb', enAlt: [] as string[] },
  { n: 'índice', alt: ['segundo dedo', 'dedo 2'], en: 'index finger', enAlt: ['index'] },
  { n: 'medio', alt: ['corazón', 'tercer dedo', 'dedo 3'], en: 'middle finger', enAlt: ['middle'] },
  { n: 'anular', alt: ['cuarto dedo', 'dedo 4'], en: 'ring finger', enAlt: ['ring'] },
  { n: 'meñique', alt: ['quinto dedo', 'dedo 5'], en: 'little finger', enAlt: ['little', 'pinky'] },
];
const METACARPO = [
  ['FMA24464', 'FMA24465'],
  ['FMA24466', 'FMA24467'],
  ['FMA24468', 'FMA24469'],
  ['FMA24470', 'FMA24471'],
  ['FMA24472', 'FMA24473'],
] as const;
METACARPO.forEach((ids, i) =>
  par(
    [ids[0], ids[1]],
    'm',
    [`${ORD_M[i]} metacarpiano`, `metacarpiano ${ROMANOS[i]}`, `metacarpiano ${i + 1}`, `${i + 1} metacarpiano`, `metacarpiano del ${dedosMano[i].n}`],
    [`${ORD_EN[i]} metacarpal`, `${ORD_EN_N[i]} metacarpal`, `metacarpal ${ROMANOS[i]}`, `metacarpal ${i + 1}`, `${dedosMano[i].en} metacarpal`],
    'metacarpo',
  ),
);
// Nomenclatura clásica española: falange, falangina, falangeta. [derecha, izquierda] por dedo.
const FALANGES_MANO: Record<'proximal' | 'media' | 'distal', { clasica: string; en: string; ids: ([string, string] | null)[] }> = {
  proximal: {
    clasica: 'falange',
    en: 'proximal',
    ids: [
      ['FMA24450', 'FMA65470'],
      ['FMA24451', 'FMA71915'],
      ['FMA24452', 'FMA71908'],
      ['FMA24453', 'FMA71916'],
      ['FMA24454', 'FMA66791'],
    ],
  },
  media: {
    clasica: 'falangina',
    en: 'middle',
    ids: [null, ['FMA24455', 'FMA23938'], ['FMA24456', 'FMA23940'], ['FMA24457', 'FMA23942'], ['FMA24458', 'FMA23944']],
  },
  distal: {
    clasica: 'falangeta',
    en: 'distal',
    ids: [
      ['FMA24459', 'FMA23951'],
      ['FMA24460', 'FMA23953'],
      ['FMA24461', 'FMA23955'],
      ['FMA24462', 'FMA23957'],
      ['FMA24463', 'FMA23959'],
    ],
  },
};
for (const [t, info] of Object.entries(FALANGES_MANO)) {
  info.ids.forEach((ids, i) => {
    if (!ids) return;
    const d = dedosMano[i];
    par(
      ids,
      'm',
      (l) => [d.n, ...d.alt].flatMap((x) => [`falange ${t} del ${x} ${l}`, `${info.clasica} del ${x} ${l}`]),
      (l) => [d.en, ...d.enAlt].flatMap((x) => [`${info.en} phalanx of the ${l} ${x}`, `${l} ${x} ${info.en} phalanx`, `${l} ${info.en} phalanx of ${x}`]),
      'falanges',
    );
  });
}

// =====================================================================
// MIEMBRO INFERIOR
// =====================================================================
region = 'inferior';
par(['FMA16586', 'FMA16587'], 'm', ['coxal', 'hueso coxal', 'hueso iliaco', 'hueso de la cadera', 'innominado', 'os coxae'], ['hip bone', 'coxal bone', 'innominate bone', 'os coxae', 'pelvic bone'], 'pelvis');
par(['FMA24474', 'FMA24475'], 'm', ['fémur'], ['femur', 'thigh bone'], 'pierna');
par(['FMA24486', 'FMA24487'], 'f', ['rótula', 'patela'], ['patella', 'kneecap'], 'pierna');
par(['FMA24477', 'FMA24478'], 'f', ['tibia'], ['tibia', 'shinbone'], 'pierna');
par(['FMA24480', 'FMA24481'], 'm', ['peroné', 'fibula'], ['fibula', 'calf bone'], 'pierna');

par(['FMA24482', 'FMA24483'], 'm', ['astrágalo', 'talus'], ['talus', 'astragalus', 'ankle bone'], 'tarso');
par(['FMA24497', 'FMA24498'], 'm', ['calcáneo', 'calcaneo', 'hueso del talon'], ['calcaneus', 'heel bone', 'calcaneum'], 'tarso');
par(['FMA24500', 'FMA24501'], 'm', ['navicular', 'escafoides del pie', 'escafoides tarsiano', 'navicular del pie'], ['navicular', 'navicular bone of foot', 'tarsal navicular'], 'tarso');
par(['FMA24528', 'FMA24529'], 'm', ['cuboides'], ['cuboid', 'cuboid bone'], 'tarso');
par(['FMA24521', 'FMA24522'], 'm', ['cuneiforme medial', 'primera cuña', 'cuña medial', 'cuneiforme interno', 'primer cuneiforme'], ['medial cuneiform', 'first cuneiform', 'internal cuneiform'], 'tarso');
par(['FMA24523', 'FMA24524'], 'm', ['cuneiforme intermedio', 'segunda cuña', 'cuña intermedia', 'cuneiforme medio', 'segundo cuneiforme'], ['intermediate cuneiform', 'second cuneiform', 'middle cuneiform'], 'tarso');
par(['FMA24525', 'FMA24526'], 'm', ['cuneiforme lateral', 'tercera cuña', 'cuña lateral', 'cuneiforme externo', 'tercer cuneiforme'], ['lateral cuneiform', 'third cuneiform', 'external cuneiform'], 'tarso');

const dedosPie = [
  { n: 'dedo gordo', alt: ['hallux', 'primer dedo del pie'], en: 'big toe', enAlt: ['great toe', 'hallux'] },
  { n: 'segundo dedo del pie', alt: [], en: 'second toe', enAlt: [] as string[] },
  { n: 'tercer dedo del pie', alt: [], en: 'third toe', enAlt: [] },
  { n: 'cuarto dedo del pie', alt: [], en: 'fourth toe', enAlt: [] },
  { n: 'quinto dedo del pie', alt: ['dedo pequeño del pie', 'meñique del pie'], en: 'little toe', enAlt: ['fifth toe', 'small toe'] },
];
const METATARSO = [
  ['FMA24507', 'FMA24508'],
  ['FMA24509', 'FMA24510'],
  ['FMA24511', 'FMA24512'],
  ['FMA24513', 'FMA24514'],
  ['FMA24515', 'FMA24516'],
] as const;
METATARSO.forEach((ids, i) =>
  par(
    [ids[0], ids[1]],
    'm',
    [`${ORD_M[i]} metatarsiano`, `metatarsiano ${ROMANOS[i]}`, `metatarsiano ${i + 1}`, `${i + 1} metatarsiano`, `metatarsiano del ${dedosPie[i].n}`],
    [`${ORD_EN[i]} metatarsal`, `${ORD_EN_N[i]} metatarsal`, `metatarsal ${ROMANOS[i]}`, `metatarsal ${i + 1}`],
    'metatarso',
  ),
);
const FALANGES_PIE: Record<'proximal' | 'media' | 'distal', { en: string; ids: ([string, string] | null)[] }> = {
  proximal: {
    en: 'proximal',
    ids: [
      ['FMA43253', 'FMA43254'],
      ['FMA32634', 'FMA32635'],
      ['FMA32636', 'FMA32637'],
      ['FMA32638', 'FMA32639'],
      ['FMA32640', 'FMA32641'],
    ],
  },
  media: { en: 'middle', ids: [null, ['FMA32642', 'FMA32643'], ['FMA32644', 'FMA32645'], ['FMA32646', 'FMA32647'], ['FMA230986', 'FMA230988']] },
  distal: {
    en: 'distal',
    ids: [
      ['FMA32650', 'FMA32651'],
      ['FMA32652', 'FMA32653'],
      ['FMA32654', 'FMA32655'],
      ['FMA32656', 'FMA32657'],
      ['FMA32658', 'FMA32659'],
    ],
  },
};
for (const [t, info] of Object.entries(FALANGES_PIE)) {
  info.ids.forEach((ids, i) => {
    if (!ids) return;
    const d = dedosPie[i];
    par(
      ids,
      'm',
      (l) => [d.n, ...d.alt].map((x) => `falange ${t} del ${x} ${l}`),
      (l) => [d.en, ...d.enAlt].flatMap((x) => [`${info.en} phalanx of the ${l} ${x}`, `${l} ${x} ${info.en} phalanx`]),
      'falangesPie',
    );
  });
}

// =====================================================================
export const HUESOS: Hueso[] = huesos;
/** Tipos y parejas. */
export const AGRUPADAS: Pregunta[] = agrupadas;
/** Todo lo que se puede preguntar o editar. */
export const PREGUNTAS: Pregunta[] = [...huesos, ...agrupadas];

export const huesoPorId = new Map(HUESOS.map((h) => [h.id, h]));
export const preguntaPorId = new Map(PREGUNTAS.map((p) => [p.id, p]));
export const regionPorId = new Map(REGIONES.map((r) => [r.id, r]));
