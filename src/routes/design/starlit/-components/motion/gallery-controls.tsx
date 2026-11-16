import { useState } from "react";
import { useAmbience, useSoundToggle } from "@/client/sound";
import { Switch } from "../switch";

/**
 * The gallery's own switches. Sound is the same remembered preference as
 * the switch on every screen; the ambience is for this page only and starts
 * off every time.
 */
export function GalleryControls() {
  const sound = useSoundToggle();
  const [ambience, setAmbience] = useState(false);
  useAmbience(ambience);

  return (
    <section
      aria-label="Sound for this page"
      className="sl-panel grid gap-x-6 px-4 py-1 lg:grid-cols-2 lg:px-5"
    >
      <Switch
        checked={sound.enabled}
        onToggle={sound.toggle}
        label="Sound"
        description="Every cue below is made in code as it plays. Off until you switch it on."
      />
      <div className="border-line border-t border-dashed lg:border-t-0 lg:border-l lg:pl-6">
        <Switch
          checked={ambience}
          onToggle={() => setAmbience((on) => !on)}
          label="Campfire ambience"
          description={
            sound.enabled
              ? "A quiet crackle and the night around it, looping."
              : "A quiet crackle and the night around it. Needs Sound on."
          }
        />
      </div>
    </section>
  );
}
