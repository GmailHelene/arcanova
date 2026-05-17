// Tiny procedural sound effects via the Web Audio API — no audio files needed.

let ctx: AudioContext | null = null;

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

interface BlipOptions {
  type?: OscillatorType;
  volume?: number;
  slideTo?: number;
}

function blip(freq: number, duration: number, opts: BlipOptions = {}) {
  const a = audio();
  const osc = a.createOscillator();
  const gain = a.createGain();
  const now = a.currentTime;

  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(freq, now);
  if (opts.slideTo) {
    osc.frequency.exponentialRampToValueAtTime(opts.slideTo, now + duration);
  }
  gain.gain.setValueAtTime(opts.volume ?? 0.13, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(a.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export const sfx = {
  jump: () => blip(320, 0.14, { type: "square", slideTo: 620, volume: 0.1 }),
  coin: () => blip(880, 0.12, { type: "triangle", slideTo: 1320, volume: 0.13 }),
  bounce: () => blip(200, 0.22, { type: "sawtooth", slideTo: 900, volume: 0.13 }),
  die: () => blip(420, 0.4, { type: "square", slideTo: 70, volume: 0.16 }),
  win: () => {
    blip(523, 0.16, { type: "triangle", volume: 0.14 });
    setTimeout(() => blip(659, 0.16, { type: "triangle", volume: 0.14 }), 130);
    setTimeout(() => blip(784, 0.28, { type: "triangle", volume: 0.14 }), 270);
  },
};
