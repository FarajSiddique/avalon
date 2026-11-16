import { createFileRoute, notFound } from "@tanstack/react-router";
import { RoomScreen } from "@/components/room-screen";
import { ROOM_CODE_PATTERN, normalizeRoomCode } from "@/shared/constants";

/**
 * The room route. It only checks the code's shape. Whether the room exists
 * is answered over the socket by the room itself.
 */
export const Route = createFileRoute("/room/$code")({
  beforeLoad: ({ params }) => {
    if (!ROOM_CODE_PATTERN.test(normalizeRoomCode(params.code))) {
      throw notFound();
    }
  },
  head: () => ({ meta: [{ title: "Room · Avalon" }] }),
  component: RoomPage,
});

function RoomPage() {
  const { code } = Route.useParams();
  const roomCode = normalizeRoomCode(code);
  // A new code is a new room: remount so no state carries over.
  return <RoomScreen key={roomCode} code={roomCode} />;
}
