import { connection } from "next/server";

/** Liveness check for the host platform. Answered at request time, never cached. */
export async function GET(): Promise<Response> {
  await connection();
  return Response.json({ status: "ok" });
}
