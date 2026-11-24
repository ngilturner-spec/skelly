// Nombres en inglés de cada hueso: id -> [nombre, sinónimos]
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
const ORD_N = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const ROM = ['i', 'ii', 'iii', 'iv', 'v'];

export const INGLES: Record<string, [string, string[]]> = {
  // carpo
  FMA24435: ['scaphoid', ['navicular', 'scaphoid bone']],
  FMA24437: ['lunate', ['lunate bone', 'semilunar']],
  FMA24439: ['triquetrum', ['triquetral', 'triangular']],
  FMA24441: ['pisiform', ['pisiform bone']],
  FMA24443: ['trapezium', ['greater multangular']],
  FMA23725: ['trapezoid', ['lesser multangular']],
  FMA24446: ['capitate', ['capitate bone', 'os magnum']],
  FMA24448: ['hamate', ['unciform', 'hamate bone']],
  // columna
  FMA12519: ['atlas', ['c1', 'first cervical vertebra']],
  FMA12520: ['axis', ['c2', 'second cervical vertebra']],
  FMA16202: ['sacrum', ['sacral bone']],
  COCCIX: ['coccyx', ['tailbone', 'coccygeal bone']],
  // esternón
  FMA7486: ['manubrium', ['manubrium of sternum', 'manubrium sterni']],
  FMA7487: ['body of sternum', ['sternal body', 'gladiolus', 'mesosternum']],
  FMA7488: ['xiphoid process', ['xiphoid', 'xiphisternum']],
};

// metacarpianos
const dedos = ['thumb', 'index finger', 'middle finger', 'ring finger', 'little finger'];
const alias: Record<string, string[]> = { 'index finger': ['index'], 'middle finger': ['middle'], 'ring finger': ['ring'], 'little finger': ['little', 'pinky'] };
['FMA24464', 'FMA24466', 'FMA24468', 'FMA24470', 'FMA24472'].forEach((id, i) => {
  INGLES[id] = [`${ORD[i]} metacarpal`, [`${ORD_N[i]} metacarpal`, `metacarpal ${ROM[i]}`, `metacarpal ${i + 1}`, `${dedos[i]} metacarpal`]];
});

// falanges
const falanges: Record<string, (string | null)[]> = {
  proximal: ['FMA24450', 'FMA24451', 'FMA24452', 'FMA24453', 'FMA24454'],
  middle: [null, 'FMA24455', 'FMA24456', 'FMA24457', 'FMA24458'],
  distal: ['FMA24459', 'FMA24460', 'FMA24461', 'FMA24462', 'FMA24463'],
};
for (const [tipo, ids] of Object.entries(falanges)) {
  ids.forEach((id, i) => {
    if (!id) return;
    const d = dedos[i];
    const nombres = [d, ...(alias[d] ?? [])];
    INGLES[id] = [`${tipo} phalanx of the ${d}`, nombres.flatMap((n) => [`${tipo} phalanx of ${n}`, `${n} ${tipo} phalanx`])];
  });
}

// vértebras
['FMA12521', 'FMA12522', 'FMA12523', 'FMA12524', 'FMA12525'].forEach((id, i) => {
  INGLES[id] = [`${ORD[i + 2]} cervical vertebra`, [`c${i + 3}`, `vertebra c${i + 3}`, ...(i === 4 ? ['vertebra prominens'] : [])]];
});
['FMA9165', 'FMA9187', 'FMA9209', 'FMA9248', 'FMA9922', 'FMA9945', 'FMA9968', 'FMA9991', 'FMA10014', 'FMA10037', 'FMA10059', 'FMA10081'].forEach((id, i) => {
  INGLES[id] = [`${ORD[i]} thoracic vertebra`, [`t${i + 1}`, `vertebra t${i + 1}`, `${ORD_N[i]} thoracic vertebra`, `${ORD[i]} dorsal vertebra`]];
});
['FMA13072', 'FMA13073', 'FMA13074', 'FMA13075', 'FMA13076'].forEach((id, i) => {
  INGLES[id] = [`${ORD[i]} lumbar vertebra`, [`l${i + 1}`, `vertebra l${i + 1}`, `${ORD_N[i]} lumbar vertebra`]];
});

// costillas
const costillas = (ids: string[], lado: 'right' | 'left') =>
  ids.forEach((id, i) => {
    INGLES[id] = [`${lado} ${ORD[i]} rib`, [`${ORD[i]} ${lado} rib`, `${lado} rib ${i + 1}`, `rib ${i + 1} ${lado}`, `${ORD_N[i]} ${lado} rib`, `${lado} ${ORD_N[i]} rib`]];
  });
costillas(['FMA7857', 'FMA7882', 'FMA7909', 'FMA7957', 'FMA8066', 'FMA8175', 'FMA8229', 'FMA8283', 'FMA8364', 'FMA8445', 'FMA8531', 'FMA8533'], 'right');
costillas(['FMA7987', 'FMA8012', 'FMA8039', 'FMA8148', 'FMA8093', 'FMA8202', 'FMA8256', 'FMA8310', 'FMA8391', 'FMA8472', 'FMA8532', 'FMA8534'], 'left');
