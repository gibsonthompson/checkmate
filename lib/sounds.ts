// Lightweight synthesized sound effects — no audio files required.
// All sounds are generated on the fly with the Web Audio API.

type SoundName = "move" | "capture" | "check" | "castle" | "promote" | "win" | "lose" | "select";

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.15
) {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime + start);
  g.gain.setValueAtTime(0, audio.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, audio.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(audio.currentTime + start);
  osc.stop(audio.currentTime + start + duration + 0.02);
}

export function playSound(name: SoundName) {
  if (!enabled) return;
  switch (name) {
    case "select":
      tone(420, 0, 0.06, "sine", 0.06);
      break;
    case "move":
      tone(320, 0, 0.08, "triangle", 0.12);
      break;
    case "capture":
      tone(180, 0, 0.06, "square", 0.12);
      tone(120, 0.04, 0.1, "square", 0.1);
      break;
    case "check":
      tone(660, 0, 0.1, "sawtooth", 0.1);
      tone(880, 0.08, 0.12, "sawtooth", 0.1);
      break;
    case "castle":
      tone(300, 0, 0.08, "triangle", 0.12);
      tone(400, 0.08, 0.1, "triangle", 0.12);
      break;
    case "promote":
      tone(523, 0, 0.1, "sine", 0.12);
      tone(659, 0.1, 0.1, "sine", 0.12);
      tone(784, 0.2, 0.14, "sine", 0.12);
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.18, "sine", 0.13));
      break;
    case "lose":
      [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.24, "sine", 0.12));
      break;
  }
}
