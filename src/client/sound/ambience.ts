import { pitch } from "./scale";

/**
 * The campfire and the night around it, made in code.
 *
 * - Crackle: a buffer of seeded pops (single snaps and little clusters),
 *   written so any pop that runs past the end wraps round to the start. The
 *   buffer loops with no seam because its last sample leads straight into
 *   its first.
 * - Roar: low-passed noise that swells slowly, the body of the fire.
 * - Night bed: three very quiet sines on D and A with slow, out-of-step
 *   tremolo, and a breath of wind. Oscillators never loop, so there is no
 *   seam to hear.
 *
 * Crackle (11.7s) and noise (7.3s) loop at lengths that do not divide each
 * other, so the pattern takes minutes to repeat.
 */

const CRACKLE_SECONDS = 11.7;
const NOISE_SECONDS = 7.3;
const SILENT = 0.0001;

export const AMBIENCE_FADE_IN = 2.5;
export const AMBIENCE_FADE_OUT = 1.2;

function seeded(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function crackleBuffer(context: BaseAudioContext): AudioBuffer {
  const rate = context.sampleRate;
  const length = Math.floor(rate * CRACKLE_SECONDS);
  const buffer = context.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  const random = seeded(0x51_ab_1e);

  const pop = (start: number, amp: number, tau: number) => {
    const decay = tau * rate;
    const span = Math.ceil(decay * 6);

    for (let k = 0; k < span; k += 1) {
      const index = (start + k) % length;

      data[index] =
        (data[index] ?? 0) + amp * (random() * 2 - 1) * Math.exp(-k / decay);
    }
  };

  let time = 0;

  while (time < CRACKLE_SECONDS) {
    const start = Math.floor(time * rate);

    if (random() < 0.18) {
      // A little cluster: a log settling.
      const count = 3 + Math.floor(random() * 4);

      for (let i = 0; i < count; i += 1) {
        pop(
          start + Math.floor(random() * 0.12 * rate),
          0.25 + random() * 0.5,
          0.0012 + random() * 0.003,
        );
      }
    } else {
      pop(start, 0.15 + random() ** 2 * 0.85, 0.0015 + random() * 0.006);
    }

    time += 0.05 + random() ** 1.6 * 0.6;
  }

  return buffer;
}

function noise(context: BaseAudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * NOISE_SECONDS);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  const random = seeded(0x7e_11);

  for (let i = 0; i < length; i += 1) {
    data[i] = random() * 2 - 1;
  }

  return buffer;
}

/** A slow sine that wobbles an AudioParam around its value. */
function lfo(
  context: BaseAudioContext,
  target: AudioParam,
  hz: number,
  depth: number,
  at: number,
): OscillatorNode {
  const osc = context.createOscillator();

  osc.frequency.value = hz;
  const amount = context.createGain();

  amount.gain.value = depth;
  osc.connect(amount).connect(target);
  osc.start(at);

  return osc;
}

export interface AmbienceHandle {
  /** Fade out over `seconds`, then release every node. */
  stop: (seconds?: number) => void;
}

/** Start the fire and the night bed on any context, fading in. */
export function startAmbience(
  context: BaseAudioContext,
  out: AudioNode,
  at = context.currentTime,
): AmbienceHandle {
  const sources: Array<AudioScheduledSourceNode> = [];
  const bus = context.createGain();

  bus.gain.setValueAtTime(SILENT, at);
  bus.gain.exponentialRampToValueAtTime(1, at + AMBIENCE_FADE_IN);
  bus.connect(out);

  // Crackle
  const crackle = context.createBufferSource();

  crackle.buffer = crackleBuffer(context);
  crackle.loop = true;
  const crackleTone = context.createBiquadFilter();

  crackleTone.type = "bandpass";
  crackleTone.frequency.value = 2400;
  crackleTone.Q.value = 0.5;
  const crackleLevel = context.createGain();

  crackleLevel.gain.value = 0.16;
  crackle.connect(crackleTone).connect(crackleLevel).connect(bus);
  crackle.start(at);
  sources.push(crackle);

  // Roar and wind share one long noise buffer, read from different points.
  const noiseBuffer = noise(context);
  const roar = context.createBufferSource();

  roar.buffer = noiseBuffer;
  roar.loop = true;
  const roarTone = context.createBiquadFilter();

  roarTone.type = "lowpass";
  roarTone.frequency.value = 240;
  roarTone.Q.value = 0.4;
  const roarLevel = context.createGain();

  roarLevel.gain.value = 0.035;
  roar.connect(roarTone).connect(roarLevel).connect(bus);
  sources.push(lfo(context, roarLevel.gain, 0.13, 0.012, at));
  roar.start(at);
  sources.push(roar);

  const wind = context.createBufferSource();

  wind.buffer = noiseBuffer;
  wind.loop = true;
  const windTone = context.createBiquadFilter();

  windTone.type = "bandpass";
  windTone.frequency.value = 420;
  windTone.Q.value = 0.7;
  const windLevel = context.createGain();

  windLevel.gain.value = 0.012;
  wind.connect(windTone).connect(windLevel).connect(bus);
  wind.start(at, NOISE_SECONDS / 2);
  sources.push(
    lfo(context, windTone.frequency, 0.045, 160, at),
    lfo(context, windLevel.gain, 0.07, 0.006, at),
    wind,
  );

  // Night bed: D3, A3, D4, each breathing at its own slow rate.
  const bedTone = context.createBiquadFilter();

  bedTone.type = "lowpass";
  bedTone.frequency.value = 900;
  bedTone.connect(bus);
  [
    { degree: -5, level: 0.009, rate: 0.051 },
    { degree: -2, level: 0.006, rate: 0.067 },
    { degree: 0, level: 0.004, rate: 0.083 },
  ].forEach(({ degree, level, rate }) => {
    const osc = context.createOscillator();

    osc.type = "sine";
    osc.frequency.value = pitch(degree);
    const gain = context.createGain();

    gain.gain.value = level;
    osc.connect(gain).connect(bedTone);
    sources.push(lfo(context, gain.gain, rate, level * 0.6, at));
    osc.start(at);
    sources.push(osc);
  });

  let stopped = false;

  return {
    stop: (seconds = AMBIENCE_FADE_OUT) => {
      if (stopped) {
        return;
      }

      stopped = true;
      const now = context.currentTime;

      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(Math.max(bus.gain.value, SILENT), now);
      bus.gain.exponentialRampToValueAtTime(SILENT, now + seconds);

      for (const source of sources) {
        try {
          source.stop(now + seconds + 0.05);
        } catch {
          // Already stopped.
        }
      }
    },
  };
}
