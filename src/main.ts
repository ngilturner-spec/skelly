import '@fontsource-variable/lexend';
import './style.css';
import { Rating, type Grade } from 'ts-fsrs';
import { Visor } from './viewer';
import { GRUPOS, HUESOS, AGRUPADAS, REGIONES, huesoPorId, preguntaPorId, type Grupo, type Pregunta, type RegionId } from './data/huesos';
import { comprobarVarias, pista, type Resultado } from './answer';
import { t, tGrupo, tRegion, idioma, cambiarIdioma, nombre, sinonimos, nombreDe, guardarNombre, esEditado, restaurarNombres, huesosEditados, type Idioma } from './i18n';
import { sonidoAcierto, sonidoFallo } from './sonido';
import * as srs from './srs';
import { BufferAttribute as THREE_BA } from 'three';
import { APARTADOS, apartadoPorId, partePorId, zonasDe, huesosDe, guardarZonas, zonasCorregidas, anadirParte, eliminarParte, esPropia, borradasEn, recuperarBorradas, cambiosPropios, hayCambiosPropios, importarCambios, type Apartado } from './data/partes';
import type { Zona } from './zonas';
import { pesoEnPunto, aNormal, pesos } from './zonas';
import type { Estilo, Modo, Tarjeta } from './srs';

const panel = document.querySelector<HTMLElement>('#panel')!;
const barra = document.querySelector<HTMLElement>('#barra')!;
const visor = new Visor(document.querySelector<HTMLElement>('#visor')!);

type Pantalla = 'inicio' | 'estudio' | 'explorar' | 'partes' | 'ajustes' | 'editor' | 'zona' | 'examen';
let pantalla: Pantalla = 'inicio';
let teclas: ((e: KeyboardEvent) => void) | null = null;
let huesoAnterior: string | undefined;
let sesion = { objetivo: 1, hechas: 0 };
/** región que se ve en Explorar / editor ('completo' = todo el esqueleto) */
type Vista = RegionId | 'completo';
let regionVista: Vista = 'completo';
/** hueso 3D que se enseña en la tarjeta actual (en tipos y parejas, uno al azar) */
let mostrado = '';
const esCompleto = () => srs.ajustes().regiones.length === REGIONES.length;
/** vista general según las regiones elegidas */
const vistaEstudio = (): Vista => (esCompleto() ? 'completo' : srs.ajustes().regiones[0]);
const azar = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
/** Lo que hay que responder. En conjunto, las vértebras y costillas se responden con su tipo. */
function preguntaDe(tj: Tarjeta): Pregunta {
  const pt = partePorId.get(tj.hueso);
  if (pt) return pt;
  const p = preguntaPorId.get(tj.hueso)!;
  const b = huesoPorId.get(tj.hueso);
  if (tj.modo === 'conjunto' && b?.tipo) return preguntaPorId.get(b.tipo)!;
  return p;
}
const chipsVista = (activa: Vista) =>
  `<div class="chips"><button class="chip ${activa === 'completo' ? 'activo' : ''}" data-reg="completo">${t('todas')}</button>${REGIONES.map((r) => `<button class="chip ${activa === r.id ? 'activo' : ''}" data-reg="${r.id}">${nombreRegion(r.id)}</button>`).join('')}</div>`;
const deVista = (v: Vista) => (v === 'completo' ? HUESOS : HUESOS.filter((x) => x.region === v));

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const h = (html: string) => {
  panel.innerHTML = html;
  panel.scrollTop = 0;
};
const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!;
const todos = <T extends HTMLElement>(sel: string, raiz: ParentNode = panel) => [...raiz.querySelectorAll<T>(sel)];
const nombreRegion = (id: RegionId): string => tRegion(id, REGIONES.find((r) => r.id === id)!.nombre);
const nombreGrupo = (g: Grupo) => tGrupo(g, GRUPOS[g]);
const MODOS_T: Record<Modo, () => string> = { aislado: () => t('aislado'), conjunto: () => t('conjunto'), localizar: () => t('localizar'), partes: () => t('partesModo'), localizarParte: () => t('localizarParteModo') };
const TODOS_MODOS = Object.keys(MODOS_T) as Modo[];
const nombreAp = (a: Apartado) => (idioma() === 'en' ? a.en : a.nombre);

function aplicarEscala() {
  document.documentElement.style.setProperty('--escala', String(srs.ajustes().escalaLetra));
}
aplicarEscala();
// el modelo se centra en la parte de la pantalla que no tapa el panel
new ResizeObserver(() => {
  const r = panel.getBoundingClientRect();
  if (window.innerWidth > 760) visor.setMargen(window.innerWidth - r.left, 0);
  else visor.setMargen(0, window.innerHeight - r.top);
}).observe(panel);
document.addEventListener('keydown', (e) => teclas?.(e));
document.querySelector('#restablecer')!.addEventListener('click', () => visor.restablecerVista());

// ================= BARRA SUPERIOR =================
function pintarBarra() {
  if (pantalla === 'examen' && examen && examen.i < examen.preguntas.length) {
    const pct = (100 * examen.i) / examen.preguntas.length;
    barra.innerHTML = `
      <span class="logo ocultar-movil"><span class="punto"></span>skelly</span>
      <button class="icono" id="salir" title="${t('volver')}">←</button>
      <div class="progreso"><div style="width:${pct}%"></div></div>
      <span class="zona-barra">${t('examen')} · ${esc(nombreZona(examen.grupos))}</span>`;
    barra.querySelector<HTMLButtonElement>('#salir')!.onclick = () => {
      if (confirm(t('salirExamen'))) ir('examen');
    };
    return;
  }
  if (pantalla === 'estudio') {
    const a = srs.ajustes();
    const regionSel = a.regiones.length === REGIONES.length ? 'todas' : a.regiones[0];
    const modoSel = a.modos.length === TODOS_MODOS.length ? 'mezcla' : a.modos[0];
    const pct = Math.min(100, (100 * sesion.hechas) / Math.max(1, sesion.objetivo));
    const foco = srs.focoActual();
    if (foco) {
      barra.innerHTML = `
      <span class="logo ocultar-movil"><span class="punto"></span>skelly</span>
      <button class="icono" id="salir" title="${t('volver')}">←</button>
      <div class="progreso"><div style="width:${pct}%"></div></div>
      <span class="zona-barra">${'fallos' in foco ? t('misFallos') : `${esc(nombreZona(foco.grupos))} · ${TIPOS_ZONA[foco.tipo]()}`}</span>`;
      barra.querySelector<HTMLButtonElement>('#salir')!.onclick = () => ir('fallos' in foco ? 'inicio' : 'zona');
      return;
    }
    barra.innerHTML = `
      <span class="logo ocultar-movil"><span class="punto"></span>skelly</span>
      <button class="icono" id="salir" title="${t('volver')}">←</button>
      <div class="progreso"><div style="width:${pct}%"></div></div>
      <select id="selRegion">
        <option value="todas">${t('todas')}</option>
        ${REGIONES.map((r) => `<option value="${r.id}" ${regionSel === r.id ? 'selected' : ''}>${nombreRegion(r.id)}</option>`).join('')}
      </select>
      <select id="selModo">
        <option value="mezcla">${t('mezcla')}</option>
        ${(Object.keys(MODOS_T) as Modo[]).map((m) => `<option value="${m}" ${modoSel === m ? 'selected' : ''}>${MODOS_T[m]()}</option>`).join('')}
      </select>`;
    (barra.querySelector('#selRegion') as HTMLSelectElement).value = regionSel;
    (barra.querySelector('#selModo') as HTMLSelectElement).value = modoSel;
    barra.querySelector<HTMLButtonElement>('#salir')!.onclick = () => ir('inicio');
    barra.querySelector<HTMLSelectElement>('#selRegion')!.onchange = (e) => {
      const v = (e.target as HTMLSelectElement).value;
      srs.cambiarAjustes({ regiones: v === 'todas' ? REGIONES.map((r) => r.id) : [v as RegionId] });
      empezarSesion();
    };
    barra.querySelector<HTMLSelectElement>('#selModo')!.onchange = (e) => {
      const v = (e.target as HTMLSelectElement).value;
      srs.cambiarAjustes({ modos: v === 'mezcla' ? TODOS_MODOS : [v as Modo] });
      empezarSesion();
    };
    return;
  }
  const pest: [Pantalla, string][] = [
    ['inicio', t('inicio')],
    ['explorar', t('explorar')],
    ['partes', t('partes')],
    ['ajustes', t('ajustes')],
  ];
  barra.innerHTML = `
    <span class="logo"><span class="punto"></span>skelly</span>
    <nav>${pest.map(([p, n]) => `<button data-p="${p}" class="${pantalla === p || (p === 'ajustes' && pantalla === 'editor') || (p === 'inicio' && (pantalla === 'zona' || pantalla === 'examen')) ? 'activo' : ''}">${n}</button>`).join('')}</nav>`;
  todos<HTMLButtonElement>('[data-p]', barra).forEach((b) => (b.onclick = () => ir(b.dataset.p as Pantalla)));
}

function ir(p: Pantalla) {
  if (p !== 'estudio') srs.enfocar(null);
  pararReloj();
  examen = null;
  visor.onClickPunto = null;
  pantalla = p;
  teclas = null;
  visor.clicable = false;
  visor.quitarHover();
  visor.onClick = null;
  pintarBarra();
  if (p === 'inicio') inicio();
  else if (p === 'estudio') siguienteTarjeta();
  else if (p === 'explorar') explorar();
  else if (p === 'partes') partesUI();
  else if (p === 'ajustes') ajustesUI();
  else if (p === 'zona') zonaUI();
  else if (p === 'examen') examenUI();
  else editor();
}

