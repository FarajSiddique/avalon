import { IconStar } from "./icons";

/**
 * The landing title. As the page opens the eyebrow, the word and the line
 * under it rise in turn, and a small star lights above the last letter
 * (CSS only; at rest it is simply the title).
 */
export function TitleMark({ as: Heading = "h1" }: { as?: "h1" | "p" }) {
  return (
    <>
      <p className="sl-eyebrow sl-rise sl-seq">A game of hidden loyalty</p>
      <Heading className="sl-wordmark sl-title font-display mt-1">
        <span className="sl-title__word sl-seq">
          Avalon
          <IconStar size={22} className="sl-title__star sl-seq" />
        </span>
      </Heading>
    </>
  );
}
