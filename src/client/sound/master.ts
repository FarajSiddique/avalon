/**
 * The output stage every cue goes through: a low master level, then a
 * compressor set up as a gentle limiter so overlapping cues cannot clip.
 * Works on any BaseAudioContext, so offline renders measure exactly what a
 * player would hear.
 */
export const MASTER_LEVEL = 0.7;

export function createMasterChain(
  context: BaseAudioContext,
  destination: AudioNode = context.destination,
): GainNode {
  const input = context.createGain();

  input.gain.value = MASTER_LEVEL;
  const limiter = context.createDynamicsCompressor();

  limiter.threshold.value = -10;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.15;
  input.connect(limiter).connect(destination);

  return input;
}
