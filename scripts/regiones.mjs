// Qué piezas de BodyParts3D entran en cada región (IDs FMA, árbol IS-A).
// contexto: piezas que se ven pero no se preguntan (p. ej. cartílagos).


export const REGIONES = {
  mano: {
    huesos: [
      'FMA24435', 'FMA24437', 'FMA24439', 'FMA24441', 'FMA24443', 'FMA23725', 'FMA24446', 'FMA24448',
      'FMA24464', 'FMA24466', 'FMA24468', 'FMA24470', 'FMA24472',
      'FMA24450', 'FMA24451', 'FMA24452', 'FMA24453', 'FMA24454',
      'FMA24455', 'FMA24456', 'FMA24457', 'FMA24458',
      'FMA24459', 'FMA24460', 'FMA24461', 'FMA24462', 'FMA24463',
    ],
    contexto: [],
  },
  tronco: {
    huesos: [
      // vértebras C1-C7, T1-T12, L1-L5, sacro
      'FMA12519', 'FMA12520', 'FMA12521', 'FMA12522', 'FMA12523', 'FMA12524', 'FMA12525',
      'FMA9165', 'FMA9187', 'FMA9209', 'FMA9248', 'FMA9922', 'FMA9945', 'FMA9968', 'FMA9991', 'FMA10014', 'FMA10037', 'FMA10059', 'FMA10081',
      'FMA13072', 'FMA13073', 'FMA13074', 'FMA13075', 'FMA13076',
      'FMA16202',
      // esternón
      'FMA7486', 'FMA7487', 'FMA7488',
      // costillas derechas 1-12
      'FMA7857', 'FMA7882', 'FMA7909', 'FMA7957', 'FMA8066', 'FMA8175', 'FMA8229', 'FMA8283', 'FMA8364', 'FMA8445', 'FMA8531', 'FMA8533',
      // costillas izquierdas 1-12
      'FMA7987', 'FMA8012', 'FMA8039', 'FMA8148', 'FMA8093', 'FMA8202', 'FMA8256', 'FMA8310', 'FMA8391', 'FMA8472', 'FMA8532', 'FMA8534',
    ],
    // piezas de otras fuentes (OBJ ya en coordenadas BodyParts3D)
    extra: [{ id: 'COCCIX', nombre: 'coccyx (NIH 3D 3DPX-016830, CC-BY)', archivo: '../raw/nih/coccix_bp3d.obj' }],
    contexto: [
      // cartílagos costales 1-7 (derechos e izquierdos)
      'FMA7875', 'FMA7886', 'FMA7913', 'FMA7976', 'FMA8070', 'FMA8194', 'FMA8248',
      'FMA8005', 'FMA8031', 'FMA8058', 'FMA8167', 'FMA8112', 'FMA8221', 'FMA8275',
    ],
  },
};

