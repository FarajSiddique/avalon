import { IconCheck, IconRing } from "@/components/ui/icons";

/** Whether this page's socket to the room is open, in words and an icon. */
export function ConnectionStatus({
  online,
  className = "",
}: {
  online: boolean;
  className?: string;
}) {
  return (
    <p
      className={`sl-panel text-ink-muted inline-flex items-center gap-2 px-3 py-2 text-sm ${className}`}
      data-testid="connection"
      data-online={online}
    >
      {online ? <IconCheck size={16} /> : <IconRing size={16} />}
      {online ? "Connected" : "Reconnecting…"}
    </p>
  );
}