// ================= INICIO =================
function inicio() {
  const a = srs.ajustes();
  visor.mostrarTodos(vistaEstudio());
  const c = srs.contadores();
  const r = srs.racha();
  const dias = srs.ultimosDias(14);
  const max = Math.max(1, ...dias.map((d) => d.repasos));
  const pct = srs.porcentajeAciertos();
  const hayAlgo = c.pendientes + c.nuevasHoy > 0;
  const nFallos = srs.fallosRecientes().length;
  h(`
    <h1>${t('hola')}</h1>
    <div class="racha"><span class="fuego"><svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2c1 3.5 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 .2 1.6.9 2.6 2 3C11 8 11 5 12 2z"/></svg></span><div><b>${r}</b> ${r === 1 ? t('rachaUno') : t('racha')}</div></div>
    <h3>${t('paraHoy')}</h3>
    <div class="cifras">
      <div class="cifra"><b>${c.nuevasHoy}</b><span>${t('nuevas')}</span></div>
      <div class="cifra"><b>${c.pendientes}</b><span>${t('pendientes')}</span></div>
      <div class="cifra"><b>${c.dominadas}<small style="font-size:.8rem;color:var(--tenue)">/${c.total}</small></b><span>${t('dominadas')}</span></div>
    </div>
    <h3>${t('regiones')}</h3>
    <div class="chips">${REGIONES.map((x) => `<button class="chip ${a.regiones.includes(x.id) ? 'activo' : ''}" data-r="${x.id}">${nombreRegion(x.id)}</button>`).join('')}</div>
    <h3>${t('tipo')}</h3>
    <div class="chips">${(Object.keys(MODOS_T) as Modo[]).map((m) => `<button class="chip ${a.modos.includes(m) ? 'activo' : ''}" data-m="${m}">${MODOS_T[m]()}</button>`).join('')}</div>
    <div class="botones">
      ${hayAlgo ? `<button class="btn principal grande" id="empezar">${t('empezar')}</button>` : `<button class="btn grande" id="mas">${t('estudiarMas')}</button>`}
      <button class="btn grande" id="zona">${t('repasarZona')}</button>
      ${nFallos ? `<button class="btn grande" id="fallos">${t('repasarFallos')} <small>${nFallos}</small></button>` : ''}
      <button class="btn grande" id="examen">${t('examen')}</button>
    </div>
    <h3>${t('ultimos14')}</h3>
    ${
      dias.some((d) => d.repasos)
        ? `<div class="grafica">${dias.map((d) => `<div class="col" title="${d.fecha}: ${d.repasos}"><div class="barra ${d.repasos ? '' : 'vacia'}" style="height:${Math.max(4, (100 * d.repasos) / max)}%"></div><small>${d.dia}</small></div>`).join('')}</div>
           <div class="ayuda">${pct ?? 0}% ${t('aciertos')}</div>`
        : `<div class="ayuda">${t('sinDatos')}</div>`
    }`);
  const alternar = <T>(lista: T[], x: T) => (lista.includes(x) ? (lista.length > 1 ? lista.filter((y) => y !== x) : lista) : [...lista, x]);
  todos<HTMLButtonElement>('[data-r]').forEach(
    (b) =>
      (b.onclick = () => {
        srs.cambiarAjustes({ regiones: alternar(srs.ajustes().regiones, b.dataset.r as RegionId) });
        inicio();
      }),
  );
  todos<HTMLButtonElement>('[data-m]').forEach(
    (b) =>
      (b.onclick = () => {
        srs.cambiarAjustes({ modos: alternar(srs.ajustes().modos, b.dataset.m as Modo) });
        inicio();
      }),
  );
  $('#zona').onclick = () => ir('zona');
  $('#examen').onclick = () => ir('examen');
  if (nFallos)
    $('#fallos').onclick = () => {
      srs.enfocar({ fallos: true });
      empezarSesion();
    };
  if (hayAlgo) $('#empezar').onclick = () => empezarSesion();
  else
    $('#mas').onclick = () => {
      srs.masNuevasHoy(10);
      empezarSesion();
    };
  teclas = (e) => {
    if (e.key === 'Enter' && hayAlgo) empezarSesion();
  };
}

function empezarSesion() {
  const c = srs.contadores();
  // repasando una zona sin nada pendiente: se repasan unas cuantas por adelantado
  // mis fallos: todos los fallados
  const foco = srs.focoActual();
  const base = c.pendientes + c.nuevasHoy;
  const objetivo = foco && 'fallos' in foco ? c.total : foco && !base ? Math.min(20, c.total) : base;
  sesion = { objetivo: Math.max(1, objetivo), hechas: 0 };
  ir('estudio');
}

// ================= ESTUDIO =================
function etiquetaDe(tj: Tarjeta) {
  const pt = partePorId.get(tj.hueso);
  const grupo = pt ? nombreAp(pt.apartado) : nombreGrupo(preguntaPorId.get(tj.hueso)!.grupo);
  return `<div class="etiqueta">${MODOS_T[tj.modo]()} · ${grupo}${srs.esNueva(tj) ? ` <span class="insignia">${t('nueva')}</span>` : ''}</div>`;
}

function siguienteTarjeta() {
  pintarBarra();
  // en una zona siempre queda alguna tarjeta: se para al llegar al objetivo
  if (srs.focoActual() && sesion.hechas >= sesion.objetivo) return terminado();
  const tj = srs.siguiente(huesoAnterior);
  if (!tj) return terminado();
  huesoAnterior = tj.hueso;
  const hb = preguntaDe(tj);
  const etiqueta = etiquetaDe(tj);

  if (tj.modo === 'localizar') return tarjetaLocalizar(tj, etiqueta);
  if (tj.modo === 'localizarParte') return tarjetaLocalizarParte(tj, etiqueta);
  const pt = partePorId.get(tj.hueso);
  if (pt) {
    // parte de un hueso: se pinta en violeta sobre el hueso
    mostrado = '';
    const ids = huesosDe(pt.apartado);
    visor.mostrarParte(ids, zonasDe(pt.parte, ids, pt.id), pt.parte.dir);
  } else {
    mostrado = tj.modo === 'conjunto' ? tj.hueso : azar(hb.miembros);
    if (tj.modo === 'aislado') visor.mostrarAislado(mostrado);
    else visor.mostrarConjunto(mostrado, esCompleto());
  }

  const n = nombre(hb);
  const p = pista(n, srs.nivelDe(tj));
  h(`
    ${etiqueta}
    <h2>${tj.modo === 'partes' ? t('queParte') : tj.modo === 'aislado' ? t('queHueso') : t('queResaltado')}</h2>
    <div id="respuesta"></div>
    <div class="botones">
      <button class="btn" id="nose">${t('noSe')}</button>
      <button class="btn principal" id="ok">${t('comprobar')} <small>Enter</small></button>
    </div>
    <div class="ayuda">${t('ayudaGirar')}</div>`);
  const campo = crearCampo($('#respuesta'), n, p);
  const enviar = (rendirse: boolean) => corregir(tj, rendirse ? [] : campo.valores(), etiqueta);
  $('#ok').onclick = () => enviar(false);
  $('#nose').onclick = () => enviar(true);
  teclas = (e) => {
    if (e.key === 'Enter') enviar(false);
  };
}

/** Campo de respuesta: se escribe sobre los guiones; las letras de pista no se mueven. */
function crearCampo(cont: HTMLElement, n: string, p: (string | null)[] | null) {
  if (!p) {
    cont.innerHTML = `<input class="libre" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${t('escribeLibre')}"/>`;
    const inp = cont.querySelector('input')!;
    setTimeout(() => inp.focus(), 50);
    return { valores: () => [inp.value] };
  }
  // posiciones de letras (sin espacios) agrupadas por palabra
  let k = 0;
  const palabras = n.split(' ').map((w) => [...w].map(() => k++));
  const total = k;
  cont.innerHTML = `
    <div class="huecos">
      ${palabras.map((ws) => `<div class="palabra">${ws.map((i) => `<span class="h" data-i="${i}"></span>`).join('')}</div>`).join('')}
      <span class="sobra"></span>
      <input type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="${t('escribe')}"/>
    </div>`;
  const caja = cont.querySelector<HTMLElement>('.huecos')!;
  const inp = caja.querySelector('input')!;
  const pistaLetras = p.filter((c) => c !== ' ');
  const slots = todos<HTMLElement>('.h', caja);
  const sobra = caja.querySelector<HTMLElement>('.sobra')!;
  const letras = () => inp.value.replace(/\s+/g, '');
  const pintar = () => {
    const l = [...letras()];
    slots.forEach((s, i) => {
      const escrita = l[i];
      s.textContent = escrita ?? pistaLetras[i] ?? '';
      s.className = `h ${escrita ? 'escrita' : pistaLetras[i] ? 'pista' : ''} ${i === l.length && document.activeElement === inp ? 'cursor' : ''}`;
    });
    sobra.textContent = l.slice(total).join('');
  };
  inp.addEventListener('input', pintar);
  inp.addEventListener('focus', () => {
    caja.classList.add('foco');
    pintar();
  });
  inp.addEventListener('blur', () => {
    caja.classList.remove('foco');
    pintar();
  });
  // mantener el cursor siempre al final (se escribe en orden sobre los guiones)
  inp.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  });
  inp.addEventListener('select', () => inp.setSelectionRange(inp.value.length, inp.value.length));
  pintar();
  setTimeout(() => inp.focus(), 50);
  return {
    valores: () => {
      const l = [...letras()];
      // reconstruye el nombre con los espacios en su sitio
      let i = 0;
      const conEspacios = n
        .split(' ')
        .map((w) => [...w].map(() => l[i++] ?? '').join(''))
        .join(' ') + l.slice(total).join('');
      return [inp.value, conEspacios];
    },
  };
}

function cajaResultado(r: Resultado, correcto: string, respuesta: string) {
  const tuya = respuesta.trim() ? `<div class="ayuda">${t('tu')}: ${esc(respuesta)}</div>` : '';
  const nombreHtml = `<span class="correcto">${esc(mayus(correcto))}</span>`;
  if (r === 'exacto') return `<div class="resultado bien">✓ ${t('correcto')}${nombreHtml}</div>`;
  if (r === 'errata') return `<div class="resultado casi">✓ ${t('errata')}${nombreHtml}${tuya}</div>`;
  if (r === 'sinLado') return `<div class="resultado casi">${t('sinLado')}${nombreHtml}${tuya}</div>`;
  return `<div class="resultado mal">${respuesta.trim() ? t('incorrecto') : t('aprende')}${nombreHtml}${tuya}</div>`;
}

function corregir(tj: Tarjeta, respuestas: string[], etiqueta: string) {
  const hb = preguntaDe(tj);
  const r = respuestas.length ? comprobarVarias(hb, respuestas) : 'mal';
  const acierto = r === 'exacto' || r === 'errata';
  const casi = r === 'sinLado';
  sonar(acierto);
  if (mostrado) visor.marcar(mostrado, acierto ? 'acierto' : 'error');
  h(`${etiqueta}${cajaResultado(r, nombre(hb), respuestas[0] ?? '')}${botonesNota(tj, acierto, casi)}${sinonimosHtml(sinonimos(hb), nombre(hb))}`);
  conectarNotas(tj, acierto, casi);
}

function sonar(bien: boolean) {
  if (!srs.ajustes().sonido) return;
  try {
    if (bien) sonidoAcierto();
    else sonidoFallo();
  } catch {
    /* sin audio */
  }
}

function sinonimosHtml(s: string[], principal = '') {
  const p = principal.toLowerCase();
  const otros = s.filter((x) => x.toLowerCase() !== p).slice(0, 4);
  return otros.length ? `<div class="ayuda">${t('tambien')}: ${otros.map(esc).join(' · ')}</div>` : '';
}

