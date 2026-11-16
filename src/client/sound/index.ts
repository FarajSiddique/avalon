/**
 * Sound for Avalon: every cue is synthesised with the Web Audio API, so there
 * are no audio files. Off until the player switches it on.
 *
 *   play("vote-lock")                    a cue, now
 *   play("join", { index: 3, delay: 0.4 })  a climbing cue, scheduled
 *   setEnabled(true) / isEnabled()       the remembered preference
 *   useSoundToggle()                     the same, for a React toggle
 *   useAmbience(on)                      the campfire and night bed
 *
 * This folder must not import from src/app or src/design: the real game
 * uses it too.
 */
export { CUE_NAMES, CUES, renderCue } from "./cues";
export type { CueName, CueOptions } from "./cues";
export { createMasterChain, MASTER_LEVEL } from "./master";
export { startAmbience } from "./ambience";
export type { AmbienceHandle } from "./ambience";
export {
  isEnabled,
  play,
  setEnabled,
  startAmbienceLoop,
  stopAmbienceLoop,
  subscribe,
} from "./engine";
export type { CueHandle } from "./engine";
export { useAmbience, useSoundToggle } from "./use-sound";
