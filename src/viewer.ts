// Visor 3D: carga las regiones, aplica estilos y muestra huesos según el modo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Controles } from './controles';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { HUESOS, huesoPorId, REGIONES, type RegionId } from './data/huesos';
import type { Estilo } from './srs';
import { prepararMalla, pesos, aNormal, centroPintado, type MallaNorm, type Zona } from './zonas';

type Vista = 'aislado' | 'conjunto' | 'todos';

const COLOR_RESALTE = new THREE.Color('#9b7bff');
const COLOR_ACIERTO = new THREE.Color('#34d399');
const COLOR_ERROR = new THREE.Color('#f87171');
const COLOR_FANTASMA = new THREE.Color('#8a8f9c');

interface Pieza {
  id: string;
  region: RegionId;
  contexto: boolean;
  mesh: THREE.Mesh;
  borde: THREE.Mesh;
  esfera: THREE.Sphere;
}

// ---------- shaders auxiliares ----------
const RUIDO = /* glsl */ `
  varying vec3 vObjPos;
  float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float ruido3(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * ruido3(p); p *= 2.03; a *= 0.5; } return s; }
  vec3 relieve(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
    vec3 vSigmaX = normalize(dFdx(surf_pos)); vec3 vSigmaY = normalize(dFdy(surf_pos));
    vec3 R1 = cross(vSigmaY, surf_norm); vec3 R2 = cross(surf_norm, vSigmaX);
    float fDet = dot(vSigmaX, R1) * faceDir;
    vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
    return normalize(abs(fDet) * surf_norm - vGrad);
  }`;

/** Añade textura procedural de hueso (manchas, poros, relieve) a un material estándar/físico. */
function texturaHueso(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${RUIDO}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float manchas = fbm(vObjPos * 55.0);
        float poros = smoothstep(0.62, 0.9, ruido3(vObjPos * 420.0));
        float vetas = smoothstep(0.35, 0.85, fbm(vObjPos * vec3(9.0, 22.0, 9.0)));
        vec3 base = diffuseColor.rgb * mix(0.84, 1.07, manchas);
        base = mix(base, base * vec3(1.0, 0.9, 0.76), vetas * 0.45);
        base *= 1.0 - 0.18 * poros;
        diffuseColor.rgb = base;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          float alto = fbm(vObjPos * 80.0) * 0.55 + ruido3(vObjPos * 420.0) * 0.45;
          vec2 dHdxy = vec2(dFdx(alto), dFdy(alto)) * 0.6;
          normal = relieve(-vViewPosition, normal, dHdxy, faceDirection);
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (fbm(vObjPos * 30.0) - 0.5) * 0.3, 0.25, 1.0);`,
      );
  };
  m.customProgramCacheKey = () => 'hueso-realista';
}

/** Pinta en violeta los vértices con atributo "parte" (0–1). Se suma al material que ya hubiera. */
function conParte<M extends THREE.Material>(m: M): M {
  const previo = m.onBeforeCompile;
  const clave = m.customProgramCacheKey();
  m.onBeforeCompile = (sh, r) => {
    previo.call(m, sh, r);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float parte;\nvarying float vParte;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvParte = parte;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vParte;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.22, 0.95), vParte);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.1, 0.04, 0.3) * vParte;');
  };
  m.customProgramCacheKey = () => clave + '|parte';
  return m;
}

function materialBorde(color: string, grosor: number) {
  return new THREE.ShaderMaterial({
    uniforms: { grosor: { value: grosor }, color: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      uniform float grosor;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vec3 n = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * vec4(w.xyz + n * grosor, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      void main() { gl_FragColor = vec4(color, 1.0); }`,
    side: THREE.BackSide,
  });
}