function botonesNota(tj: Tarjeta, acierto: boolean, casi = false) {
  const iv = srs.intervalos(tj);
  if (!acierto && !casi)
    return `<div class="botones">
      <button class="btn again principal" data-n="${Rating.Again}">${t('otraVez')} <small>${iv[Rating.Again]} · Enter</small></button>
      ${tj.modo !== 'localizar' && tj.modo !== 'localizarParte' ? `<button class="btn hard" data-n="${Rating.Hard}">${t('loSabia')} <small>${iv[Rating.Hard]}</small></button>` : ''}
    </div>`;
  if (casi)
    return `<div class="botones">
      <button class="btn again" data-n="${Rating.Again}">${t('otraVez')} <small>${iv[Rating.Again]}</small></button>
      <button class="btn hard principal" data-n="${Rating.Hard}">${t('dificil')} <small>${iv[Rating.Hard]} · Enter</small></button>
    </div>`;
  return `<div class="botones">
      <button class="btn hard" data-n="${Rating.Hard}">${t('dificil')} <small>${iv[Rating.Hard]} · 1</small></button>
      <button class="btn good principal" data-n="${Rating.Good}">${t('bien')} <small>${iv[Rating.Good]} · Enter</small></button>
      <button class="btn easy" data-n="${Rating.Easy}">${t('facil')} <small>${iv[Rating.Easy]} · 3</small></button>
    </div>`;
}

function conectarNotas(tj: Tarjeta, acierto: boolean, casi = false) {
  const notar = (n: Grade) => {
    srs.responder(tj, n);
    if (n !== Rating.Again) sesion.hechas++;
    siguienteTarjeta();
  };
  todos<HTMLButtonElement>('[data-n]').forEach((b) => (b.onclick = () => notar(Number(b.dataset.n) as Grade)));
  // pequeño retraso para que el Enter de "Comprobar" no puntúe sin querer
  teclas = null;
  setTimeout(() => {
    if (pantalla !== 'estudio') return;
    teclas = (e) => {
      if (e.key === 'Enter') notar(acierto ? Rating.Good : casi ? Rating.Hard : Rating.Again);
      else if (acierto && e.key === '1') notar(Rating.Hard);
      else if (acierto && e.key === '3') notar(Rating.Easy);
    };
  }, 250);
}

function tarjetaLocalizar(tj: Tarjeta, etiqueta: string) {
  const hb = preguntaDe(tj);
  visor.mostrarTodos(hb.region, true, esCompleto());
  visor.clicable = true;
  h(`
    ${etiqueta}
    <h2>${t('pincha')}</h2>
    <div class="objetivo">${esc(mayus(nombre(hb)))}</div>
    <div class="botones"><button class="btn" id="nose">${t('noSe')}</button></div>
    <div class="ayuda">${t('ayudaPinchar')}</div>`);
  const resolver = (elegido: string | null) => {
    visor.clicable = false;
    visor.quitarHover();
    // en tipos (vértebra cervical…) vale cualquiera de ellas
    const ok = !!elegido && hb.miembros.includes(elegido);
    sonar(ok);
    if (elegido && !ok) visor.marcar(elegido, 'error');
    if (ok) visor.marcar(elegido!, 'acierto');
    else hb.miembros.forEach((m) => visor.marcar(m, 'resalte'));
    const caja = ok
      ? `<div class="resultado bien">✓ ${t('correcto')}<span class="correcto">${esc(mayus(nombre(hb)))}</span></div>`
      : `<div class="resultado mal">${elegido ? `${t('eseEs')} <b>${esc(nombre(huesoPorId.get(elegido)!))}</b>. ` : ''}<b>${esc(mayus(nombre(hb)))}</b> ${t('estaEn')}</div>`;
    h(`${etiqueta}${caja}${botonesNota(tj, ok)}`);
    conectarNotas(tj, ok);
  };
  visor.onClick = (id) => resolver(id);
  $('#nose').onclick = () => resolver(null);
}

/** Localizar la parte: se ve el hueso sin pintar y hay que tocar dónde está la parte. */
function tarjetaLocalizarParte(tj: Tarjeta, etiqueta: string) {
  const pt = partePorId.get(tj.hueso)!;
  const ids = huesosDe(pt.apartado);
  const zonas = zonasDe(pt.parte, ids, pt.id);
  mostrado = '';
  visor.mostrarParte(ids, new Map(), pt.parte.dir);
  visor.clicable = true;
  h(`
    ${etiqueta}
    <h2>${t('tocaParte')}</h2>
    <div class="objetivo">${esc(mayus(nombre(pt)))}</div>
    <div class="botones"><button class="btn" id="nose">${t('noSe')}</button></div>
    <div class="ayuda">${t('ayudaPinchar')}</div>`);
  const resolver = (id: string | null, punto: [number, number, number] | null) => {
    visor.clicable = false;
    visor.onClickPunto = null;
    visor.quitarHover();
    const ok = !!id && !!punto && tocaLaParte(id, punto, zonas.get(id));
    sonar(ok);
    // se enseña dónde estaba
    visor.pintarZonas(zonas);
    const caja = ok
      ? `<div class="resultado bien">✓ ${t('correcto')}<span class="correcto">${esc(mayus(nombre(pt)))}</span></div>`
      : `<div class="resultado mal">${t('parteAqui')}<span class="correcto">${esc(mayus(nombre(pt)))}</span></div>`;
    h(`${etiqueta}${caja}${botonesNota(tj, ok)}${sinonimosHtml(sinonimos(pt), nombre(pt))}`);
    conectarNotas(tj, ok);
  };
  visor.onClickPunto = (id, punto) => resolver(id, punto);
  $('#nose').onclick = () => resolver(null, null);
}
/** ¿El punto tocado cae en la parte o muy cerca (6 mm o un 4 % del hueso)? */
function tocaLaParte(id: string, punto: [number, number, number], zs?: Zona[]) {
  const m = visor.mallaNorm(id);
  if (!m || !zs?.length) return false;
  const w = pesos(m, zs);
  const x = m.espejo ? 1 - punto[0] : punto[0];
  const p = [m.min[0] + x * m.tam[0], m.min[1] + punto[1] * m.tam[1], m.min[2] + punto[2] * m.tam[2]];
  const tol = Math.max(0.06, 0.04 * m.maxTam);
  for (let i = 0; i < w.length; i++) {
    if (w[i] < 0.5) continue;
    if (Math.hypot(m.pos[i * 3] - p[0], m.pos[i * 3 + 1] - p[1], m.pos[i * 3 + 2] - p[2]) < tol) return true;
  }
  return false;
}

function terminado() {
  sesion.hechas = sesion.objetivo;
  pintarBarra();
  visor.mostrarTodos(vistaEstudio());
  const c = srs.contadores();
  h(`
    <h1>${t('hecho')}</h1>
    <p class="ayuda">${t('hechoTexto')}</p>
    ${srs.focoActual() ? `<div class="botones"><button class="btn principal" id="otraVez">${t('zonaOtraVez')}</button>${'fallos' in srs.focoActual()! ? '' : `<button class="btn" id="otraZona">${t('repasarZona')}</button>`}</div>` : ''}
    ${c.sinVer && !srs.focoActual() ? `<div class="botones"><button class="btn principal" id="mas">${t('estudiarMas')}</button></div>` : ''}
    <div class="botones"><button class="btn" id="volver">${t('volver')}</button></div>`);
  if (srs.focoActual()) {
    $('#otraVez').onclick = () => empezarSesion();
    $('#otraZona')?.addEventListener('click', () => ir('zona'));
  } else if (c.sinVer)
    $('#mas').onclick = () => {
      srs.masNuevasHoy(10);
      empezarSesion();
    };
  $('#volver').onclick = () => ir('inicio');
}

// ================= REPASAR UNA ZONA =================
// Se elige qué repasar (huesos, partes o ambos) y un grupo de huesos (o toda la región).
let tipoZona: srs.TipoZona = 'ambos';
const TIPOS_ZONA: Record<srs.TipoZona, () => string> = { huesos: () => t('zonaHuesos'), partes: () => t('zonaPartes'), ambos: () => t('zonaAmbos') };
const regionDeGrupo = (g: Grupo) => HUESOS.find((x) => x.grupo === g)?.region;
function nombreZona(gs: Grupo[]) {
  if (gs.length === 1) return nombreGrupo(gs[0]);
  const r = regionDeGrupo(gs[0]);
  return r ? nombreRegion(r) : gs.map(nombreGrupo).join(', ');
}
function zonaUI() {
  visor.mostrarTodos('completo');
  const grupos = Object.keys(GRUPOS) as Grupo[];
  const boton = (gs: Grupo[], txt: string) => {
    const k = srs.tarjetasDeZona(gs, tipoZona).length;
    return `<button class="chip" data-zg="${gs.join(',')}" ${k ? '' : 'disabled'}>${esc(txt)} <small>${k}</small></button>`;
  };
  h(`
    <h2>${t('repasarZona')}</h2>
    <div class="ayuda">${t('zonaAyuda')}</div>
    <div class="chips">${(Object.keys(TIPOS_ZONA) as srs.TipoZona[]).map((k) => `<button class="chip ${tipoZona === k ? 'activo' : ''}" data-tz="${k}">${TIPOS_ZONA[k]()}</button>`).join('')}</div>
    ${REGIONES.map((r) => {
      const gs = grupos.filter((g) => regionDeGrupo(g) === r.id);
      return `<h3>${nombreRegion(r.id)}</h3><div class="chips">${boton(gs, t('zonaToda'))}${gs.map((g) => boton([g], nombreGrupo(g))).join('')}</div>`;
    }).join('')}
    <div class="botones"><button class="btn" id="volver">${t('volver')}</button></div>`);
  todos<HTMLButtonElement>('[data-tz]').forEach(
    (b) =>
      (b.onclick = () => {
        tipoZona = b.dataset.tz as srs.TipoZona;
        zonaUI();
      }),
  );
  todos<HTMLButtonElement>('[data-zg]').forEach((b) => {
    const gs = b.dataset.zg!.split(',') as Grupo[];
    // al pasar por encima se ven los huesos de la zona
    b.onpointerenter = () => {
      visor.limpiarMarcas();
      HUESOS.filter((x) => gs.includes(x.grupo)).forEach((x) => visor.marcar(x.id, 'resalte'));
    };
    b.onpointerleave = () => visor.limpiarMarcas();
    b.onclick = () => {
      visor.limpiarMarcas();
      srs.enfocar({ grupos: gs, tipo: tipoZona });
      empezarSesion();
    };
  });
  $('#volver').onclick = () => ir('inicio');
}

