/**
 * Síntesis del roce de papel al voltear hoja (Web Audio API).
 * Porte del prototipo original: cero assets externos.
 * Se crea el AudioContext de forma diferida (política de autoplay)
 * y toda falla se ignora en silencio (lector sin sonido > lector roto).
 */

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    // Reanudar si el navegador lo suspendió hasta el primer gesto.
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Reproduce un breve friccionado de celulosa (~220 ms). */
export function playPageSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    // Buffer de ruido blanco con decaimiento exponencial.
    const bufferSize = Math.floor(ctx.sampleRate * 0.22);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filtro pasabanda: textura de pergamino.
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, ctx.currentTime);
    filter.Q.setValueAtTime(1.8, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch {
    /* AudioContext bloqueado por política: sin sonido */
  }
}
