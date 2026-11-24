// Coloca el cóccix de NIH 3D (3DPX-016830, CC-BY) en el sistema de coordenadas de BodyParts3D.
// Idea: alinear el SACRO de NIH con el sacro de BodyParts3D (PCA + ICP con escala)
// y aplicar esa misma transformación al cóccix.
// Uso: node scripts/alinear-coccix.mjs  ->  ../raw/nih/coccix_bp3d.obj
import fs from 'node:fs';
import path from 'node:path';
import { Matrix, SingularValueDecomposition, EigenvalueDecomposition, determinant } from 'ml-matrix';

const NIH = path.resolve('../raw/nih/stl');
const BP = path.resolve('../raw/bp3d');

function leerStl(file) {
  const b = fs.readFileSync(file);
  const n = b.readUInt32LE(80);
  const pos = [];
  const tris = [];
  const mapa = new Map();
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12;
    const t = [];
    for (let v = 0; v < 3; v++) {
      const p = [b.readFloatLE(o + v * 12), b.readFloatLE(o + v * 12 + 4), b.readFloatLE(o + v * 12 + 8)];
      const k = p.map((x) => x.toFixed(4)).join(',');
      if (!mapa.has(k)) {
        mapa.set(k, pos.length);
        pos.push(p);
      }
      t.push(mapa.get(k));
    }
    tris.push(t);
  }
  return { pos, tris };
}

function leerObjVertices(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.startsWith('v '))
    .map((l) => l.trim().split(/\s+/).slice(1).map(Number));
}

const muestra = (pts, n) => (pts.length <= n ? pts : Array.from({ length: n }, (_, i) => pts[Math.floor((i * pts.length) / n)]));
const centro = (P) => P.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((x) => x / P.length);

function pca(P) {
  const c = centro(P);
  const C = new Matrix(3, 3);
  for (const p of P) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C.set(i, j, C.get(i, j) + (p[i] - c[i]) * (p[j] - c[j]));
  const e = new EigenvalueDecomposition(C.div(P.length));
  // ordenar de mayor a menor
  const idx = [0, 1, 2].sort((a, b) => e.realEigenvalues[b] - e.realEigenvalues[a]);
  const V = new Matrix(3, 3);
  idx.forEach((k, col) => {
    for (let r = 0; r < 3; r++) V.set(r, col, e.eigenvectorMatrix.get(r, k));
  });
  return { c, V, val: idx.map((k) => e.realEigenvalues[k]) };
}

const aplicar = (T, p) => {
  const { s, R, t } = T;
  return [0, 1, 2].map((i) => s * (R.get(i, 0) * p[0] + R.get(i, 1) * p[1] + R.get(i, 2) * p[2]) + t[i]);
};

function masCercano(p, Q) {
  let best = Infinity;
  let bi = 0;
  for (let i = 0; i < Q.length; i++) {
    const d = (p[0] - Q[i][0]) ** 2 + (p[1] - Q[i][1]) ** 2 + (p[2] - Q[i][2]) ** 2;
    if (d < best) {
      best = d;
      bi = i;
    }
  }
  return [bi, best];
}

// Umeyama: semejanza (escala+rotación+traslación) que lleva A sobre B
function umeyama(A, B) {
  const ca = centro(A);
  const cb = centro(B);
  const S = new Matrix(3, 3);
  let varA = 0;
  for (let k = 0; k < A.length; k++) {
    const a = A[k].map((x, i) => x - ca[i]);
    const b = B[k].map((x, i) => x - cb[i]);
    varA += a[0] ** 2 + a[1] ** 2 + a[2] ** 2;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S.set(i, j, S.get(i, j) + b[i] * a[j]);
  }
  const svd = new SingularValueDecomposition(S);
  const U = svd.leftSingularVectors;
  const V = svd.rightSingularVectors;
  const D = Matrix.eye(3);
  if (determinant(U.mmul(V.transpose())) < 0) D.set(2, 2, -1);
  const R = U.mmul(D).mmul(V.transpose());
  const sv = svd.diagonal;
  const s = (sv[0] * D.get(0, 0) + sv[1] * D.get(1, 1) + sv[2] * D.get(2, 2)) / varA;
  const Rca = [0, 1, 2].map((i) => R.get(i, 0) * ca[0] + R.get(i, 1) * ca[1] + R.get(i, 2) * ca[2]);
  return { s, R, t: cb.map((x, i) => x - s * Rca[i]) };
}