// ================= EXAMEN PRÁCTICO =================
// Como el examen de disección: sin pistas, con tiempo y nota al final. No cambia los repasos (solo guarda los fallos).
const examenCfg = { n: 20, seg: 45 };
let examen: { preguntas: Tarjeta[]; i: number; res: { tj: Tarjeta; resp: string; ok: boolean }[]; reloj: number; grupos: Grupo[] } | null = null;
function pararReloj() {
  if (examen?.reloj) {
    clearInterval(examen.reloj);
    examen.reloj = 0;
  }
}
const preguntasExamen = (gs: Grupo[]) => srs.tarjetasDeZona(gs, tipoZona, ['aislado', 'partes']);
function barajar<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function examenUI() {
  visor.mostrarTodos('completo');
  const grupos = Object.keys(GRUPOS) as Grupo[];
  const boton = (gs: Grupo[], txt: string) => {
    const k = preguntasExamen(gs).length;
    return `<button class="chip" data-zg="${gs.join(',')}" ${k ? '' : 'disabled'}>${esc(txt)} <small>${k}</small></button>`;
  };
  const chip = (attr: string, v: number, activo: boolean, txt: string) => `<button class="chip ${activo ? 'activo' : ''}" ${attr}="${v}">${txt}</button>`;
  h(`
    <h2>${t('examen')}</h2>
    <div class="ayuda">${t('examenAyuda')}</div>
    <div class="chips">${(Object.keys(TIPOS_ZONA) as srs.TipoZona[]).map((k) => `<button class="chip ${tipoZona === k ? 'activo' : ''}" data-tz="${k}">${TIPOS_ZONA[k]()}</button>`).join('')}</div>
    <h3>${t('examenPreguntas')}</h3>
    <div class="chips">${[10, 20, 30].map((n) => chip('data-en', n, examenCfg.n === n, String(n))).join('')}</div>
    <h3>${t('examenTiempo')}</h3>
    <div class="chips">${[30, 45, 60, 0].map((n) => chip('data-es', n, examenCfg.seg === n, n ? `${n} s` : t('sinLimite'))).join('')}</div>
    <div class="ayuda">${t('examenZona')}</div>
    ${REGIONES.map((r) => {
      const gs = grupos.filter((g) => regionDeGrupo(g) === r.id);
      return `<h3>${nombreRegion(r.id)}</h3><div class="chips">${boton(gs, t('zonaToda'))}${gs.map((g) => boton([g], nombreGrupo(g))).join('')}</div>`;
    }).join('')}
    <div class="botones"><button class="btn" id="volver">${t('volver')}</button></div>`);
  todos<HTMLButtonElement>('[data-tz]').forEach((b) => (b.onclick = () => ((tipoZona = b.dataset.tz as srs.TipoZona), examenUI())));
  todos<HTMLButtonElement>('[data-en]').forEach((b) => (b.onclick = () => ((examenCfg.n = Number(b.dataset.en)), examenUI())));
  todos<HTMLButtonElement>('[data-es]').forEach((b) => (b.onclick = () => ((examenCfg.seg = Number(b.dataset.es)), examenUI())));
  todos<HTMLButtonElement>('[data-zg]').forEach((b) => {
    const gs = b.dataset.zg!.split(',') as Grupo[];
    b.onpointerenter = () => {
      visor.limpiarMarcas();
      HUESOS.filter((x) => gs.includes(x.grupo)).forEach((x) => visor.marcar(x.id, 'resalte'));
    };
    b.onpointerleave = () => visor.limpiarMarcas();
    b.onclick = () => {
      visor.limpiarMarcas();
      examen = { preguntas: barajar(preguntasExamen(gs)).slice(0, examenCfg.n), i: 0, res: [], reloj: 0, grupos: gs };
      preguntaExamen();
    };
  });
  $('#volver').onclick = () => ir('inicio');
}
function preguntaExamen() {
  const ex = examen;
  if (!ex) return;
  pararReloj();
  if (ex.i >= ex.preguntas.length) return resultadoExamen();
  pintarBarra();
  const tj = ex.preguntas[ex.i];
  const hb = preguntaDe(tj);
  const pt = partePorId.get(tj.hueso);
  if (pt) {
    const ids = huesosDe(pt.apartado);
    visor.mostrarParte(ids, zonasDe(pt.parte, ids, pt.id), pt.parte.dir);
  } else visor.mostrarAislado(azar(hb.miembros));
  h(`
    <div class="etiqueta">${t('examen')} · ${ex.i + 1}/${ex.preguntas.length}</div>
    <h2>${pt ? t('queParte') : t('queHueso')}</h2>
    ${examenCfg.seg ? '<div class="reloj"><div id="reloj"></div></div><div class="ayuda" id="segs"></div>' : ''}
    <div id="respuesta"></div>
    <div class="botones">
      <button class="btn" id="saltar">${t('saltar')}</button>
      <button class="btn principal" id="ok">${t('siguiente')} <small>Enter</small></button>
    </div>`);
  // sin pistas, como en el examen
  const campo = crearCampo($('#respuesta'), nombre(hb), null);
  let hecho = false;
  const enviar = (saltar: boolean) => {
    if (hecho || examen !== ex) return;
    hecho = true;
    pararReloj();
    const resp = saltar ? '' : campo.valores()[0];
    const ok = !!resp.trim() && comprobarVarias(hb, campo.valores()) !== 'mal';
    ex.res.push({ tj, resp, ok });
    ex.i++;
    preguntaExamen();
  };
  $('#ok').onclick = () => enviar(false);
  $('#saltar').onclick = () => enviar(true);
  teclas = (e) => {
    if (e.key === 'Enter') enviar(false);
  };
  if (examenCfg.seg) {
    const fin = Date.now() + examenCfg.seg * 1000;
    const tick = () => {
      const queda = Math.max(0, fin - Date.now());
      const barraR = document.getElementById('reloj');
      if (barraR) barraR.style.width = `${(100 * queda) / (examenCfg.seg * 1000)}%`;
      const txt = document.getElementById('segs');
      if (txt) txt.textContent = `${Math.ceil(queda / 1000)} s`;
      if (queda <= 0) enviar(false);
    };
    tick();
    ex.reloj = window.setInterval(tick, 200);
  }
}
function resultadoExamen() {
  const ex = examen!;
  pararReloj();
  teclas = null;
  const n = ex.res.length;
  const bien = ex.res.filter((r) => r.ok).length;
  const nota = n ? Math.round((100 * bien) / n) / 10 : 0;
  // lo fallado va a «mis fallos»
  ex.res.filter((r) => !r.ok).forEach((r) => srs.marcarFallo(r.tj));
  sonar(nota >= 5);
  pintarBarra();
  visor.mostrarTodos('completo');
  h(`
    <h1>${t('notaExamen')}: ${nota.toLocaleString(idioma())} / 10</h1>
    <p class="ayuda">${t('acertadas')}: ${bien} / ${n}</p>
    <div class="lista-examen">${ex.res
      .map((r) => {
        const hb = preguntaDe(r.tj);
        return `<div class="fila ${r.ok ? 'bien' : 'mal'}"><span class="marca">${r.ok ? '✓' : '✗'}</span><div><b>${esc(mayus(nombre(hb)))}</b>${r.ok ? '' : `<div class="ayuda">${t('tu')}: ${esc(r.resp.trim() || '—')}</div>`}</div></div>`;
      })
      .join('')}</div>
    <div class="botones">
      ${bien < n ? `<button class="btn principal" id="fallosEx">${t('repasarFallos')}</button>` : ''}
      <button class="btn" id="otroEx">${t('otroExamen')}</button>
    </div>`);
  if (bien < n)
    $('#fallosEx').onclick = () => {
      examen = null;
      srs.enfocar({ fallos: true });
      empezarSesion();
    };
  $('#otroEx').onclick = () => ir('examen');
}

// ================= EXPLORAR =================
let filtroExplorar: Grupo | 'todos' = 'todos';
function explorar() {
  visor.mostrarTodos(regionVista);
  visor.clicable = true;
  const pintar = (id: string | null) => {
    const hb = id ? huesoPorId.get(id)! : null;
    const grupos = [...new Set(deVista(regionVista).map((x) => x.grupo))];
    const lista = deVista(regionVista).filter((x) => filtroExplorar === 'todos' || x.grupo === filtroExplorar);
    h(`
      <h2>${t('explorarTitulo')}</h2>
      ${chipsVista(regionVista)}
      <div class="ayuda">${t('explorarAyuda')}</div>
      ${
        hb
          ? `<div class="objetivo"><div class="etiqueta">${nombreGrupo(hb.grupo)}</div>${esc(mayus(nombre(hb)))}</div>${sinonimosHtml(sinonimos(hb), nombre(hb))}`
          : `<div class="resultado">${t('pinchaUno')}</div>`
      }
      <div class="separador"></div>
      <div class="chips">
        <button class="chip ${filtroExplorar === 'todos' ? 'activo' : ''}" data-g="todos">${t('todos')}</button>
        ${grupos.map((g) => `<button class="chip ${filtroExplorar === g ? 'activo' : ''}" data-g="${g}">${nombreGrupo(g)}</button>`).join('')}
      </div>
      <h3>${t('lista')}</h3>
      <div class="chips">${lista.map((x) => `<button class="chip ${x.id === id ? 'activo' : ''}" data-h="${x.id}">${esc(nombre(x))}</button>`).join('')}</div>`);
    todos<HTMLButtonElement>('[data-reg]').forEach(
      (b) =>
        (b.onclick = () => {
          regionVista = b.dataset.reg as Vista;
          filtroExplorar = 'todos';
          explorar();
        }),
    );
    todos<HTMLButtonElement>('[data-g]').forEach(
      (b) =>
        (b.onclick = () => {
          filtroExplorar = b.dataset.g as Grupo | 'todos';
          visor.limpiarMarcas();
          if (filtroExplorar !== 'todos') HUESOS.filter((x) => x.grupo === filtroExplorar).forEach((x) => visor.marcar(x.id, 'resalte'));
          pintar(null);
        }),
    );
    todos<HTMLButtonElement>('[data-h]').forEach(
      (b) =>
        (b.onclick = () => {
          elegir(b.dataset.h!);
          visor.enfocarHueso(b.dataset.h!);
        }),
    );
  };
  const elegir = (id: string) => {
    visor.limpiarMarcas();
    visor.marcar(id, 'resalte');
    pintar(id);
  };
  visor.onClick = elegir;
  pintar(null);
}

