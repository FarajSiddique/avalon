/**
 * Validators for everything a browser can send. They run on the server, in
 * the Worker and in the room object. The types they check are declared by
 * hand in protocol.ts, and `satisfies` below keeps the two in step.
 */

import { z } from "zod";
import {
  NAME_MAX_LENGTH,
  NAME_PATTERN,
  ROOM_CODE_PATTERN,
  normalizeName,
  normalizeRoomCode,
} from "./constants";
import type {
  CreateRoomInput,
  GameAction,
  JoinRoomInput,
  ResumeInput,
  SettingsInput,
} from "./protocol";
import { OPTIONAL_ROLES } from "./roles";

export const nameSchema = z
  .string()
  .transform(normalizeName)
  .pipe(z.string().min(1).max(NAME_MAX_LENGTH).regex(NAME_PATTERN));

export const roomCodeSchema = z
  .string()
  .transform(normalizeRoomCode)
  .pipe(z.string().regex(ROOM_CODE_PATTERN));

const playerIdSchema = z.string().min(1).max(64);

export const createRoomSchema = z.object({
  name: nameSchema,
}) satisfies z.ZodType<CreateRoomInput>;

export const joinRoomSchema = z.object({
  name: nameSchema,
}) satisfies z.ZodType<JoinRoomInput>;

export const resumeSchema = z.object({
  token: z.string().min(1).max(200),
}) satisfies z.ZodType<ResumeInput>;

export const settingsSchema = z.object({
  optionalRoles: z
    .array(z.enum(OPTIONAL_ROLES))
    .max(OPTIONAL_ROLES.length)
    .refine((roles) => new Set(roles).size === roles.length),
  ladyOfTheLake: z.boolean(),
}) satisfies z.ZodType<SettingsInput>;

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("confirm_role") }),
  z.object({
    type: z.literal("draft_team"),
    playerIds: z.array(playerIdSchema).max(5),
  }),
  z.object({
    type: z.literal("propose_team"),
    playerIds: z.array(playerIdSchema).min(2).max(5),
  }),
  z.object({ type: z.literal("vote"), vote: z.enum(["approve", "reject"]) }),
  z.object({
    type: z.literal("play_card"),
    card: z.enum(["success", "fail"]),
  }),
  z.object({ type: z.literal("lady_examine"), targetId: playerIdSchema }),
  z.object({ type: z.literal("assassinate"), targetId: playerIdSchema }),
]) satisfies z.ZodType<GameAction>;

/** The envelope of every message from a browser. */
export const clientMessageSchema = z.object({
  id: z.number().int().nonnegative(),
  event: z.string().min(1).max(40),
  payload: z.unknown(),
});
