import '@fontsource-variable/lexend';
import './style.css';
import { Rating, type Grade } from 'ts-fsrs';
import { Visor } from './viewer';
import { GRUPOS, HUESOS, AGRUPADAS, REGIONES, huesoPorId, preguntaPorId, type Grupo, type Pregunta, type RegionId } from './data/huesos';
import { comprobarVarias, pista, type Resultado } from './answer';
import { t, tGrupo, tRegion, idioma, cambiarIdioma, nombre, sinonimos, nombreDe, guardarNombre, esEditado, restaurarNombres, huesosEditados, type Idioma } from './i18n';
import { sonidoAcierto, sonidoFallo } from './sonido';
import * as srs from './srs';
import { PARTES } from './data/partes';
import type { Estilo, Modo, Tarjeta } from './srs';

const panel = document.querySelector<HTMLElement>('#panel')!;
const barra = document.querySelector<HTMLElement>('#barra')!;
const visor = new Visor(document.querySelector<HTMLElement>('#visor')!);

type Pantalla = 'inicio' | 'estudio' | 'explorar' | 'partes' | 'ajustes' | 'editor';
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
const MODOS_T: Record<Modo, () => string> = { aislado: () => t('aislado'), conjunto: () => t('conjunto'), localizar: () => t('localizar') };

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
  if (pantalla === 'estudio') {
    const a = srs.ajustes();
    const regionSel = a.regiones.length === REGIONES.length ? 'todas' : a.regiones[0];
    const modoSel = a.modos.length === 3 ? 'mezcla' : a.modos[0];
    const pct = Math.min(100, (100 * sesion.hechas) / Math.max(1, sesion.objetivo));
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
      srs.cambiarAjustes({ modos: v === 'mezcla' ? ['aislado', 'conjunto', 'localizar'] : [v as Modo] });
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
    <nav>${pest.map(([p, n]) => `<button data-p="${p}" class="${pantalla === p || (p === 'ajustes' && pantalla === 'editor') ? 'activo' : ''}">${n}</button>`).join('')}</nav>`;
  todos<HTMLButtonElement>('[data-p]', barra).forEach((b) => (b.onclick = () => ir(b.dataset.p as Pantalla)));
}

function ir(p: Pantalla) {
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
  sesion = { objetivo: Math.max(1, c.pendientes + c.nuevasHoy), hechas: 0 };
  ir('estudio');
}

// ================= ESTUDIO =================
function etiquetaDe(tj: Tarjeta) {
  const hb = preguntaPorId.get(tj.hueso)!;
  return `<div class="etiqueta">${MODOS_T[tj.modo]()} · ${nombreGrupo(hb.grupo)}${srs.esNueva(tj) ? ` <span class="insignia">${t('nueva')}</span>` : ''}</div>`;
}

function siguienteTarjeta() {
  pintarBarra();
  const tj = srs.siguiente(huesoAnterior);
  if (!tj) return terminado();
  huesoAnterior = tj.hueso;
  const hb = preguntaDe(tj);
  const etiqueta = etiquetaDe(tj);

  if (tj.modo === 'localizar') return tarjetaLocalizar(tj, etiqueta);
  mostrado = tj.modo === 'conjunto' ? tj.hueso : azar(hb.miembros);
  if (tj.modo === 'aislado') visor.mostrarAislado(mostrado);
  else visor.mostrarConjunto(mostrado, esCompleto());

  const n = nombre(hb);
  const p = pista(n, srs.nivelDe(tj));
  h(`
    ${etiqueta}
    <h2>${tj.modo === 'aislado' ? t('queHueso') : t('queResaltado')}</h2>
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
  visor.marcar(mostrado, acierto ? 'acierto' : 'error');
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
      ${tj.modo !== 'localizar' ? `<button class="btn hard" data-n="${Rating.Hard}">${t('loSabia')} <small>${iv[Rating.Hard]}</small></button>` : ''}
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

function terminado() {
  sesion.hechas = sesion.objetivo;
  pintarBarra();
  visor.mostrarTodos(vistaEstudio());
  const c = srs.contadores();
  h(`
    <h1>${t('hecho')}</h1>
    <p class="ayuda">${t('hechoTexto')}</p>
    ${c.sinVer ? `<div class="botones"><button class="btn principal" id="mas">${t('estudiarMas')}</button></div>` : ''}
    <div class="botones"><button class="btn" id="volver">${t('volver')}</button></div>`);
  if (c.sinVer)
    $('#mas').onclick = () => {
      srs.masNuevasHoy(10);
      empezarSesion();
    };
  $('#volver').onclick = () => ir('inicio');
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
// De momento solo la estructura: cada hueso (sin repetir lados ni vértebras) con su lista de partes.
let partesSel: string | null = null;
function partesUI() {
  visor.mostrarTodos(regionVista, false);
  visor.clicable = true;
  const unidad = (id: string) => {
    const b = huesoPorId.get(id);
    return b ? (b.tipo ?? b.par ?? b.id) : id;
  };
  const ids = [...new Set(deVista(regionVista).map((x) => unidad(x.id)))];
  const sel = partesSel ? preguntaPorId.get(partesSel) : null;
  const ps = sel ? PARTES[sel.id] ?? [] : [];
  sel?.miembros.forEach((m) => visor.marcar(m, 'resalte'));
  h(`
    <h2>${t('partesTitulo')}</h2>
    ${chipsVista(regionVista)}
    <div class="ayuda">${t('partesAyuda')}</div>
    ${
      sel
        ? `<div class="objetivo"><div class="etiqueta">${nombreGrupo(sel.grupo)}</div>${esc(mayus(nombre(sel)))}</div>
           ${ps.length ? `<div class="chips">${ps.map((p) => `<span class="chip">${esc(idioma() === 'en' && p.en ? p.en : p.nombre)}</span>`).join('')}</div>` : `<div class="resultado">${t('sinPartes')}</div>`}`
        : `<div class="resultado">${t('pinchaUno')}</div>`
    }
    <h3>${t('lista')}</h3>
    <div class="lista-partes">${ids
      .map((id) => {
        const p = preguntaPorId.get(id)!;
        const n = PARTES[id]?.length ?? 0;
        return `<button class="fila ${id === partesSel ? 'activo' : ''}" data-h="${id}"><span>${esc(mayus(nombre(p)))}</span><small>${n ? `${n} ${t('partesN')}` : t('sinPartesCorto')}</small></button>`;
      })
      .join('')}</div>`);
  const elegir = (id: string) => {
    partesSel = unidad(id);
    partesUI();
  };
  todos<HTMLButtonElement>('[data-h]').forEach((b) => (b.onclick = () => elegir(b.dataset.h!)));
  todos<HTMLButtonElement>('[data-reg]').forEach(
    (b) =>
      (b.onclick = () => {
        regionVista = b.dataset.reg as Vista;
        partesSel = null;
        visor.limpiarMarcas();
        partesUI();
      }),
  );
  visor.onClick = elegir;
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
pintarBarra();
h(`<h2>${t('cargando')}</h2>`);
visor.setEstilo(srs.ajustes().estilo);
visor
  .cargar(import.meta.env.BASE_URL + 'models/')
  .then(() => ir('inicio'))
  .catch((e) => h(`<h2>${t('errorCarga')}</h2><pre>${esc(String(e))}</pre>`));
