import { startAmbience, type AmbienceHandle } from "./ambience";
import { CUES, renderCue, type CueName, type CueOptions } from "./cues";
import { createMasterChain } from "./master";

/**
 * The live sound engine: one AudioContext for the page, created on demand.
 *
 * Sound is OFF until the player switches it on, and the choice is
 * remembered. Every function here is safe to call on the server, in a
 * browser without Web Audio, or before the player has touched the page:
 * it does nothing and never throws.
 */

const STORAGE_KEY = "avalon:sound";
/** At most this many cues sound at once; the oldest is faded out. */
const MAX_VOICES = 8;
/** The same cue asked for twice within this many seconds plays once. */
const DOUBLE_TRIGGER = 0.04;

export interface CueHandle {
  /** Fade the cue out now (or cancel it if it has not started). */
  stop: () => void;
}

const SILENT_HANDLE: CueHandle = { stop: () => {} };

interface Voice {
  bus: GainNode;
  end: number;
  done: boolean;
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
type ActivationNavigator = Navigator & {
  userActivation?: { hasBeenActive: boolean };
};

let enabled: boolean | null = null;
let context: AudioContext | null = null;
let master: GainNode | null = null;
let voices: Voice[] = [];
const lastPlayed = new Map<string, number>();
const listeners = new Set<() => void>();
let ambienceWanted = 0;
let ambience: AmbienceHandle | null = null;

function inBrowser(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function writeStored(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
}

/** Browsers refuse to start audio before the first tap; do not even ask. */
function hasGesture(): boolean {
  const activation = (navigator as ActivationNavigator).userActivation;
  return activation ? activation.hasBeenActive : true;
}

function audio(): { context: AudioContext; master: GainNode } | null {
  if (!inBrowser() || !hasGesture()) return null;
  if (!context) {
    const Ctor =
      window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor({ latencyHint: "interactive" });
      master = createMasterChain(context);
    } catch {
      context = null;
      master = null;
      return null;
    }
  }
  if (!master) return null;
  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }
  return { context, master };
}

function release(voice: Voice, fade: number): void {
  if (voice.done || !context) return;
  voice.done = true;
  const now = context.currentTime;
  try {
    voice.bus.gain.cancelScheduledValues(now);
    voice.bus.gain.setTargetAtTime(0, now, fade / 3);
  } catch {
    // The node may already be gone.
  }
  window.setTimeout(
    () => {
      try {
        voice.bus.disconnect();
      } catch {
        // Already disconnected.
      }
    },
    fade * 1000 + 60,
  );
}

/** Unlock the context on the first gesture, if the player wants sound. */
function unlock(): void {
  if (isEnabled()) {
    audio();
    syncAmbience();
  }
  if (context?.state === "running") {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  }
}

if (inBrowser()) {
  window.addEventListener("pointerdown", unlock, {
    capture: true,
    passive: true,
  });
  window.addEventListener("keydown", unlock, { capture: true, passive: true });
}

export function isEnabled(): boolean {
  if (!inBrowser()) return false;
  if (enabled === null) enabled = readStored();
  return enabled;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setEnabled(on: boolean): void {
  if (!inBrowser()) return;
  enabled = on;
  writeStored(on);
  try {
    if (on) {
      play("sound-on");
      syncAmbience();
    } else {
      voices.forEach((voice) => release(voice, 0.08));
      voices = [];
      syncAmbience();
    }
  } catch {
    // Sound is a nicety; never let it break the page.
  }
  listeners.forEach((listener) => listener());
}

/** Play a cue. Returns a handle to stop it early (a skipped animation). */
export function play(cue: CueName, options: CueOptions = {}): CueHandle {
  if (!isEnabled()) return SILENT_HANDLE;
  try {
    const live = audio();
    if (!live) return SILENT_HANDLE;
    const now = live.context.currentTime;
    const delay = Math.max(0, options.delay ?? 0);
    const index = options.index ?? 0;
    const key = `${cue}:${index}:${Math.round(delay * 100)}`;
    const last = lastPlayed.get(key);
    if (last !== undefined && now - last < DOUBLE_TRIGGER) return SILENT_HANDLE;
    lastPlayed.set(key, now);

    voices = voices.filter((voice) => !voice.done && voice.end > now);
    while (voices.length >= MAX_VOICES) {
      const oldest = voices.shift();
      if (oldest) release(oldest, 0.05);
    }

    const spec = CUES[cue];
    const at = now + 0.01 + delay;
    const bus = live.context.createGain();
    bus.connect(live.master);
    renderCue(live.context, bus, cue, at, index);
    const voice: Voice = { bus, end: at + spec.length + 0.05, done: false };
    voices.push(voice);
    window.setTimeout(
      () => {
        voice.done = true;
        try {
          bus.disconnect();
        } catch {
          // Already disconnected.
        }
      },
      (voice.end - now) * 1000 + 200,
    );

    if (
      spec.vibrate &&
      delay === 0 &&
      typeof navigator.vibrate === "function"
    ) {
      // Android only. iPhones have no Vibration API, so this does nothing there.
      navigator.vibrate([...spec.vibrate]);
    }
    return { stop: () => release(voice, 0.06) };
  } catch {
    return SILENT_HANDLE;
  }
}

function syncAmbience(): void {
  const want = ambienceWanted > 0 && isEnabled();
  if (want && !ambience) {
    const live = audio();
    if (live) ambience = startAmbience(live.context, live.master);
  } else if (!want && ambience) {
    ambience.stop();
    ambience = null;
  }
}

/**
 * Ask for the fire and night bed. Counted, so two screens can both want it;
 * it plays while at least one does and sound is on.
 */
export function startAmbienceLoop(): void {
  if (!inBrowser()) return;
  ambienceWanted += 1;
  try {
    syncAmbience();
  } catch {
    // Ignore: ambience is optional.
  }
}

export function stopAmbienceLoop(): void {
  if (!inBrowser()) return;
  ambienceWanted = Math.max(0, ambienceWanted - 1);
  try {
    syncAmbience();
  } catch {
    // Ignore: ambience is optional.
  }
}
