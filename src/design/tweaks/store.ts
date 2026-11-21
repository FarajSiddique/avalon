/**
 * The live tweak state, shared by the studio and every Starlit prototype page
 * it previews. localStorage holds it, so it survives reloads and reaches the
 * preview iframes through the `storage` event. Prototype-only.
 */
import { useSyncExternalStore } from "react";
import { DEFAULT_STATE, sanitizeState, type TweakState } from "./state";

const STATE_KEY = "avalon:starlit-tweaks:v1";
const BYPASS_KEY = "avalon:starlit-tweaks:bypass";
const SAVED_KEY = "avalon:starlit-tweaks:saved";

type Listener = () => void;
const listeners = new Set<Listener>();

let state: TweakState | null = null;
let bypass = false;
let saved: TweakState[] | null = null;

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota: the tweak still applies to this page.
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

let listening = false;
function listen(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("storage", (event) => {
    if (event.key === STATE_KEY) state = sanitizeState(readJson(STATE_KEY));
    else if (event.key === BYPASS_KEY) bypass = readJson(BYPASS_KEY) === true;
    else if (event.key === SAVED_KEY) saved = null;
    else return;
    emit();
  });
}

function subscribe(listener: Listener): () => void {
  listen();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTweaks(): TweakState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  state ??= sanitizeState(readJson(STATE_KEY));
  return state;
}

function commit(next: TweakState): void {
  state = next;
  writeJson(STATE_KEY, state);
  emit();
}

// Undo history. Only the studio calls setTweaks, so it lives here, in memory.
let past: TweakState[] = [];
let future: TweakState[] = [];
let lastChangeAt = 0;
let flags = { canUndo: false, canRedo: false };

function updateFlags(): void {
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  if (canUndo !== flags.canUndo || canRedo !== flags.canRedo)
    flags = { canUndo, canRedo };
}

/** Change the dial. Changes within half a second (a slider drag) undo as one. */
export function setTweaks(
  next: TweakState | ((current: TweakState) => TweakState),
): void {
  const current = getTweaks();
  const value = typeof next === "function" ? next(current) : next;
  if (value === current) return;
  const now = Date.now();
  if (now - lastChangeAt > 500) past = [...past.slice(-199), current];
  lastChangeAt = now;
  future = [];
  updateFlags();
  commit(value);
}

export function undo(): void {
  const previous = past.at(-1);
  if (!previous) return;
  past = past.slice(0, -1);
  future = [getTweaks(), ...future];
  lastChangeAt = 0;
  updateFlags();
  commit(previous);
}

export function redo(): void {
  const next = future[0];
  if (!next) return;
  future = future.slice(1);
  past = [...past, getTweaks()];
  lastChangeAt = 0;
  updateFlags();
  commit(next);
}

const NO_HISTORY = { canUndo: false, canRedo: false };

export function useHistory(): { canUndo: boolean; canRedo: boolean } {
  return useSyncExternalStore(
    subscribe,
    () => flags,
    () => NO_HISTORY,
  );
}

function getBypass(): boolean {
  if (typeof window === "undefined") return false;
  return bypass;
}

/** While true, every preview shows the untouched Starlit defaults. */
export function setBypass(value: boolean): void {
  bypass = value;
  writeJson(BYPASS_KEY, value);
  emit();
}

const NO_SAVED: TweakState[] = [];

function getSaved(): TweakState[] {
  if (typeof window === "undefined") return NO_SAVED;
  if (saved === null) {
    const raw = readJson(SAVED_KEY);
    saved = Array.isArray(raw) ? raw.map(sanitizeState) : [];
  }
  return saved;
}

/** Save a dial under its name, replacing one with the same name. */
export function saveDial(dial: TweakState): void {
  const rest = getSaved().filter((d) => d.name !== dial.name);
  saved = [...rest, dial];
  writeJson(SAVED_KEY, saved);
  emit();
}

export function deleteDial(name: string): void {
  saved = getSaved().filter((d) => d.name !== name);
  writeJson(SAVED_KEY, saved);
  emit();
}

/** The server always renders the defaults; saved tweaks apply after hydration. */
export function useTweaks(): TweakState {
  return useSyncExternalStore(subscribe, getTweaks, () => DEFAULT_STATE);
}

export function useBypass(): boolean {
  return useSyncExternalStore(subscribe, getBypass, () => false);
}

export function useSavedDials(): TweakState[] {
  return useSyncExternalStore(subscribe, getSaved, () => NO_SAVED);
}