function rampaToon() {
  const datos = new Uint8Array([70, 150, 220, 255]);
  const t = new THREE.DataTexture(datos, datos.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

export class Visor {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.005, 200);
  private controls: Controles;
  private piezas = new Map<string, Pieza>();
  private estilo: Estilo = 'realista';
  private envMap: THREE.Texture;
  private luz: THREE.DirectionalLight;
  private contraluz: THREE.DirectionalLight;
  private rampa = rampaToon();
  private vista: Vista = 'todos';
  private region: RegionId = REGIONES[0].id;
  /** true = se ve el esqueleto entero; false = solo la región del hueso */
  private completo = false;
  private claveVista = '';
  private esferaCompleta = new THREE.Sphere();
  private encuadreBase: [THREE.Sphere, THREE.Vector3, number] | null = null;
  private objetivo: string | null = null;
  /** en vista aislada: huesos que se ven (si null, solo el objetivo) */
  private solo: Set<string> | null = null;
  /** huesos con una parte pintada */
  private pintados = new Set<string>();
  private mallasNorm = new Map<string, MallaNorm>();
  /** Al tocar un hueso: id y punto en coordenadas normalizadas (para el editor de zonas). */
  onClickPunto: ((id: string, punto: [number, number, number]) => void) | null = null;
  private marcas = new Map<string, THREE.Color>();
  private hover: string | null = null;
  private esferasRegion = new Map<RegionId, THREE.Sphere>();
  private raycaster = new THREE.Raycaster();
  private contenedor: HTMLElement;
  private camaraAnim: {
    desde: THREE.Vector3;
    hasta: THREE.Vector3;
    tDesde: THREE.Vector3;
    tHasta: THREE.Vector3;
    upDesde: THREE.Vector3;
    t: number;
  } | null = null;

  private margen = { derecha: 0, abajo: 0 };

  /** Espacio que tapa el panel (px), para centrar el modelo en la zona libre. */
  setMargen(derecha: number, abajo: number) {
    if (derecha === this.margen.derecha && abajo === this.margen.abajo) return;
    this.margen = { derecha, abajo };
    this.redimensionar();
    // el hueco libre ha cambiado: reencuadrar si no has movido tú la vista
    if (!this.tocado) this.restablecerVista();
  }
  /** true si has girado/movido la cámara desde el último encuadre */
  private tocado = false;

  /** Se llama al pinchar un hueso (solo si clicable = true). */
  onClick: ((id: string) => void) | null = null;
  clicable = false;

  constructor(contenedor: HTMLElement) {
    this.contenedor = contenedor;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    contenedor.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.scene.add(new THREE.HemisphereLight('#ffffff', '#30283f', 0.35));
    this.luz = new THREE.DirectionalLight('#fff4e6', 2.0);
    this.luz.castShadow = true;
    this.luz.shadow.mapSize.set(2048, 2048);
    this.luz.shadow.bias = -0.0004;
    this.luz.shadow.normalBias = 0.01;
    // luz de contorno violeta por detrás: separa el hueso del fondo negro
    this.contraluz = new THREE.DirectionalLight('#b9a3ff', 1.2);
    this.contraluz.position.set(2, -1, -3);
    // las luces van "pegadas" a la cámara: el hueso siempre bien iluminado
    this.camera.add(this.luz, this.contraluz, this.luz.target, this.contraluz.target);
    this.luz.target.position.set(0, 0, -5);
    this.contraluz.target.position.set(0, 0, -5);
    this.scene.add(this.camera);

    this.controls = new Controles(this.camera, this.renderer.domElement);

    new ResizeObserver(() => this.redimensionar()).observe(contenedor);
    this.eventos();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  async cargar(base: string) {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    await Promise.all(
      REGIONES.map(async (r) => {
        const gltf = await loader.loadAsync(`${base}${r.modelo}`);
        const mallas: THREE.Mesh[] = [];
        gltf.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) mallas.push(o);
        });
        gltf.scene.updateMatrixWorld(true);
        mallas.forEach((o) => {
          const contexto = !!o.userData?.contexto || !huesoPorId.has(o.name);
          o.castShadow = o.receiveShadow = true;
          o.geometry.computeBoundingSphere();
          const borde = new THREE.Mesh(o.geometry, materialBorde('#0b0a10', 0.004));
          o.add(borde);
          this.piezas.set(o.name, { id: o.name, region: r.id, contexto, mesh: o, borde, esfera: o.geometry.boundingSphere!.clone().applyMatrix4(o.matrixWorld) });
        });
        this.scene.add(gltf.scene);
        const s = new THREE.Sphere();
        new THREE.Box3().setFromObject(gltf.scene).getBoundingSphere(s);
        this.esferasRegion.set(r.id, s);
      }),
    );
    const caja = new THREE.Box3();
    for (const p of this.piezas.values()) caja.expandByObject(p.mesh);
    caja.getBoundingSphere(this.esferaCompleta);
    this.setEstilo(this.estilo);
    this.mostrarTodos(this.region);
  }

  /** Vuelve a la vista inicial de la tarjeta o región actual. */
  restablecerVista() {
    if (this.encuadreBase) this.encuadrar(...this.encuadreBase, true);
  }

  setEstilo(e: Estilo) {
    this.estilo = e;
    this.scene.environment = e === 'atlas' ? null : this.envMap;
    this.scene.environmentIntensity = e === 'arcilla' ? 0.6 : 0.45;
    this.renderer.toneMappingExposure = e === 'atlas' ? 1.1 : 0.95;
    this.contraluz.intensity = e === 'atlas' ? 0.6 : 1.2;
    this.actualizarMateriales();
  }

  // ---------- vistas ----------
  mostrarAislado(id: string) {
    const p = this.piezas.get(id)!;
    this.vista = 'aislado';
    this.region = p.region;
    this.objetivo = id;
    this.solo = null;
    this.pintarZonas(null);
    this.marcas.clear();
    this.actualizarMateriales();
    // vista desde un ángulo aleatorio para no memorizar "la foto"
    const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 1.4 - 0.7, Math.random() * 2 - 1).normalize();
    this.encuadrar(p.esfera, dir, 1.2, true);
  }

  /** completo = enseñar todo el esqueleto (si no, solo la región del hueso). */
  mostrarConjunto(id: string, completo = false) {
    const p = this.piezas.get(id)!;
    this.vista = 'conjunto';
    this.solo = null;
    this.pintarZonas(null);
    this.completo = completo;
    this.region = p.region;
    this.objetivo = id;
    this.marcas.clear();
    this.actualizarMateriales();
    // mirar desde delante o detrás, algo girado hacia el lado del hueso
    const c = this.zona(id);
    const lado = p.esfera.center.clone().sub(c.center);
    const dir = new THREE.Vector3(lado.x * 0.6 + (Math.random() - 0.5) * 0.5, 0.12, Math.random() < 0.5 ? 1 : -1).normalize();
    this.encuadrar(c, dir, 1.12, true);
  }

  /**
   * Muestra una región entera, o todo el esqueleto con 'completo'.
   * verTodo: enseña todo el esqueleto pero encuadra la región.
   */
  mostrarTodos(region: RegionId | 'completo', enfocar = true, verTodo = false) {
    const completo = region === 'completo' || verTodo;
    const r = region === 'completo' ? this.region : region;
    const clave = `${region}|${completo}`;
    if (clave !== this.claveVista || this.vista !== 'todos') enfocar = true;
    this.claveVista = clave;
    this.vista = 'todos';
    this.solo = null;
    this.pintarZonas(null);
    this.completo = completo;
    this.region = r;
    this.objetivo = null;
    this.marcas.clear();
    this.actualizarMateriales();
    const esfera = region === 'completo' ? this.esferaCompleta : this.esferasRegion.get(r) ?? this.esferaCompleta;
    if (enfocar) this.encuadrar(esfera, new THREE.Vector3(0.12, 0.08, 1).normalize(), 1.08, true);
  }

  // ---------- partes de huesos ----------
  mallaNorm(id: string): MallaNorm | null {
    const hecha = this.mallasNorm.get(id);
    if (hecha) return hecha;
    const p = this.piezas.get(id);
    if (!p) return null;
    const attr = p.mesh.geometry.getAttribute('position');
    const pos = new Float32Array(attr.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < attr.count; i++) {
      v.fromBufferAttribute(attr, i).applyMatrix4(p.mesh.matrixWorld);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    }
    // huesos del lado izquierdo: las zonas se escriben para el derecho y se reflejan
    const espejo = p.esfera.center.x > this.esferaCompleta.center.x + 0.3;
    const m = prepararMalla(pos, espejo);
    this.mallasNorm.set(id, m);
    return m;
  }

  /** Pinta zonas en varios huesos (null = borrar). Devuelve el centro de lo pintado. */
  pintarZonas(zonas: Map<string, Zona[]> | null): THREE.Vector3 | null {
    for (const id of this.pintados) this.piezas.get(id)?.mesh.geometry.deleteAttribute('parte');
    this.pintados.clear();
    if (!zonas) return null;
    const suma = new THREE.Vector3();
    let n = 0;
    for (const [id, zs] of zonas) {
      const m = this.mallaNorm(id);
      const p = this.piezas.get(id);
      if (!m || !p || !zs.length) continue;
      const w = pesos(m, zs);
      p.mesh.geometry.setAttribute('parte', new THREE.BufferAttribute(w, 1));
      this.pintados.add(id);
      const c = centroPintado(m, w);
      if (c) {
        suma.add(new THREE.Vector3(...c));
        n++;
      }
    }
    this.actualizarMateriales();
    return n ? suma.divideScalar(n) : null;
  }

  /**
   * Enseña solo unos huesos con una parte pintada, mirando hacia la parte.
   * dir: dirección de la cámara (si no, se calcula sola).
   */
  mostrarParte(ids: string[], zonas: Map<string, Zona[]>, dir?: [number, number, number]) {
    this.vista = 'aislado';
    this.objetivo = ids[0];
    this.solo = new Set(ids);
    this.completo = false;
    this.marcas.clear();
    const centro = this.pintarZonas(zonas);
    const caja = new THREE.Box3();
    for (const id of ids) {
      const p = this.piezas.get(id);
      if (p) caja.expandByObject(p.mesh);
    }
    const esfera = caja.getBoundingSphere(new THREE.Sphere());
    let d: THREE.Vector3;
    if (dir) d = new THREE.Vector3(...dir);
    else if (centro && centro.distanceTo(esfera.center) > esfera.radius * 0.15) {
      // desde el lado de la parte, algo en diagonal para dar volumen
      d = centro.clone().sub(esfera.center).normalize().add(new THREE.Vector3(0.25, 0.3, 0.25));
    } else d = new THREE.Vector3(0.35, 0.5, 1);
    this.encuadrar(esfera, d.normalize(), 1.15, true);
  }

  /** Zona alrededor de un hueso para verlo "en conjunto": su grupo en el mismo lado, con margen. */
  private zona(id: string): THREE.Sphere {
    const p = this.piezas.get(id)!;
    const h = huesoPorId.get(id);
    const medio = this.esferaCompleta.center.x;
    const lado = (x: number) => (Math.abs(x - medio) < 0.35 ? 0 : Math.sign(x - medio));
    const ladoP = lado(p.esfera.center.x);
    const caja = new THREE.Box3();
    for (const q of this.piezas.values()) {
      const hq = huesoPorId.get(q.id);
      if (!hq || !h || hq.grupo !== h.grupo) continue;
      const l = lado(q.esfera.center.x);
      if (ladoP !== 0 && l !== 0 && l !== ladoP) continue;
      caja.expandByObject(q.mesh);
    }
    caja.expandByObject(p.mesh);
    const s = caja.getBoundingSphere(new THREE.Sphere());
    s.radius = Math.max(s.radius * 1.6, p.esfera.radius * 3);
    return s;
  }

  /** Colorea huesos (acierto/error/resalte) sin cambiar la vista. */
  marcar(id: string, tipo: 'acierto' | 'error' | 'resalte') {
    this.marcas.set(id, tipo === 'acierto' ? COLOR_ACIERTO : tipo === 'error' ? COLOR_ERROR : COLOR_RESALTE);
    this.actualizarMateriales();
  }

  limpiarMarcas() {
    this.marcas.clear();
    this.actualizarMateriales();
  }

  /** Enfoca un hueso concreto sin ocultar los demás (para Explorar). */
  enfocarHueso(id: string) {
    const p = this.piezas.get(id);
    if (!p) return;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.encuadrar(p.esfera, dir, 2.2);
  }

  // ---------- materiales ----------
  private materialBase(p: Pieza): THREE.MeshStandardMaterial {
    if (p.contexto) {
      return new THREE.MeshPhysicalMaterial({ color: '#9fb6d6', roughness: 0.35, clearcoat: 0.6, transparent: true, opacity: 0.55, depthWrite: false });
    }
    const i = HUESOS.findIndex((h) => h.id === p.id);
    switch (this.estilo) {
      case 'realista': {
        const m = new THREE.MeshPhysicalMaterial({
          color: '#dccfb4',
          roughness: 0.62,
          clearcoat: 0.12,
          clearcoatRoughness: 0.5,
          sheen: 0.45,
          sheenColor: new THREE.Color('#fff0d4'),
          sheenRoughness: 0.55,
        });
        texturaHueso(m);
        return m;
      }
      case 'arcilla':
        return new THREE.MeshStandardMaterial({ color: '#c9ccd3', roughness: 0.92, metalness: 0 });
      case 'atlas':
        return new THREE.MeshToonMaterial({ color: '#efe3c6', gradientMap: this.rampa }) as unknown as THREE.MeshStandardMaterial;
      case 'colores':
        return new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL((i * 0.618) % 1, 0.5, 0.66), roughness: 0.55 });
    }
  }

  private actualizarMateriales() {
    for (const p of this.piezas.values()) {
      const visible = this.vista === 'aislado' ? (this.solo ? this.solo.has(p.id) : p.id === this.objetivo) : this.completo || p.region === this.region;
      p.mesh.visible = visible;
      if (!visible) continue;
      const m = this.materialBase(p);
      if (this.pintados.has(p.id)) conParte(m);
      const marca =
        this.marcas.get(p.id) ??
        (p.id === this.objetivo && this.vista === 'conjunto' ? COLOR_RESALTE : null) ??
        (p.id === this.hover ? COLOR_RESALTE.clone().lerp(new THREE.Color('#ffffff'), 0.5) : null);
      const fantasma = this.vista === 'conjunto' && p.id !== this.objetivo && !this.marcas.has(p.id);
      if (marca && !p.contexto) {
        m.color = marca.clone();
        if ('emissive' in m) m.emissive = marca.clone().multiplyScalar(0.35);
      }
      if (fantasma) {
        m.color = COLOR_FANTASMA.clone();
        if ('emissive' in m) m.emissive = new THREE.Color(0);
        m.transparent = true;
        m.opacity = p.contexto ? 0.12 : 0.22;
        m.depthWrite = false;
      }
      (p.mesh.material as THREE.Material | undefined)?.dispose();
      p.mesh.material = m;
      p.mesh.castShadow = !fantasma && !p.contexto;
      p.mesh.renderOrder = fantasma || p.contexto ? 1 : 0;
      p.borde.visible = !p.contexto && !fantasma && (this.estilo === 'atlas' || (!!marca && this.vista !== 'aislado'));
    }
  }

  // ---------- cámara ----------
  private ultimoEncuadre: [THREE.Sphere, THREE.Vector3, number] | null = null;

  private encuadrar(esfera: THREE.Sphere, dir: THREE.Vector3, margen: number, base = false) {
    this.ultimoEncuadre = [esfera, dir.clone(), margen];
    if (base) {
      this.tocado = false;
      this.encuadreBase = [esfera, dir.clone(), margen];
      // el punto de mira no puede salir de lo que se está viendo
      this.controls.limitePan.copy(esfera);
    }
    if (!this.contenedor.clientWidth || !this.contenedor.clientHeight) return; // se hará al tener tamaño
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    // que quepa tanto en alto como en ancho
    const { clientWidth: w, clientHeight: h } = this.contenedor;
    const libreW = Math.max(100, w - this.margen.derecha);
    const libreH = Math.max(100, h - this.margen.abajo);
    // fov vertical efectivo de la zona libre, y su equivalente horizontal
    const fovV = 2 * Math.atan(Math.tan(fov / 2) * (libreH / (h + this.margen.abajo)));
    const fovH = 2 * Math.atan(Math.tan(fov / 2) * (libreW / (h + this.margen.abajo)));
    const dist = (esfera.radius * margen) / Math.sin(Math.min(fovV, fovH) / 2);
    this.controls.parar();
    this.camaraAnim = {
      desde: this.camera.position.clone(),
      hasta: esfera.center.clone().addScaledVector(dir, dist),
      tDesde: this.controls.target.clone(),
      tHasta: esfera.center.clone(),
      upDesde: this.camera.up.clone(),
      t: 0,
    };
    this.controls.minDistance = esfera.radius * 0.25;
    this.controls.maxDistance = dist * 4;
    // sombras ajustadas al tamaño de lo que se ve
    const sc = this.luz.shadow.camera;
    const r = esfera.radius * 1.3;
    sc.left = sc.bottom = -r;
    sc.right = sc.top = r;
    sc.near = 0.01;
    sc.far = dist * 2 + r * 4;
    this.luz.position.set(-0.8, 1, 0.5).normalize().multiplyScalar(dist);
    sc.updateProjectionMatrix();
  }

  private frame() {
    if (this.camaraAnim) {
      const a = this.camaraAnim;
      a.t = Math.min(1, a.t + 0.05);
      const k = 1 - Math.pow(1 - a.t, 3);
      this.camera.position.lerpVectors(a.desde, a.hasta, k);
      this.controls.target.lerpVectors(a.tDesde, a.tHasta, k);
      this.camera.up.lerpVectors(a.upDesde, new THREE.Vector3(0, 1, 0), k).normalize();
      this.camera.lookAt(this.controls.target);
      if (a.t >= 1) {
        this.camaraAnim = null;
        this.controls.sincronizar();
      }
    } else {
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }

  private redimensionar() {
    const { clientWidth: w, clientHeight: h } = this.contenedor;
    if (!w || !h) return;
    const eraInvisible = this.renderer.domElement.clientWidth === 0 || !this.camera.view;
    this.renderer.setSize(w, h);
    const { derecha: d, abajo: a } = this.margen;
    // la cámara apunta al centro de la zona que no tapa el panel
    this.camera.aspect = (w + d) / (h + a);
    this.camera.setViewOffset(w + d, h + a, d, a, w, h);
    this.camera.updateProjectionMatrix();
    if (eraInvisible && this.ultimoEncuadre) this.encuadrar(...this.ultimoEncuadre);
  }

  // ---------- ratón / dedo ----------
  private pick(ev: PointerEvent): string | null {
    return this.pickHit(ev)?.object.name ?? null;
  }

  private pickHit(ev: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(v, this.camera);
    const meshes = [...this.piezas.values()].filter((p) => p.mesh.visible && !p.contexto).map((p) => p.mesh);
    return this.raycaster.intersectObjects(meshes, false)[0] ?? null;
  }

  private eventos() {
    const el = this.renderer.domElement;
    let inicio: { x: number; y: number } | null = null;
    el.addEventListener('wheel', () => (this.tocado = true), { passive: true });
    el.addEventListener('pointerdown', (e) => {
      this.tocado = true;
      inicio = { x: e.clientX, y: e.clientY };
      if (this.camaraAnim) {
        this.camaraAnim = null; // si tocas, mandas tú
        this.controls.sincronizar();
      }
    });
    el.addEventListener('pointerup', (e) => {
      if (!inicio || !this.clicable) return;
      const movido = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 6; // fue un giro, no un clic
      inicio = null;
      if (movido) return;
      const hit = this.pickHit(e);
      if (!hit) return;
      const id = hit.object.name;
      if (this.onClickPunto) {
        const m = this.mallaNorm(id);
        if (m) this.onClickPunto(id, aNormal(m, hit.point));
      }
      this.onClick?.(id);
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.clicable || e.pointerType !== 'mouse' || e.buttons) return;
      const id = this.pick(e);
      if (id !== this.hover) {
        this.hover = id;
        el.style.cursor = id ? 'pointer' : '';
        this.actualizarMateriales();
      }
    });
  }

  quitarHover() {
    this.hover = null;
    this.renderer.domElement.style.cursor = '';
  }
}
