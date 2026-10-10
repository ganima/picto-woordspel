// Playback for the games (HANDOVER.md section 8): the juf's recording through Web Audio with the silence at both
// ends trimmed, a soft two-note ding, and a Dutch computer voice when there is no recording.

import { getBlob } from './offline';
import { settings } from './settings';

const SILENCE = 0.02;
const PAD_S = 0.08;

let ctx: AudioContext | null = null;
let playing: AudioBufferSourceNode | null = null;
const decoded = new Map<string, Promise<Clip | null>>();

interface Clip {
  buffer: AudioBuffer;
  from: number;
  duration: number;
}

export interface Sayable {
  word: string;
  audio_path: string | null;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function audioContext(): AudioContext | null {
  if (!ctx) {
    const A = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (A) {
      try {
        ctx = new A();
      } catch {
        ctx = null;
      }
    }
  }
  if (ctx?.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

/** Browsers only allow sound after a user gesture; the first tap anywhere unlocks it. */
export function installAudioUnlock(): void {
  const unlock = () => {
    const a = audioContext();
    if (a) {
      // A silent one-sample buffer fully unlocks iOS Safari.
      const src = a.createBufferSource();
      src.buffer = a.createBuffer(1, 1, 22050);
      src.connect(a.destination);
      src.start(0);
    }
    if ('speechSynthesis' in window) speechSynthesis.getVoices();
  };
  document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  document.addEventListener('keydown', unlock, { capture: true });
}

/** Start and length of the spoken part: from the first to the last sample above the threshold, with padding. */
export function trimBounds(data: Float32Array, rate: number): { from: number; duration: number } {
  const total = data.length / rate;
  let s = 0, e = data.length - 1;
  while (s < e && Math.abs(data[s]!) < SILENCE) s++;
  while (e > s && Math.abs(data[e]!) < SILENCE) e--;
  const pad = rate * PAD_S;
  if (e - s <= pad) return { from: 0, duration: total };
  const from = Math.max(0, s - pad) / rate;
  return { from, duration: Math.min(total, (e + pad * 3) / rate) - from };
}

function decode(path: string): Promise<Clip | null> {
  let p = decoded.get(path);
  if (!p) {
    p = (async () => {
      const a = audioContext();
      const blob = await getBlob(path);
      if (!a || !blob) return null;
      const buffer = await a.decodeAudioData(await blob.arrayBuffer());
      return { buffer, ...trimBounds(buffer.getChannelData(0), buffer.sampleRate) };
    })().catch((e) => {
      console.warn('Could not decode', path, e);
      return null;
    });
    decoded.set(path, p);
    // Don't remember failures: the file may simply not be downloaded yet.
    void p.then((c) => c || decoded.delete(path));
  }
  return p;
}

/** Stop whatever is playing or being spoken. */
export function hush(): void {
  try {
    if (playing) {
      playing.onended = null;
      playing.stop();
    }
  } catch {
    // already stopped
  }
  playing = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window) || !text) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const voice = speechSynthesis.getVoices().find((v) => /^nl/i.test(v.lang));
    // The words are Dutch whatever the interface language is.
    u.lang = voice?.lang ?? 'nl-BE';
    if (voice) u.voice = voice;
    u.rate = 0.85;
    u.onend = u.onerror = () => resolve();
    speechSynthesis.speak(u);
    setTimeout(resolve, 2500);
  });
}

/** Say a word in the juf's voice, or with the computer voice when there is no recording. */
export async function say(item: Sayable | undefined): Promise<void> {
  if (!item) return;
  hush();
  if (item.audio_path) {
    const clip = await decode(item.audio_path);
    const a = audioContext();
    if (clip && a) {
      const src = a.createBufferSource();
      src.buffer = clip.buffer;
      src.connect(a.destination);
      src.start(0, clip.from, clip.duration);
      playing = src;
      return new Promise((resolve) => {
        src.onended = () => resolve();
        setTimeout(resolve, clip.duration * 1000 + 400);
      });
    }
  }
  return speak(item.word);
}

/** Soft rising two-note ding (E5, A5). */
export function ding(): void {
  if (!settings.ding) return;
  const a = audioContext();
  if (!a) return;
  const t0 = a.currentTime;
  [659.25, 880].forEach((f, i) => {
    const o = a.createOscillator(), g = a.createGain(), s = t0 + i * 0.12;
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.linearRampToValueAtTime(0.11, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.45);
    o.connect(g);
    g.connect(a.destination);
    o.start(s);
    o.stop(s + 0.5);
  });
}

/** Ding, then the word. Never takes longer than a few seconds, whatever the audio does. */
export async function cheer(item?: Sayable): Promise<void> {
  ding();
  await wait(settings.ding ? 420 : 0);
  if (item) await Promise.race([say(item), wait(4500)]);
}
