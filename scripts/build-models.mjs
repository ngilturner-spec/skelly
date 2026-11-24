// Convierte los OBJ de BodyParts3D en un GLB suavizado por región.
// Uso: node scripts/build-models.mjs [region...]   (sin argumentos: todas)
// Cada hueso queda como un nodo con el nombre de su ID FMA.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Document, NodeIO } from '@gltf-transform/core';
import { REGIONES } from './regiones.mjs';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const RAW = path.resolve('../raw/bp3d');
const ZIP = path.join(RAW, 'isa_BP3D_4.0_obj_99.zip');
const SCALE = 0.01; // mm -> unidades de escena (1 unidad = 10 cm)
// Subdivisión según lo detallado que venga el hueso (cada nivel x4 triángulos)
const nivelesSubdivision = (tris) => (tris < 600 ? 2 : tris < 2500 ? 1 : 0);

// concepto FMA -> archivos de malla (FJ...)
const elementos = new Map();
for (const linea of fs.readFileSync(path.join(RAW, 'isa_element_parts.txt'), 'utf8').split(/\r?\n/).slice(1)) {
  const [fma, nombre, fj] = linea.split('\t');
  if (!fj) continue;
  if (!elementos.has(fma)) elementos.set(fma, { nombre, fj: [] });
  elementos.get(fma).fj.push(fj.trim());
}


function parseObj(file) {
  const pos = [];
  const tris = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/).map(Number);
      // BodyParts3D: Z arriba, Y hacia atrás. Three.js: Y arriba, Z hacia delante.
      pos.push([x, z, -y]);
    } else if (line.startsWith('f ')) {
      const idx = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((t) => parseInt(t.split('/')[0], 10) - 1);
      for (let i = 1; i + 1 < idx.length; i++) tris.push([idx[0], idx[i], idx[i + 1]]);
    }
  }
  return { pos, tris };
}

// Une vértices repetidos en la misma posición (evita grietas al subdividir).
function weld({ pos, tris }) {
  const map = new Map();
  const remap = [];
  const out = [];
  pos.forEach((p, i) => {
    const k = p.map((v) => v.toFixed(4)).join(',');
    if (!map.has(k)) {
      map.set(k, out.length);
      out.push(p);
    }
    remap[i] = map.get(k);
  });
  const t = tris
    .map((f) => f.map((i) => remap[i]))
    .filter(([a, b, c]) => a !== b && b !== c && a !== c);
  return { pos: out, tris: t };
}

// ---------- subdivisión de Loop ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

function loop({ pos, tris }) {
  const edges = new Map();
  const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  for (const [a, b, c] of tris) {
    for (const [u, v, w] of [
      [a, b, c],
      [b, c, a],
      [c, a, b],
    ]) {
      const k = key(u, v);
      if (!edges.has(k)) edges.set(k, { u, v, opp: [] });
      edges.get(k).opp.push(w);
    }
  }
  const neighbors = pos.map(() => new Set());
  const boundary = new Set();
  for (const e of edges.values()) {
    neighbors[e.u].add(e.v);
    neighbors[e.v].add(e.u);
    if (e.opp.length !== 2) {
      boundary.add(e.u);
      boundary.add(e.v);
    }
  }
  // vértices antiguos, recolocados
  const newPos = pos.map((p, i) => {
    if (boundary.has(i)) return p;
    const n = neighbors[i].size;
    const beta = n === 3 ? 3 / 16 : 3 / (8 * n);
    let s = [0, 0, 0];
    for (const j of neighbors[i]) s = add(s, pos[j]);
    return add(mul(p, 1 - n * beta), mul(s, beta));
  });
  // vértices nuevos en cada arista
  const edgeIndex = new Map();
  for (const [k, e] of edges) {
    let p;
    if (e.opp.length === 2) {
      p = add(mul(add(pos[e.u], pos[e.v]), 3 / 8), mul(add(pos[e.opp[0]], pos[e.opp[1]]), 1 / 8));
    } else {
      p = mul(add(pos[e.u], pos[e.v]), 0.5);
    }
    edgeIndex.set(k, newPos.length);
    newPos.push(p);
  }
  const newTris = [];
  for (const [a, b, c] of tris) {
    const ab = edgeIndex.get(key(a, b));
    const bc = edgeIndex.get(key(b, c));
    const ca = edgeIndex.get(key(c, a));
    newTris.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
  }
  return { pos: newPos, tris: newTris };
}

