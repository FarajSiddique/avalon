import { useId, type ReactNode } from "react";
import { IconChevronDown } from "../icons";

/**
 * A collapsible lobby section. The whole summary row is the button (at
 * least 52px tall), and it says the section's state in words even when
 * closed. A closed body is inert, so focus never lands in hidden controls.
 */
export function Disclosure({
  title,
  summary,
  open,
  onToggle,
  name,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  /** For tests and the prototype's own links: `data-section`. */
  name: string;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <div className="sl-disclosure" data-open={open} data-section={name}>
      <h2>
        <button
          type="button"
          id={`${id}-button`}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={onToggle}
          className="sl-disclosure__summary"
        >
          <span className="flex min-w-0 flex-1 items-baseline gap-3">
            <span className="font-display flex-none text-xl leading-tight font-medium">
              {title}
            </span>
            <span className="text-ink-muted min-w-0 flex-1 truncate text-right text-base leading-snug">
              {summary}
            </span>
          </span>
          <IconChevronDown size={22} className="sl-disclosure__chevron" />
        </button>
      </h2>
      <div
        id={`${id}-body`}
        role="region"
        aria-labelledby={`${id}-button`}
        className="sl-disclosure__body"
        inert={!open}
      >
        <div className="sl-disclosure__inner">
          <div className="px-0.5 pt-1 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
