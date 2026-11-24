/**
 * A short, soft two-note chime made with Web Audio (no sound file). Browsers only allow audio
 * after the person has interacted with the page, so the first chime after loading may be silent.
 * Mute is remembered on this device.
 */
const KEY = "vuna:sound-muted";
const listeners = new Set<() => void>();
let context: AudioContext | null = null;

export function isMuted(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch (error) {
    console.warn("[chime] can't read the mute setting", error);
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(KEY, muted ? "1" : "0");
  } catch (error) {
    console.warn("[chime] can't save the mute setting", error);
  }
  listeners.forEach((listener) => listener());
}

export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function playChime(): void {
  if (typeof window === "undefined" || isMuted()) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const start = context.currentTime;
    [659.25, 880].forEach((frequency, i) => {
      const ctx = context as AudioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = start + i * 0.12;
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch (error) {
    console.warn("[chime] couldn't play", error);
  }
}

let ringTimer: ReturnType<typeof setInterval> | undefined;

/** Repeat the chime as a ringtone until stopRingtone() (silent when muted). */
export function startRingtone(): void {
  stopRingtone();
  playChime();
  ringTimer = setInterval(playChime, 1_600);
}

export function stopRingtone(): void {
  clearInterval(ringTimer);
  ringTimer = undefined;
}
