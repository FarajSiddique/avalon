import { IconCrown } from "@/components/ui/icons";

/**
 * A short notice at the top of the screen, for everyone at the table (the
 * new host included). It lasts 5 seconds: its CSS animation is its timer,
 * and it is dismissed when that ends. The live region is always there, so
 * a screen reader hears each notice as it arrives. The crown in the seat
 * list is the lasting sign of who the host is.
 */
export function HostNotice({
  notice,
  onDone,
}: {
  notice: { text: string; id: number } | null;
  onDone: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-4"
    >
      {notice ? (
        <p
          key={notice.id}
          data-testid="notice"
          className="sl-panel sl-toast inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) {
              onDone();
            }
          }}
        >
          <IconCrown size={18} className="text-accent flex-none" />
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