// ================= PARTES DE CADA HUESO =================
// Apartados de la guía → partes. La parte elegida se pinta en violeta.
// Editor: si una zona está mal, se corrige tocando el hueso (cada toque pinta una bola).
let partesAp: string | null = null;
let partesParte: string | null = null;
let partesHueso = 0;
/** zonas mientras se pinta, por hueso (null = no se está pintando) */
let borrador: Map<string, Zona[]> | null = null;
/** huesos de cada bola pintada, en orden (para deshacer) */
let pilaEd: string[] = [];
/** al añadir una parte nueva: su nombre y otros nombres (null = se está corrigiendo una parte que ya existe) */
let nuevaParte: { nombre: string; sin: string } | null = null;
let radioEd = 0.08;
function partesUI(reencuadrar = true) {
  visor.clicable = true;
  visor.onClick = null;
  visor.onClickPunto = null;
  const ap = partesAp ? apartadoPorId.get(partesAp) : null;
  if (!ap) {
    borrador = null;
    nuevaParte = null;
    visor.mostrarTodos(vistaEstudio(), false);
    const secciones = [...new Set(APARTADOS.map((a) => a.seccion))];
    const nCambios = hayCambiosPropios();
    h(`
      <h2>${t('partesTitulo')}</h2>
      <div class="ayuda">${t('partesAyuda')}</div>
      ${secciones
        .map(
          (s) =>
            `<h3>${esc(s)}</h3><div class="lista-partes">${APARTADOS.filter((a) => a.seccion === s)
              .map((a) => `<button class="fila" data-ap="${a.id}"><span>${esc(nombreAp(a))}</span><small>${a.partes.length} ${a.partes.length === 1 ? t('parteN') : t('partesN')}</small></button>`)
              .join('')}</div>`,
        )
        .join('')}
      <h3>${t('otrosDispositivos')}</h3>
      <div class="ayuda">${t('ayudaDispositivos')}</div>
      ${nCambios ? `<div class="ayuda">${t('cambiosTuyos')}: ${nCambios}</div>` : ''}
      <div class="botones">
        ${nCambios ? `<button class="btn" id="copiar">${t('copiarCorr')}</button>` : ''}
        <button class="btn" id="pegar">${t('pegarCambios')}</button>
      </div>`);
    todos<HTMLButtonElement>('[data-ap]').forEach(
      (b) =>
        (b.onclick = () => {
          partesAp = b.dataset.ap!;
          partesParte = null;
          partesHueso = 0;
          partesUI();
        }),
    );
    if (nCambios)
      $('#copiar').onclick = async () => {
        const txt = JSON.stringify(cambiosPropios());
        try {
          await navigator.clipboard.writeText(txt);
          $('#copiar').textContent = t('copiado');
        } catch {
          prompt(t('copiarCorr'), txt);
        }
      };
    $('#pegar').onclick = async () => {
      // primero se intenta leer el portapapeles; si no deja, se pide pegarlo a mano
      let txt = '';
      try {
        txt = await navigator.clipboard.readText();
      } catch {
        /* sin permiso */
      }
      if (!txt.trim().startsWith('{')) txt = prompt(t('pegaAqui')) ?? '';
      if (!txt.trim()) return;
      try {
        const n = importarCambios(txt);
        alert(`${t('cambiosPegados')}: ${n}`);
        partesUI();
      } catch {
        alert(t('cambiosMal'));
      }
    };
    return;
  }
  const ids = huesosDe(ap, partesHueso);
  const parte = ap.partes.find((p) => p.id === partesParte) ?? null;
  const pp = parte ? partePorId.get(`PT:${ap.id}:${parte.id}`)! : null;
  const zonasAhora = () =>
    borrador ? new Map(ids.map((id) => [id, borrador!.get(id) ?? []])) : parte ? zonasDe(parte, ids, pp!.id) : new Map<string, Zona[]>();
  if (reencuadrar) visor.mostrarParte(ids, zonasAhora(), borrador && nuevaParte ? undefined : parte?.dir);
  else visor.pintarZonas(zonasAhora());
  const variosHuesos = !ap.conjunto && ap.huesos.length > 1;
  const corregida = pp ? !!zonasCorregidas()[pp.id] : false;
  // las bolas pintadas, tal como se guardan: una lista para todos los huesos, o una por hueso si se ven juntos
  const zonasBorrador = () => (ap.conjunto ? Object.fromEntries([...borrador!].filter(([, z]) => z.length)) : (borrador!.get(ids[0]) ?? []));
  const nBolas = () => [...(borrador?.values() ?? [])].reduce((s, z) => s + z.length, 0);

  if (borrador && (pp || nuevaParte)) {
    // ---------- pintar: corregir una parte o crear una nueva ----------
    const np = nuevaParte;
    h(`
      <h2>${np ? t('nuevaParte') : t('corrigiendo')}</h2>
      ${
        np
          ? `<div class="etiqueta">${esc(nombreAp(ap))}</div>
             <input class="campo" id="nombreP" placeholder="${t('nombreParte')}" value="${esc(np.nombre)}"/>
             <input class="campo" id="sinP" placeholder="${t('sinonimosParte')}" value="${esc(np.sin)}"/>
             <div class="ayuda">${t('ayudaNueva')}</div>`
          : `<div class="objetivo"><div class="etiqueta">${esc(nombreAp(ap))}</div>${esc(mayus(nombre(pp!)))}</div>
             <div class="ayuda">${t('ayudaEditor')}</div>`
      }
      <div class="fila"><span>${t('tamBola')}</span><input type="range" id="radio" min="0.02" max="0.25" step="0.01" value="${radioEd}"/></div>
      <div class="botones">
        <button class="btn" id="deshacer" ${pilaEd.length ? '' : 'disabled'}>${t('deshacer')}</button>
        <button class="btn" id="cero">${t('deCero')}</button>
      </div>
      <div class="resultado" id="aviso" hidden>${t('faltaNombre')}</div>
      <div class="botones">
        <button class="btn" id="cancelar">${t('cancelar')}</button>
        <button class="btn principal" id="guardar">${t('guardar')}</button>
      </div>`);
    if (np) {
      $<HTMLInputElement>('#nombreP').oninput = (e) => (np.nombre = (e.target as HTMLInputElement).value);
      $<HTMLInputElement>('#sinP').oninput = (e) => (np.sin = (e.target as HTMLInputElement).value);
      if (!np.nombre) $<HTMLInputElement>('#nombreP').focus();
    }
    $<HTMLInputElement>('#radio').oninput = (e) => (radioEd = +(e.target as HTMLInputElement).value);
    $('#deshacer').onclick = () => {
      const id = pilaEd.pop();
      if (id) borrador!.get(id)?.pop();
      partesUI(false);
    };
    $('#cero').onclick = () => {
      borrador = new Map();
      pilaEd = [];
      partesUI(false);
    };
    $('#cancelar').onclick = () => {
      borrador = null;
      nuevaParte = null;
      partesUI(false);
    };
    $('#guardar').onclick = () => {
      if (np) {
        const n = np.nombre.trim();
        if (!n || !nBolas()) {
          $('#aviso').hidden = false;
          return;
        }
        const sin = np.sin.split(',').map((s) => s.trim()).filter(Boolean);
        partesParte = anadirParte(ap.id, n, sin, zonasBorrador());
      } else guardarZonas(pp!.id, zonasBorrador());
      borrador = null;
      nuevaParte = null;
      partesUI(false);
    };
    visor.onClickPunto = (id, punto) => {
      if (!borrador!.has(id)) borrador!.set(id, []);
      borrador!.get(id)!.push({ c: punto, r: radioEd });
      pilaEd.push(id);
      partesUI(false);
    };
    return;
  }

  const borradas = borradasEn(ap.id);
  h(`
    <button class="volver" id="atras">← ${t('partes')}</button>
    <h2>${esc(nombreAp(ap))}</h2>
    ${
      pp
        ? `<div class="objetivo"><div class="etiqueta">${t('parteSel')}${corregida ? ` · ${t('corregida')}` : ''}${esPropia(ap.id, parte!.id) ? ` · ${t('parteTuya')}` : ''}</div>${esc(mayus(nombre(pp)))}</div>${sinonimosHtml(sinonimos(pp), nombre(pp))}`
        : `<div class="resultado">${t('eligeParte')}</div>`
    }
    <div class="botones">
      ${variosHuesos ? `<button class="btn" id="otro">${t('otroEjemplo')}</button>` : ''}
      ${pp ? `<button class="btn" id="corregir">${t('corregirZona')}</button>` : ''}
      ${corregida ? `<button class="btn" id="original">${t('zonaOriginal')}</button>` : ''}
      ${pp ? `<button class="btn peligro" id="eliminar">${t('eliminarParte')}</button>` : ''}
    </div>
    <div class="lista-partes">${ap.partes
      .map((p) => {
        const q = partePorId.get(`PT:${ap.id}:${p.id}`)!;
        return `<button class="fila ${p.id === partesParte ? 'activo' : ''}" data-parte="${p.id}"><span>${esc(mayus(nombre(q)))}</span>${esPropia(ap.id, p.id) ? `<small>${t('parteTuya')}</small>` : ''}</button>`;
      })
      .join('')}</div>
    <div class="botones">
      <button class="btn" id="anadir">${t('anadirParte')}</button>
      ${borradas ? `<button class="btn" id="recuperar">${t('recuperarBorradas')} (${borradas})</button>` : ''}
    </div>`);
  const elegir = (id: string) => {
    partesParte = id;
    partesUI();
  };
  todos<HTMLButtonElement>('[data-parte]').forEach((b) => (b.onclick = () => elegir(b.dataset.parte!)));
  $('#atras').onclick = () => {
    partesAp = null;
    partesUI();
  };
  if (variosHuesos)
    $('#otro').onclick = () => {
      partesHueso = (partesHueso + 1) % ap.huesos.length;
      partesUI();
    };
  if (pp) {
    $('#corregir').onclick = () => {
      const z = zonasDe(parte!, ids, pp.id);
      borrador = new Map(ids.map((id) => [id, [...(z.get(id) ?? [])]]));
      pilaEd = [];
      nuevaParte = null;
      partesUI(false);
    };
    $('#eliminar').onclick = () => {
      if (!confirm(t('eliminarSeguro'))) return;
      eliminarParte(ap.id, parte!.id);
      partesParte = null;
      partesUI(false);
    };
  }
  $('#anadir').onclick = () => {
    partesParte = null;
    borrador = new Map();
    pilaEd = [];
    nuevaParte = { nombre: '', sin: '' };
    partesUI(false);
  };
  if (borradas)
    $('#recuperar').onclick = () => {
      recuperarBorradas(ap.id);
      partesUI(false);
    };
  if (corregida)
    $('#original').onclick = () => {
      guardarZonas(pp!.id, null);
      partesUI(false);
    };
  // tocar el hueso: elige la parte más concreta que hay en ese punto
  visor.onClickPunto = (id, punto) => {
    const mn = visor.mallaNorm(id);
    if (!mn) return;
    let mejor: { id: string; tam: number } | null = null;
    for (const p of ap.partes) {
      const zs = zonasDe(p, [id], `PT:${ap.id}:${p.id}`).get(id) ?? [];
      if (pesoEnPunto(mn, zs, punto) < 0.3) continue;
      // si varias partes cubren el punto, gana la más pequeña (pedículo antes que arco vertebral)
      const tam = zs.filter((z) => !z.menos).reduce((s, z) => s + (typeof z.r === 'number' ? z.r ** 3 : z.r[0] * z.r[1] * z.r[2]), 0);
      if (!mejor || tam < mejor.tam) mejor = { id: p.id, tam };
    }
    if (mejor) elegir(mejor.id);
  };
}