function icp(src, dst, T0, iter = 40) {
  let T = T0;
  let err = Infinity;
  for (let it = 0; it < iter; it++) {
    const movidos = src.map((p) => aplicar(T, p));
    const pares = movidos.map((p) => masCercano(p, dst));
    // descartar el 10% de peores pares (zonas que no se corresponden)
    const orden = pares.map((x, i) => [x[1], i]).sort((a, b) => a[0] - b[0]).slice(0, Math.floor(pares.length * 0.9));
    err = Math.sqrt(orden.reduce((a, x) => a + x[0], 0) / orden.length);
    T = umeyama(
      orden.map(([, i]) => src[i]),
      orden.map(([, i]) => dst[pares[i][0]]),
    );
  }
  return { T, err };
}

// ---------- datos ----------
const sacroNih = leerStl(path.join(NIH, 'MySegmenter_SACRUM.stl'));
const coccix = leerStl(path.join(NIH, fs.readdirSync(NIH).find((f) => /COCCYX/i.test(f))));
const fjSacro = fs
  .readFileSync(path.join(BP, 'isa_element_parts.txt'), 'utf8')
  .split(/\r?\n/)
  .filter((l) => l.startsWith('FMA16202\t'))
  .map((l) => l.split('\t')[2].trim());
const sacroBp = fjSacro.flatMap((fj) => leerObjVertices(path.join(BP, 'obj', `${fj}.obj`)));

const src = muestra(sacroNih.pos, 1500);
const dst = muestra(sacroBp, 4000);
const A = pca(src);
const B = pca(dst);
const escala0 = Math.sqrt(B.val[0] / A.val[0]);

// probar las 4 orientaciones posibles de los ejes principales (sin reflejar)
let mejor = null;
for (const signos of [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
]) {
  const Va = A.V.clone();
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) Va.set(r, c, Va.get(r, c) * signos[c]);
  if (determinant(Va) * determinant(B.V) < 0) for (let r = 0; r < 3; r++) Va.set(r, 2, -Va.get(r, 2));
  const R = B.V.mmul(Va.transpose());
  const Rc = [0, 1, 2].map((i) => R.get(i, 0) * A.c[0] + R.get(i, 1) * A.c[1] + R.get(i, 2) * A.c[2]);
  const T0 = { s: escala0, R, t: B.c.map((x, i) => x - escala0 * Rc[i]) };
  const r = icp(src, dst, T0);
  console.log(`orientación ${signos}: error medio ${r.err.toFixed(2)} mm, escala ${r.T.s.toFixed(3)}`);
  if (!mejor || r.err < mejor.err) mejor = r;
}
console.log(`\nMejor ajuste: error ${mejor.err.toFixed(2)} mm, escala ${mejor.T.s.toFixed(3)}`);

// ---------- guardar cóccix en coordenadas BodyParts3D ----------
const lineas = ['# Cóccix: NIH 3D 3DPX-016830 (CC-BY 4.0), alineado con BodyParts3D'];
for (const p of coccix.pos) lineas.push(`v ${aplicar(mejor.T, p).map((x) => x.toFixed(3)).join(' ')}`);
for (const t of coccix.tris) lineas.push(`f ${t.map((i) => i + 1).join(' ')}`);
const out = path.resolve('../raw/nih/coccix_bp3d.obj');
fs.writeFileSync(out, lineas.join('\n'));
console.log(`Guardado ${out} (${coccix.tris.length} triángulos)`);
