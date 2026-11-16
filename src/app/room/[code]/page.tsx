import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ROOM_CODE_PATTERN, normalizeRoomCode } from "@/shared/constants";
import { RoomScreen } from "./room-screen";

export const metadata: Metadata = { title: "Room" };

/**
 * The room route. It only validates the code's shape. Whether the room
 * exists is answered by the socket, because room state lives in the custom
 * server and not in anything Next.js renders.
 */
async function Room({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeRoomCode(raw);
  if (!ROOM_CODE_PATTERN.test(code)) notFound();
  return <RoomScreen code={code} />;
}

export default function RoomPage({ params }: PageProps<"/room/[code]">) {
  return (
    <Suspense fallback={null}>
      <Room params={params} />
    </Suspense>
  );
}