// ================= AJUSTES =================
function ajustesUI() {
  visor.mostrarTodos(vistaEstudio(), false);
  const a = srs.ajustes();
  const estilos: [Estilo, string][] = [
    ['realista', 'radial-gradient(circle at 35% 35%, #f3e8d2, #b9a37e)'],
    ['arcilla', 'radial-gradient(circle at 35% 35%, #e4e6ea, #8f949d)'],
    ['atlas', 'linear-gradient(135deg, #efe3c6 50%, #c9b98f 50%)'],
    ['colores', 'conic-gradient(#f6a, #fd6, #6d9, #6cf, #b9f, #f6a)'],
  ];
  const editados = huesosEditados();
  h(`
    <h2>${t('ajustes')}</h2>
    <h3>${t('estilo3d')}</h3>
    <div class="estilos">${estilos.map(([k, bg]) => `<button data-e="${k}" class="${a.estilo === k ? 'activo' : ''}"><span class="muestra" style="background:${bg}"></span>${t(k)}</button>`).join('')}</div>
    <div class="separador"></div>
    <div class="fila"><span>${t('idioma')}</span>
      <div class="chips">${(['es', 'en'] as Idioma[]).map((i) => `<button class="chip ${idioma() === i ? 'activo' : ''}" data-i="${i}">${i === 'es' ? 'Español' : 'English'}</button>`).join('')}</div>
    </div>
    <div class="fila"><span>${t('tamLetra')}</span><input type="range" id="escala" min="0.85" max="1.4" step="0.05" value="${a.escalaLetra}"/></div>
    <div class="fila"><span>${t('sonido')}</span>
      <div class="chips"><button class="chip ${a.sonido ? 'activo' : ''}" data-s="1">${t('on')}</button><button class="chip ${!a.sonido ? 'activo' : ''}" data-s="0">${t('off')}</button></div>
    </div>
    <div class="fila"><span>${t('nuevasDia')}</span><input type="number" id="nuevas" min="1" max="200" value="${a.nuevasPorDia}"/></div>
    <div class="separador"></div>
    <button class="btn" id="editor">${t('editor')}${editados ? ` <small>${editados} ${t('editados')}</small>` : ''}</button>
    <button class="btn peligro" id="reset">${t('borrar')}</button>
    <p class="creditos">${t('creditos')}</p>`);
  todos<HTMLButtonElement>('[data-e]').forEach(
    (b) =>
      (b.onclick = () => {
        srs.cambiarAjustes({ estilo: b.dataset.e as Estilo });
        visor.setEstilo(b.dataset.e as Estilo);
        ajustesUI();
      }),
  );
  todos<HTMLButtonElement>('[data-i]').forEach(
    (b) =>
      (b.onclick = () => {
        cambiarIdioma(b.dataset.i as Idioma);
        pintarBarra();
        ajustesUI();
      }),
  );
  todos<HTMLButtonElement>('[data-s]').forEach(
    (b) =>
      (b.onclick = () => {
        srs.cambiarAjustes({ sonido: b.dataset.s === '1' });
        if (b.dataset.s === '1') sonar(true);
        ajustesUI();
      }),
  );
  $<HTMLInputElement>('#escala').oninput = (e) => {
    srs.cambiarAjustes({ escalaLetra: Number((e.target as HTMLInputElement).value) });
    aplicarEscala();
  };
  $<HTMLInputElement>('#nuevas').onchange = (e) => {
    srs.cambiarAjustes({ nuevasPorDia: Math.max(1, Math.min(200, Number((e.target as HTMLInputElement).value) || 15)) });
  };
  $('#editor').onclick = () => ir('editor');
  $('#reset').onclick = () => {
    if (confirm(t('borrarSeguro'))) srs.borrarProgreso();
  };
}

// ================= EDITOR DE NOMBRES =================
const etiquetaEditor = (x: Pregunta) =>
  x.id.startsWith('T:') ? `${t('tipoDe')} · ${nombreGrupo(x.grupo)}` : x.id.startsWith('P:') ? `${t('aislado')} · ${nombreGrupo(x.grupo)}` : nombreGrupo(x.grupo);
let busqueda = '';
function editor() {
  visor.mostrarTodos(regionVista, false);
  visor.clicable = true;
  h(`
    <button class="volver" id="atras">← ${t('ajustes')}</button>
    <h2>${t('editor')} · ${idioma() === 'es' ? 'Español' : 'English'}</h2>
    <div class="ayuda">${t('editorAyuda')}</div>
    ${chipsVista(regionVista)}
    <input class="campo" id="buscar" placeholder="${t('buscar')}" value="${esc(busqueda)}"/>
    <div id="lista" style="display:grid;gap:8px"></div>
    <button class="btn peligro" id="restaurar">${t('restaurar')}</button>`);
  const lista = $('#lista');
  const pintarLista = () => {
    const q = busqueda.toLowerCase();
    const agr = AGRUPADAS.filter((x) => regionVista === 'completo' || x.region === regionVista);
    const hs = [...agr, ...deVista(regionVista)].filter((x) => (!q || nombre(x).toLowerCase().includes(q) || sinonimos(x).some((s) => s.toLowerCase().includes(q))));
    lista.innerHTML = hs
      .map((x) => {
        const n = nombreDe(x);
        return `<div class="editor-item" data-id="${x.id}">
          <div class="titulo"><span>${etiquetaEditor(x)}</span>${esEditado(x) ? `<span class="editado">● ${t('editados')}</span>` : ''}</div>
          <input class="campo" data-campo="nombre" value="${esc(n.nombre)}" aria-label="${t('nombreCampo')}"/>
          <input class="campo" data-campo="sin" value="${esc(n.sinonimos.join(', '))}" placeholder="${t('sinonimosCampo')}" aria-label="${t('sinonimosCampo')}"/>
        </div>`;
      })
      .join('');
    todos<HTMLElement>('.editor-item', lista).forEach((item) => {
      const hb = preguntaPorId.get(item.dataset.id!)!;
      const [inN, inS] = todos<HTMLInputElement>('input', item);
      const guardar = () => {
        guardarNombre(hb, { nombre: inN.value, sinonimos: inS.value.split(',') });
        const tit = item.querySelector('.titulo')!;
        tit.innerHTML = `<span>${etiquetaEditor(hb)}</span>${esEditado(hb) ? `<span class="editado">● ${t('editados')}</span>` : ''}`;
      };
      inN.onchange = guardar;
      inS.onchange = guardar;
      inN.onfocus = inS.onfocus = () => {
        visor.limpiarMarcas();
        hb.miembros.forEach((m) => visor.marcar(m, 'resalte'));
      };
    });
  };
  pintarLista();
  // pinchar un hueso en el 3D lo busca en la lista
  visor.onClick = (id) => {
    const el = lista.querySelector<HTMLElement>(`[data-id="${id}"]`);
    visor.limpiarMarcas();
    visor.marcar(id, 'resalte');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.querySelector('input')?.focus({ preventScroll: true });
    }
  };
  $<HTMLInputElement>('#buscar').oninput = (e) => {
    busqueda = (e.target as HTMLInputElement).value;
    pintarLista();
  };
  todos<HTMLButtonElement>('[data-reg]').forEach(
    (b) =>
      (b.onclick = () => {
        regionVista = b.dataset.reg as Vista;
        editor();
      }),
  );
  $('#atras').onclick = () => ir('ajustes');
  $('#restaurar').onclick = () => {
    if (confirm(t('restaurarSeguro'))) {
      restaurarNombres();
      editor();
    }
  };
}