// Normales suaves (media ponderada por área)
function normals({ pos, tris }) {
  const n = pos.map(() => [0, 0, 0]);
  for (const [a, b, c] of tris) {
    const [ax, ay, az] = pos[a];
    const e1 = [pos[b][0] - ax, pos[b][1] - ay, pos[b][2] - az];
    const e2 = [pos[c][0] - ax, pos[c][1] - ay, pos[c][2] - az];
    const f = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    for (const i of [a, b, c]) n[i] = add(n[i], f);
  }
  return n.map((v) => {
    const l = Math.hypot(...v) || 1;
    return mul(v, 1 / l);
  });
}

async function construir(region, cfg) {
const OUT = path.resolve(`public/models/${region}.glb`);
const piezas = [...cfg.huesos.map((id) => [id, false]), ...cfg.contexto.map((id) => [id, true])];
const objDir = path.join(RAW, 'obj');
fs.mkdirSync(objDir, { recursive: true });
const faltan = piezas
  .flatMap(([id]) => elementos.get(id)?.fj ?? [])
  .filter((fj) => !fs.existsSync(path.join(objDir, `${fj}.obj`)))
  .map((fj) => `isa_BP3D_4.0_obj_99/${fj}.obj`);
if (faltan.length) execFileSync('unzip', ['-o', '-j', '-q', ZIP, ...faltan, '-d', objDir]);

console.log(`\n=== ${region} ===`);
const elements = piezas.map(([id, contexto]) => {
  const e = elementos.get(id);
  if (!e) throw new Error(`No encuentro ${id} en isa_element_parts.txt`);
  return [id, e.nombre, e.fj, contexto];
});
for (const x of cfg.extra ?? []) elements.push([x.id, x.nombre, [path.resolve(x.archivo)], false]);

// ---------- construir ----------
const meshes = elements.map(([fma, name, fjs, contexto]) => {
  // un concepto puede tener varias mallas: se juntan
  let m = { pos: [], tris: [] };
  for (const fj of fjs) {
    const parte = weld(parseObj(fj.endsWith('.obj') ? fj : path.join(objDir, `${fj}.obj`)));
    const off = m.pos.length;
    m.pos.push(...parte.pos);
    m.tris.push(...parte.tris.map((t) => t.map((i) => i + off)));
  }
  const before = m.tris.length;
  const n = nivelesSubdivision(before);
  for (let i = 0; i < n; i++) m = loop(m);
  console.log(`${fma.padEnd(9)} ${name.padEnd(40)} ${before} -> ${m.tris.length} triángulos${contexto ? ' (contexto)' : ''}`);
  return { fma, name, contexto, ...m };
});

// centrar la región en el origen
let min = [Infinity, Infinity, Infinity];
let max = [-Infinity, -Infinity, -Infinity];
for (const m of meshes)
  for (const p of m.pos)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[k]);
      max[k] = Math.max(max[k], p[k]);
    }
const center = mul(add(min, max), 0.5);

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene(region);
for (const m of meshes) {
  const nrm = normals(m);
  const P = new Float32Array(m.pos.length * 3);
  const N = new Float32Array(m.pos.length * 3);
  m.pos.forEach((p, i) => {
    for (let k = 0; k < 3; k++) {
      P[i * 3 + k] = (p[k] - center[k]) * SCALE;
      N[i * 3 + k] = nrm[i][k];
    }
  });
  const I = new Uint32Array(m.tris.flat());
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(I).setBuffer(buffer));
  const mesh = doc.createMesh(m.fma).addPrimitive(prim);
  scene.addChild(doc.createNode(m.fma).setMesh(mesh).setExtras({ en: m.name, contexto: m.contexto }));
}
doc.getRoot().getAsset().copyright =
  'BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
// compresión para móvil: posiciones/normales cuantizadas + meshopt
await MeshoptEncoder.ready;
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 14, quantizeNormal: 10 }));
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await io.write(OUT, doc);
console.log(`\nGuardado ${OUT} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB)`);
}

const pedidas = process.argv.slice(2);
for (const [region, cfg] of Object.entries(REGIONES)) {
  if (pedidas.length && !pedidas.includes(region)) continue;
  await construir(region, cfg);
}
