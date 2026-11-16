/**
 * The instruments. Each function schedules one sound on any BaseAudioContext
 * (live or offline), starting at `at` seconds on that context's clock, and
 * connects it to `out`. Everything is oscillators and filtered noise: there
 * are no audio files.
 *
 * Shared habits: a few milliseconds of attack so nothing clicks, an
 * exponential decay so notes ring out like a music box, and every source is
 * given a stop time so nodes are released.
 */

const SILENT = 0.0001;

/** Two detuned triangles are louder than one sine: this evens out harp and chime. */
const HARP_LEVEL = 0.62;

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Two seconds of white noise, the same samples every time (seeded). */
export function noiseBuffer(context: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(context);
  if (cached) return cached;
  const length = Math.floor(context.sampleRate * 2);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let seed = 0x2f6e2b1;
  for (let i = 0; i < length; i += 1) {
    // xorshift32: cheap, deterministic, good enough for noise.
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    samples[i] = ((seed >>> 0) / 0xffffffff) * 2 - 1;
  }
  noiseBuffers.set(context, buffer);
  return buffer;
}

function envelope(
  context: BaseAudioContext,
  at: number,
  peak: number,
  attack: number,
  decay: number,
): GainNode {
  const gain = context.createGain();
  gain.gain.setValueAtTime(SILENT, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(SILENT, at + attack + decay);
  return gain;
}

function oscillator(
  context: BaseAudioContext,
  type: OscillatorType,
  frequency: number,
  at: number,
  until: number,
  detune = 0,
): OscillatorNode {
  const osc = context.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, at);
  osc.detune.setValueAtTime(detune, at);
  osc.start(at);
  osc.stop(until);
  return osc;
}

export interface NoteOptions {
  gain?: number;
  /** Seconds for the note to die away. */
  decay?: number;
  /** Roll off the top, for Evil and "going away" cues. */
  dark?: boolean;
}

/**
 * Music box: a sine with two quieter, shorter partials above it (an octave
 * and a slightly sharp twelfth), which gives the small bright "ting".
 */
export function chime(
  context: BaseAudioContext,
  out: AudioNode,
  at: number,
  frequency: number,
  { gain = 0.14, decay = 0.5, dark = false }: NoteOptions = {},
): void {
  const until = at + decay + 0.05;
  const partials = [
    { ratio: 1, level: 1, length: 1, type: "sine" },
    { ratio: 2.005, level: dark ? 0.08 : 0.26, length: 0.5, type: "triangle" },
    { ratio: 3.01, level: dark ? 0 : 0.07, length: 0.22, type: "sine" },
  ] as const;
  for (const partial of partials) {
    if (partial.level === 0) continue;
    const env = envelope(
      context,
      at,
      gain * partial.level,
      0.006,
      decay * partial.length,
    );
    oscillator(context, partial.type, frequency * partial.ratio, at, until)
      .connect(env)
      .connect(out);
  }
}

/**
 * Harp: two triangles a few cents apart through a low-pass filter that
 * closes as the note rings, so the pluck is bright and the tail is soft.
 */
export function harp(
  context: BaseAudioContext,
  out: AudioNode,
  at: number,
  frequency: number,
  { gain = 0.13, decay = 0.9, dark = false }: NoteOptions = {},
): void {
  const until = at + decay + 0.05;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.setValueAtTime(0.7, at);
  filter.frequency.setValueAtTime(frequency * (dark ? 2.2 : 6), at);
  filter.frequency.exponentialRampToValueAtTime(
    frequency * (dark ? 1.1 : 1.6),
    at + decay * 0.6,
  );
  const env = envelope(context, at, gain * HARP_LEVEL, 0.004, decay);
  filter.connect(env).connect(out);
  oscillator(context, "triangle", frequency, at, until, -4).connect(filter);
  oscillator(context, "triangle", frequency, at, until, 5).connect(filter);
  // A quiet sine an octave down gives the string some body.
  const body = envelope(
    context,
    at,
    gain * HARP_LEVEL * 0.3,
    0.008,
    decay * 0.7,
  );
  oscillator(context, "sine", frequency / 2, at, until).connect(body);
  body.connect(out);
}

export interface PadOptions {
  gain?: number;
  dark?: boolean;
  /** Fraction of the length spent fading in. A high value is a swell. */
  attack?: number;
}

/** A soft held chord: pairs of sines a few cents apart, slow in, slow out. */
export function pad(
  context: BaseAudioContext,
  out: AudioNode,
  at: number,
  frequencies: readonly number[],
  seconds: number,
  { gain = 0.04, dark = false, attack = 0.3 }: PadOptions = {},
): void {
  const until = at + seconds + 0.05;
  const env = context.createGain();
  env.gain.setValueAtTime(SILENT, at);
  env.gain.linearRampToValueAtTime(gain, at + seconds * attack);
  env.gain.setValueAtTime(gain, at + seconds * Math.max(attack, 0.55));
  env.gain.linearRampToValueAtTime(SILENT, at + seconds);
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(dark ? 420 : 1800, at);
  filter.connect(env).connect(out);
  for (const frequency of frequencies) {
    oscillator(context, "sine", frequency, at, until, -4).connect(filter);
    oscillator(context, "sine", frequency, at, until, 4).connect(filter);
    if (dark) {
      // A touch of triangle makes low notes audible on phone speakers.
      const edge = context.createGain();
      edge.gain.setValueAtTime(0.35, at);
      oscillator(context, "triangle", frequency * 2, at, until)
        .connect(edge)
        .connect(filter);
    }
  }
}

export interface NoiseOptions {
  /** Band centre in Hz at the start and, if it sweeps, at the end. */
  from: number;
  to?: number;
  gain?: number;
  q?: number;
  /** Where in the shared noise buffer to start, so layers differ. */
  offset?: number;
}

/** A breath of band-passed noise: cloud whooshes, card flicks, sparkle. */
export function breath(
  context: BaseAudioContext,
  out: AudioNode,
  at: number,
  seconds: number,
  { from, to = from, gain = 0.05, q = 1.2, offset = 0 }: NoiseOptions,
): void {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(q, at);
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + seconds);
  const env = context.createGain();
  const attack = Math.min(0.04, seconds * 0.3);
  env.gain.setValueAtTime(SILENT, at);
  env.gain.linearRampToValueAtTime(gain, at + attack);
  env.gain.exponentialRampToValueAtTime(SILENT, at + seconds);
  source.connect(filter).connect(env).connect(out);
  source.start(at, offset % 1.9);
  source.stop(at + seconds + 0.03);
}

/** A soft low knock (a lock closing, a card landing): a sine that drops. */
export function thump(
  context: BaseAudioContext,
  out: AudioNode,
  at: number,
  { gain = 0.2, frequency = 110 }: { gain?: number; frequency?: number } = {},
): void {
  const osc = context.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, at);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, at + 0.14);
  const env = envelope(context, at, gain, 0.005, 0.2);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + 0.25);
}

/** A sine that slides from one pitch to another: the shooting star. */
export function glide(
  context: BaseAudioContext,
  out: AudioNode,
  at: number,
  from: number,
  to: number,
  seconds: number,
  gain = 0.04,
): void {
  const osc = context.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + seconds);
  const env = envelope(context, at, gain, 0.03, seconds - 0.03);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + seconds + 0.05);
}