// ================= ARRANQUE =================
// ayuda para revisar zonas en desarrollo
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__visor = visor;
  // dibuja N fotogramas aunque la pestaña esté oculta
  (window as unknown as Record<string, unknown>).__dibujar = (n = 80) => {
    for (let i = 0; i < n; i++) (visor as unknown as { frame: () => void }).frame();
  };
  // 4 vistas (delante, derecha, detrás, arriba) de la parte en una imagen
  (window as unknown as Record<string, unknown>).__vistas = async (ap: string, parte: string, i = 0) => {
    const w = window as unknown as Record<string, (...x: unknown[]) => unknown>;
    let nombre: unknown;
    if (ap.startsWith('#')) {
      const id = ap.slice(1);
      visor.mostrarParte([id], new Map());
      w.__rayas(id, Number(parte));
      nombre = `${id} eje ${['x', 'y', 'z'][Number(parte)]} (impares pintadas: 0.1-0.2, 0.3-0.4…)`;
    } else nombre = await w.__parte(ap, parte, i);
    const v = visor as unknown as { camera: import('three').PerspectiveCamera; controls: { target: import('three').Vector3; sincronizar: () => void }; renderer: import('three').WebGLRenderer; scene: import('three').Scene; camaraAnim: unknown };
    visor.setMargen(1, 0);
    visor.restablecerVista();
    w.__dibujar(80);
    v.camaraAnim = null;
    const t = v.controls.target.clone();
    const dist = v.camera.position.distanceTo(t);
    const dirs: [number, number, number][] = [[0, 0.15, 1], [-1, 0.15, 0], [0, 0.15, -1], [0.001, 1, 0.001], [1, 0.15, 0], [0, -1, 0.001]];
    const cv = document.createElement('canvas');
    const W = 420, H = 300;
    cv.width = W * 3;
    cv.height = H * 2;
    const g = cv.getContext('2d')!;
    dirs.forEach((d, k) => {
      const dv = new (t.constructor as typeof import('three').Vector3)(...d).normalize();
      v.camera.position.copy(t).addScaledVector(dv, dist);
      v.camera.up.set(0, 1, 0);
      if (Math.abs(d[1]) > 0.9) v.camera.up.set(0, 0, d[1] > 0 ? -1 : 1);
      v.camera.lookAt(t);
      v.renderer.render(v.scene, v.camera);
      const src = v.renderer.domElement;
      const s = Math.min(src.width / W, src.height / H) * 0.55;
      g.drawImage(src, (src.width - W * s) / 2, (src.height - H * s) / 2, W * s, H * s, (k % 3) * W, Math.floor(k / 3) * H, W, H);
      g.fillStyle = '#fff';
      g.font = '16px sans-serif';
      g.fillText(['delante', 'derecha', 'detrás', 'arriba', 'izquierda', 'abajo'][k], (k % 3) * W + 8, Math.floor(k / 3) * H + 20);
    });
    g.fillText(String(nombre), 8, H * 2 - 10);
    let img = document.getElementById('__img') as HTMLImageElement | null;
    if (!img) {
      img = document.createElement('img');
      img.id = '__img';
      img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;z-index:99;background:#000';
      document.body.append(img);
    }
    img.src = cv.toDataURL();
    return nombre;
  };
  // rayas cada 0.1 en un eje (0 x, 1 y, 2 z) para leer coordenadas normalizadas; la raya 0.5 se pinta entera
  (window as unknown as Record<string, unknown>).__rayas = (id: string, eje: number) => {
    const v = visor as unknown as { mallaNorm: (id: string) => import('./zonas').MallaNorm; piezas: Map<string, { mesh: import('three').Mesh }>; pintados: Set<string> };
    const mn = v.mallaNorm(id);
    const n = mn.pos.length / 3;
    const w = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = [0, 1, 2].map((k) => {
        let x = (mn.pos[i * 3 + k] - mn.min[k]) / mn.tam[k];
        if (k === 0 && mn.espejo) x = 1 - x;
        return x;
      });
      if (eje < 3) {
        const b = Math.floor(u[eje] * 10);
        w[i] = Math.abs(u[eje] - 0.5) < 0.012 ? 0.35 : b % 2 ? 1 : 0;
      } else {
        // cuadrícula: líneas cada 0.1 en los dos ejes del plano (3: x-z, 4: y-z, 5: x-y)
        const ejes = eje === 3 ? [0, 2] : eje === 4 ? [1, 2] : [0, 1];
        const linea = (x: number) => {
          const d = Math.abs(x * 10 - Math.round(x * 10));
          return d < 0.09 ? (Math.round(x * 10) === 5 ? 1 : 0.75) : 0;
        };
        w[i] = Math.max(linea(u[ejes[0]]), linea(u[ejes[1]]));
      }
    }
    const g = v.piezas.get(id)!.mesh.geometry;
    g.setAttribute('parte', new THREE_BA(w, 1));
    v.pintados.add(id);
    (visor as unknown as { actualizarMateriales: () => void }).actualizarMateriales();
  };
  // una vista grande: dir = 'delante' | 'detras' | 'derecha' | 'izquierda' | 'arriba' | 'abajo' | [x,y,z]
  (window as unknown as Record<string, unknown>).__una = async (ap: string, parte: string, dir: string | number[], i = 0) => {
    const w = window as unknown as Record<string, (...x: unknown[]) => unknown>;
    if (ap.startsWith('#')) {
      visor.mostrarParte([ap.slice(1)], new Map());
      w.__rayas(ap.slice(1), Number(parte));
    } else await w.__parte(ap, parte, i);
    const D: Record<string, number[]> = { delante: [0, 0.05, 1], detras: [0, 0.05, -1], derecha: [-1, 0.05, 0], izquierda: [1, 0.05, 0], arriba: [0.001, 1, 0.001], abajo: [0.001, -1, 0.001] };
    const d = typeof dir === 'string' ? D[dir] : dir;
    const v = visor as unknown as { camera: import('three').PerspectiveCamera; controls: { target: import('three').Vector3 }; renderer: import('three').WebGLRenderer; scene: import('three').Scene; camaraAnim: unknown };
    visor.setMargen(1, 0);
    visor.restablecerVista();
    w.__dibujar(80);
    v.camaraAnim = null;
    const t = v.controls.target.clone();
    const dist = v.camera.position.distanceTo(t) * 0.75;
    const dv = t.clone().set(d[0], d[1], d[2]).normalize();
    v.camera.position.copy(t).addScaledVector(dv, dist);
    v.camera.up.set(0, 1, 0);
    if (Math.abs(dv.y) > 0.9) v.camera.up.set(0, 0, dv.y > 0 ? -1 : 1);
    v.camera.lookAt(t);
    v.renderer.render(v.scene, v.camera);
    let img = document.getElementById('__img') as HTMLImageElement | null;
    if (!img) {
      img = document.createElement('img');
      img.id = '__img';
      img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;z-index:99;background:#000';
      document.body.append(img);
    }
    img.src = v.renderer.domElement.toDataURL();
    return 'ok';
  };
  // corte ASCII de la malla fina: eje 'x'|'y'|'z' a un nivel (0-1), grosor g
  (window as unknown as Record<string, unknown>).__corte = (id: string, eje: string, niveles: number[], g = 0.02, W = 60, H = 30) => {
    const mn = (visor as unknown as { mallaNorm: (id: string) => import('./zonas').MallaNorm }).mallaNorm(id);
    const E = ({ x: 0, y: 1, z: 2 } as Record<string, number>)[eje];
    const [a, b] = eje === 'y' ? [0, 2] : eje === 'z' ? [0, 1] : [2, 1];
    const n = mn.pos.length / 3;
    const u = (i: number, k: number) => {
      let x = (mn.pos[i * 3 + k] - mn.min[k]) / mn.tam[k];
      if (k === 0 && mn.espejo) x = 1 - x;
      return x;
    };
    let out = `${id} tam ${mn.tam.map((t) => (t * 100).toFixed(0)).join('x')}mm  cols=${'xyz'[a]} filas=${'xyz'[b]}
`;
    for (const l of niveles) {
      const grid = Array.from({ length: H }, () => Array(W).fill('.'));
      for (let i = 0; i < n; i++) {
        if (Math.abs(u(i, E) - l) > g) continue;
        grid[Math.min(H - 1, Math.floor((1 - u(i, b)) * H))][Math.min(W - 1, Math.floor(u(i, a) * W))] = '#';
      }
      out += `--- ${eje}=${l}  (cols: cada 6 = 0.1)\n` + grid.map((r, i) => (1 - i / H).toFixed(2) + ' ' + r.join('')).join('\n') + '\n';
    }
    return out;
  };
  // varias partes en una imagen, cada una desde su vista de tarjeta
  (window as unknown as Record<string, unknown>).__mosaico = async (ap: string, partes?: string[], i = 0, cols = 3) => {
    const w = window as unknown as Record<string, (...x: unknown[]) => unknown>;
    const { apartadoPorId } = await import('./data/partes');
    const lista = partes ?? apartadoPorId.get(ap)!.partes.map((p) => p.id);
    const W = Math.round(1200 / cols), H = Math.round((900 / cols) * 1);
    const cv = document.createElement('canvas');
    cv.width = W * cols;
    cv.height = H * Math.ceil(lista.length / cols);
    const g = cv.getContext('2d')!;
    const v = visor as unknown as { renderer: import('three').WebGLRenderer; scene: import('three').Scene; camera: import('three').Camera };
    visor.setMargen(1, 0);
    for (let k = 0; k < lista.length; k++) {
      const nombre = await w.__parte(ap, lista[k], i);
      w.__dibujar(90);
      v.renderer.render(v.scene, v.camera);
      const src = v.renderer.domElement;
      const s = Math.min(src.width / W, src.height / H) * 0.9;
      g.drawImage(src, (src.width - W * s) / 2, (src.height - H * s) / 2, W * s, H * s, (k % cols) * W, Math.floor(k / cols) * H, W, H);
      g.fillStyle = '#fff';
      g.font = '18px sans-serif';
      g.fillText(String(nombre), (k % cols) * W + 8, Math.floor(k / cols) * H + 22);
    }
    let img = document.getElementById('__img') as HTMLImageElement | null;
    if (!img) {
      img = document.createElement('img');
      img.id = '__img';
      img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;z-index:99;background:#000';
      document.body.append(img);
    }
    img.src = cv.toDataURL();
    return lista.length;
  };
  (window as unknown as Record<string, unknown>).__parte = async (ap: string, parte: string, i = 0) => {
    const { apartadoPorId } = await import('./data/partes');
    const a = apartadoPorId.get(ap)!;
    const p = a.partes.find((x) => x.id === parte)!;
    const ids = a.conjunto ? a.huesos : [a.huesos[i % a.huesos.length]];
    const z = new Map(ids.map((id) => [id, Array.isArray(p.zonas) ? p.zonas : (p.zonas[id] ?? [])]));
    visor.mostrarParte(ids, z, p.dir);
    return p.nombre;
  };
  // por tramos del eje eb (a→b, n tramos): el vértice más extremo en el eje ee (s = 1 máx, −1 mín), en coords normalizadas
  (window as unknown as Record<string, unknown>).__perfil = (id: string, eb: 'x' | 'y' | 'z', a: number, b: number, n: number, ee: 'x' | 'y' | 'z', s: number, filtro?: (p: number[]) => boolean) => {
    const m = visor.mallaNorm(id)!;
    const E = { x: 0, y: 1, z: 2 };
    const out: string[] = [];
    for (let k = 0; k < n; k++) {
      const lo = a + ((b - a) * k) / n, hi = a + ((b - a) * (k + 1)) / n;
      let best: number[] | null = null;
      for (let i = 0; i < m.pos.length / 3; i++) {
        const p = [0, 1, 2].map((j) => (m.pos[i * 3 + j] - m.min[j]) / m.tam[j]);
        if (m.espejo) p[0] = 1 - p[0];
        const v = p[E[eb]];
        if (v < lo || v >= hi || (filtro && !filtro(p))) continue;
        if (!best || s * p[E[ee]] > s * best[E[ee]]) best = p;
      }
      if (best) out.push(best.map((x) => x.toFixed(2)).join(','));
    }
    return out.join(' | ');
  };
  // punto más saliente en una dirección (mm del mundo), con filtro opcional en coords normalizadas
  (window as unknown as Record<string, unknown>).__ext = (id: string, d: number[], filtro?: (p: number[]) => boolean) => {
    const m = visor.mallaNorm(id)!;
    let b: number[] | null = null, bv = -1e9;
    for (let i = 0; i < m.pos.length / 3; i++) {
      const p = [0, 1, 2].map((j) => (m.pos[i * 3 + j] - m.min[j]) / m.tam[j]);
      if (m.espejo) p[0] = 1 - p[0];
      if (filtro && !filtro(p)) continue;
      const v = p[0] * d[0] * m.tam[0] + p[1] * d[1] * m.tam[1] + p[2] * d[2] * m.tam[2];
      if (v > bv) { bv = v; b = p; }
    }
    return b!.map((x) => +x.toFixed(3));
  };
  // lleva puntos normalizados al vértice más cercano de la superficie (devuelve [x, y, z, distancia en mm])
  (window as unknown as Record<string, unknown>).__snap = (id: string, pts: number[][]) => {
    const m = visor.mallaNorm(id)!;
    return pts.map((q) => {
      let b: number[] = [], bd = 1e9;
      for (let i = 0; i < m.pos.length / 3; i++) {
        const p = [0, 1, 2].map((j) => (m.pos[i * 3 + j] - m.min[j]) / m.tam[j]);
        if (m.espejo) p[0] = 1 - p[0];
        const d = Math.hypot(...[0, 1, 2].map((j) => (p[j] - q[j]) * m.tam[j]));
        if (d < bd) { bd = d; b = p; }
      }
      return [...b.map((x) => +x.toFixed(3)), +(bd * 100).toFixed(1)];
    });
  };
  // zona de A que toca a B (o a varios): centro, radio (fracción de la medida mayor) y hacia dónde mira
  (window as unknown as Record<string, unknown>).__contacto = (A: string, B: string | string[], extra = 0.03, filtro?: (p: number[]) => boolean) => {
    const ma = visor.mallaNorm(A)!;
    const Bs = (Array.isArray(B) ? B : [B]).map((b) => visor.mallaNorm(b)!);
    const n = ma.pos.length / 3;
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let best = 1e9;
      const x = ma.pos[i * 3], y = ma.pos[i * 3 + 1], z = ma.pos[i * 3 + 2];
      for (const mb of Bs) for (let j = 0; j < mb.pos.length; j += 9) {
        const dx = mb.pos[j] - x, dy = mb.pos[j + 1] - y, dz = mb.pos[j + 2] - z;
        const q = dx * dx + dy * dy + dz * dz;
        if (q < best) best = q;
      }
      d[i] = Math.sqrt(best);
    }
    let mn = 1e9;
    for (const v of d) mn = Math.min(mn, v);
    const sel: number[] = [];
    const nc0 = (i: number) => { const p = [0, 1, 2].map((j) => (ma.pos[i * 3 + j] - ma.min[j]) / ma.tam[j]); if (ma.espejo) p[0] = 1 - p[0]; return p; };
    if (filtro) { mn = 1e9; for (let i = 0; i < n; i++) if (filtro(nc0(i))) mn = Math.min(mn, d[i]); }
    for (let i = 0; i < n; i++) if (d[i] < mn + extra && (!filtro || filtro(nc0(i)))) sel.push(i);
    const nc = (i: number) => [0, 1, 2].map((j) => (ma.pos[i * 3 + j] - ma.min[j]) / ma.tam[j]);
    const c = [0, 0, 0], nr = [0, 0, 0];
    for (const i of sel) { const p = nc(i); for (let j = 0; j < 3; j++) { c[j] += p[j] / sel.length; if (ma.nor) nr[j] += ma.nor[i * 3 + j]; } }
    const ds = sel.map((i) => { const p = nc(i); return Math.hypot(...[0, 1, 2].map((j) => ((p[j] - c[j]) * ma.tam[j]) / ma.maxTam)); }).sort((a, b) => a - b);
    const L = Math.hypot(...nr) || 1;
    if (ma.espejo) { c[0] = 1 - c[0]; nr[0] = -nr[0]; }
    return { c: c.map((v) => +v.toFixed(3)), r: +(ds[Math.floor(ds.length * 0.85)] ?? 0.1).toFixed(3), cara: nr.map((v) => +(v / L).toFixed(2)), n: sel.length, gapmm: +(mn * 100).toFixed(1) };
  };
  // cuántos vértices pinta cada parte (peso > 0.5) en el hueso i del apartado
  (window as unknown as Record<string, unknown>).__cuenta = async (ap: string, i = 0) => {
    const { apartadoPorId } = await import('./data/partes');
    const { pesos } = await import('./zonas');
    const a = apartadoPorId.get(ap)!;
    const ids = a.conjunto ? a.huesos : [a.huesos[i % a.huesos.length]];
    const out: Record<string, number> = {};
    for (const p of a.partes) {
      let n = 0;
      for (const id of ids) {
        const m = visor.mallaNorm(id);
        const zs = Array.isArray(p.zonas) ? p.zonas : (p.zonas[id] ?? []);
        if (!m || !zs.length) continue;
        for (const w of pesos(m, zs)) if (w > 0.5) n++;
      }
      out[p.id] = n;
    }
    return out;
  };
  // mapa de profundidad con rayos paralelos a un eje: 'z+' desde delante, 'z-' desde detrás, 'y+' desde arriba, 'x-' desde la derecha del paciente…
  (window as unknown as Record<string, unknown>).__rayo = (id: string, eje: string, W = 40, H = 36) => {
    const v = visor as unknown as { raycaster: import('three').Raycaster; piezas: Map<string, { mesh: import('three').Object3D }>; camera: import('three').Camera };
    const mn = visor.mallaNorm(id)!;
    const obj = v.piezas.get(id)!.mesh;
    const V3 = v.camera.position.constructor as new (x: number, y: number, z: number) => import('three').Vector3;
    const ejes: Record<string, number[]> = { 'z+': [0, 1, 2, 1], 'z-': [0, 1, 2, -1], 'y+': [0, 2, 1, 1], 'y-': [0, 2, 1, -1], 'x-': [2, 1, 0, -1], 'x+': [2, 1, 0, 1] };
    const [a, b, c, s] = ejes[eje];
    const filas: string[] = [];
    for (let r = 0; r < H; r++) {
      const w = 1 - (r + 0.5) / H;
      let fila = '';
      for (let k = 0; k < W; k++) {
        const u = (k + 0.5) / W;
        const o = [0, 0, 0];
        o[a] = mn.min[a] + u * mn.tam[a];
        o[b] = mn.min[b] + w * mn.tam[b];
        o[c] = s > 0 ? mn.min[c] + mn.tam[c] * 1.5 : mn.min[c] - mn.tam[c] * 0.5;
        const d = [0, 0, 0];
        d[c] = -s;
        v.raycaster.set(new V3(o[0], o[1], o[2]), new V3(d[0], d[1], d[2]));
        v.raycaster.far = 1e9;
        const hit = v.raycaster.intersectObject(obj, true)[0];
        if (!hit) {
          fila += ' ';
          continue;
        }
        const t = (hit.point.getComponent(c) - mn.min[c]) / mn.tam[c];
        fila += String(Math.max(0, Math.min(9, Math.floor((s > 0 ? t : 1 - t) * 10))));
      }
      filas.push(w.toFixed(2) + ' ' + fila);
    }
    return `${eje} cols=${'xyz'[a]} filas=${'xyz'[b]} tam(mm)=${mn.tam.map((x) => Math.round(x * 100))} (9 = más cerca)\n${filas.join('\n')}`;
  };
  // foto grande de uno o varios huesos (sin pintar), opcionalmente acercándose a un punto (coordenadas normalizadas del primero)
  (window as unknown as Record<string, unknown>).__foto = (ids: string | string[], dir: [number, number, number], c?: [number, number, number], r = 0.1) => {
    const lista = Array.isArray(ids) ? ids : [ids];
    const v = visor as unknown as { renderer: import('three').WebGLRenderer; scene: import('three').Scene; camera: import('three').Camera; encuadrar: (s: import('three').Sphere, d: import('three').Vector3, m: number, b: boolean) => void };
    const w = window as unknown as Record<string, (...x: unknown[]) => unknown>;
    visor.setMargen(1, 0);
    visor.mostrarParte(lista, new Map(), dir);
    if (c) {
      const mn = visor.mallaNorm(lista[0])!;
      const x = mn.espejo ? 1 - c[0] : c[0];
      const T = v.camera.position.constructor as new (x: number, y: number, z: number) => import('three').Vector3;
      const S = (visor as unknown as { esferaCompleta: import('three').Sphere }).esferaCompleta.constructor as new (c: import('three').Vector3, r: number) => import('three').Sphere;
      v.encuadrar(new S(new T(mn.min[0] + x * mn.tam[0], mn.min[1] + c[1] * mn.tam[1], mn.min[2] + c[2] * mn.tam[2]), r * mn.maxTam), new T(...dir).normalize(), 1.1, true);
    }
    w.__dibujar(90);
    v.renderer.render(v.scene, v.camera);
    let img = document.getElementById('__img') as HTMLImageElement | null;
    if (!img) {
      img = document.createElement('img');
      img.id = '__img';
      img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;z-index:99;background:#000';
      document.body.append(img);
    }
    img.src = v.renderer.domElement.toDataURL();
    return 'ok';
  };
  // puntos de una captura de 800 px de ancho de __foto → coordenadas normalizadas (del primer hueso, o de id)
  (window as unknown as Record<string, unknown>).__pickF = (pts: [number, number][], id?: string) => {
    const el = (visor as unknown as { renderer: import('three').WebGLRenderer }).renderer.domElement;
    const k = Math.min(innerWidth / el.width, innerHeight / el.height);
    const ox = (innerWidth - el.width * k) / 2;
    const oy = (innerHeight - el.height * k) / 2;
    const f = innerWidth / 800;
    const w = window as unknown as Record<string, (p: [number, number][], id?: string) => string[]>;
    const res = w.__pick(pts.map(([x, y]) => [(x * f - ox) / k / el.width, (y * f - oy) / k / el.height] as [number, number]), id);
    return res.map((r, i) => `${pts[i]} → ${r}`).join('\n');
  };
  // rayo desde la cámara por un punto de la pantalla (0–1) → coordenadas normalizadas del hueso
  (window as unknown as Record<string, unknown>).__pick = (pts: [number, number][], soloId?: string) => {
    const v = visor as unknown as { raycaster: import('three').Raycaster; camera: import('three').Camera; solo: Set<string>; piezas: Map<string, { mesh: import('three').Object3D }> };
    const ids = soloId ? [soloId] : [...v.solo];
    const mallas = ids.map((id) => v.piezas.get(id)!.mesh);
    return pts.map(([sx, sy]) => {
      v.raycaster.setFromCamera({ x: sx * 2 - 1, y: -(sy * 2 - 1) } as import('three').Vector2, v.camera);
      const hit = v.raycaster.intersectObjects(mallas, true)[0];
      if (!hit) return '-';
      const id = ids[mallas.indexOf(hit.object)] ?? ids[0];
      return (ids.length > 1 ? id + ' ' : '') + aNormal(visor.mallaNorm(id)!, hit.point).join(',');
    });
  };
}
pintarBarra();
h(`<h2>${t('cargando')}</h2>`);
visor.setEstilo(srs.ajustes().estilo);
visor
  .cargar(import.meta.env.BASE_URL + 'models/')
  .then(() => ir('inicio'))
  .catch((e) => h(`<h2>${t('errorCarga')}</h2><pre>${esc(String(e))}</pre>`));
