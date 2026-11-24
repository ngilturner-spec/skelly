// Controles de cámara propios: giro libre (360° en cualquier dirección), zoom suave y
// desplazamiento limitado para que el modelo no "se escape".
//  · 1 dedo / botón izquierdo: girar
//  · rueda / pellizco: zoom (suave, con límites)
//  · 2 dedos / botón derecho / Mayús+arrastrar: desplazar (sin alejarse del modelo)
import * as THREE from 'three';

const VEL_GIRO = Math.PI * 0.9; // radianes al arrastrar toda la altura de la pantalla
const AMORTIGUACION = 0.85;
const INERCIA_MAX = 0.035; // rad por fotograma, para que no salga disparado // cuánto dura la inercia al soltar (0 = nada)
const SUAVIDAD_ZOOM = 0.2;

export class Controles {
  target = new THREE.Vector3();
  minDistance = 0.1;
  maxDistance = 100;
  /** Centro y radio dentro de los que se puede desplazar el punto de mira. */
  limitePan = new THREE.Sphere(new THREE.Vector3(), 1);

  private dist = 1;
  private distObjetivo = 1;
  private giro = new THREE.Vector2(); // giro pendiente de aplicar (rad)
  private inercia = new THREE.Vector2(); // velocidad al soltar
  private ultimoMovimiento = 0;
  private punteros = new Map<number, { x: number; y: number }>();
  private modo: 'girar' | 'pan' | null = null;
  private pellizco = { dist: 0, distCam: 0, cx: 0, cy: 0 };

  private camera: THREE.PerspectiveCamera;
  private el: HTMLElement;

  constructor(camera: THREE.PerspectiveCamera, el: HTMLElement) {
    this.camera = camera;
    this.el = el;
    el.addEventListener('pointerdown', this.abajo);
    el.addEventListener('pointermove', this.mover);
    el.addEventListener('pointerup', this.arriba);
    el.addEventListener('pointercancel', this.arriba);
    el.addEventListener('wheel', this.rueda, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Llamar tras mover la cámara desde fuera (animaciones). */
  sincronizar() {
    this.dist = this.distObjetivo = this.camera.position.distanceTo(this.target);
    this.giro.set(0, 0);
  }

  /** Para la inercia (p. ej. al empezar una animación). */
  parar() {
    this.giro.set(0, 0);
    this.distObjetivo = this.dist;
  }

  update() {
    // giro alrededor del punto de mira, usando los ejes de la propia cámara (sin "polos")
    if (this.giro.lengthSq() > 1e-8) {
      const offset = this.camera.position.clone().sub(this.target);
      const arriba = this.camera.up.clone();
      const derecha = new THREE.Vector3().crossVectors(arriba, offset).normalize();
      const q = new THREE.Quaternion()
        .setFromAxisAngle(arriba, -this.giro.x)
        .multiply(new THREE.Quaternion().setFromAxisAngle(derecha, -this.giro.y));
      offset.applyQuaternion(q);
      this.camera.up.applyQuaternion(q).normalize();
      this.camera.position.copy(this.target).add(offset);
      if (this.modo !== 'girar') this.giro.multiplyScalar(AMORTIGUACION);
      else this.giro.set(0, 0);
    }
    // zoom suave
    this.distObjetivo = THREE.MathUtils.clamp(this.distObjetivo, this.minDistance, this.maxDistance);
    this.dist += (this.distObjetivo - this.dist) * SUAVIDAD_ZOOM;
    const dir = this.camera.position.clone().sub(this.target).normalize();
    this.camera.position.copy(this.target).addScaledVector(dir, this.dist);
    this.camera.lookAt(this.target);
  }

  // ---------- eventos ----------
  private abajo = (e: PointerEvent) => {
    this.el.setPointerCapture(e.pointerId);
    this.punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.giro.set(0, 0);
    this.inercia.set(0, 0);
    if (this.punteros.size === 1) this.modo = e.button === 2 || e.button === 1 || e.shiftKey ? 'pan' : 'girar';
    else if (this.punteros.size === 2) {
      this.modo = null;
      const [a, b] = [...this.punteros.values()];
      this.pellizco = { dist: Math.hypot(a.x - b.x, a.y - b.y), distCam: this.distObjetivo, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    }
  };

  private mover = (e: PointerEvent) => {
    const prev = this.punteros.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    this.punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const alto = this.el.clientHeight || 1;

    if (this.punteros.size === 2) {
      const [a, b] = [...this.punteros.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pellizco.dist > 0) this.distObjetivo = this.pellizco.distCam * (this.pellizco.dist / Math.max(d, 1));
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      this.desplazar(cx - this.pellizco.cx, cy - this.pellizco.cy);
      this.pellizco.cx = cx;
      this.pellizco.cy = cy;
      return;
    }
    if (this.modo === 'girar') {
      // el giro sigue al dedo: misma distancia arrastrada = mismo ángulo
      this.giro.x += (dx / alto) * VEL_GIRO;
      this.giro.y += (dy / alto) * VEL_GIRO;
      // velocidad moderada para la inercia al soltar
      this.inercia.set((dx / alto) * VEL_GIRO * 0.3, (dy / alto) * VEL_GIRO * 0.3);
      if (this.inercia.length() > INERCIA_MAX) this.inercia.setLength(INERCIA_MAX);
      this.ultimoMovimiento = performance.now();
    } else if (this.modo === 'pan') this.desplazar(dx, dy);
  };

  private arriba = (e: PointerEvent) => {
    this.punteros.delete(e.pointerId);
    if (this.punteros.size === 0) {
      // solo hay inercia si soltaste mientras movías (no si te paraste antes)
      if (this.modo === 'girar' && performance.now() - this.ultimoMovimiento < 60) this.giro.copy(this.inercia);
      this.modo = null;
    }
    else if (this.punteros.size === 1) {
      this.modo = 'girar';
      this.giro.set(0, 0);
    }
  };

  private rueda = (e: WheelEvent) => {
    e.preventDefault();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= 400;
    d = THREE.MathUtils.clamp(d, -120, 120); // ratones con saltos enormes
    this.distObjetivo *= Math.exp(d * 0.0016);
  };

  private desplazar(dx: number, dy: number) {
    const alto = this.el.clientHeight || 1;
    const escala = (2 * this.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)) / alto;
    const derecha = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const arriba = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    const mov = derecha.multiplyScalar(-dx * escala).add(arriba.multiplyScalar(dy * escala));
    const nuevo = this.target.clone().add(mov);
    // no dejar que el punto de mira salga del modelo
    const c = this.limitePan.center;
    const r = this.limitePan.radius;
    if (nuevo.distanceTo(c) > r) nuevo.sub(c).setLength(r).add(c);
    const real = nuevo.clone().sub(this.target);
    this.target.add(real);
    this.camera.position.add(real);
  }
}
