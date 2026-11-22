/**
 * The screens of the Starlit Vale prototype. Prototype-only: this folder is
 * removed once the real screens are built from it.
 */

const ROLE_VARIANTS = ["merlin", "assassin"] as const;

export type RoleVariant = (typeof ROLE_VARIANTS)[number];

export function isRoleVariant(value: string): value is RoleVariant {
  return (ROLE_VARIANTS as ReadonlyArray<string>).includes(value);
}

/** The in-game table is shown at five moments of one round. */
export const TABLE_STEPS = [
  "propose",
  "vote",
  "reveal",
  "quest",
  "result",
] as const;
export type TableStep = (typeof TABLE_STEPS)[number];

export function isTableStep(value: string): value is TableStep {
  return (TABLE_STEPS as ReadonlyArray<string>).includes(value);
}

export const TABLE_STEP_LABELS: Record<TableStep, string> = {
  propose: "Team proposal",
  vote: "Team vote",
  reveal: "Votes revealed",
  quest: "Quest cards",
  result: "Quest result",
};

/** Every prototype URL. Use these instead of string paths. */
export function designPaths() {
  const base = "/design/starlit" as const;

  return {
    landing: base,
    lobby: `${base}/lobby`,
    role: (variant: RoleVariant) => `${base}/role/${variant}` as const,
    table: (step: TableStep) => `${base}/table/${step}` as const,
  } as const;
}
