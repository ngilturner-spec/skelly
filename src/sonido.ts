// Sonidos suaves generados al momento (sin archivos).
let ctx: AudioContext | null = null;

function tono(frecuencias: number[], tipo: OscillatorType, duracion: number, volumen: number) {
  ctx ??= new AudioContext();
  const t0 = ctx.currentTime;
  frecuencias.forEach((f, i) => {
    const osc = ctx!.createOscillator();
    const g = ctx!.createGain();
    osc.type = tipo;
    osc.frequency.value = f;
    const inicio = t0 + i * 0.09;
    g.gain.setValueAtTime(0, inicio);
    g.gain.linearRampToValueAtTime(volumen, inicio + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    osc.connect(g).connect(ctx!.destination);
    osc.start(inicio);
    osc.stop(inicio + duracion + 0.05);
  });
}

export const sonidoAcierto = () => tono([880, 1318.5], 'sine', 0.35, 0.12);
export const sonidoFallo = () => tono([220, 174.6], 'triangle', 0.3, 0.1);
