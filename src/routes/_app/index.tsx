import { Link, createFileRoute } from "@tanstack/react-router";
import { LandingScreen } from "@/components/landing/landing-screen";
import { StartForm } from "@/components/landing/start-form";

export const Route = createFileRoute("/_app/")({ component: HomePage });

/**
 * The landing on the 3D Star Table. The form creates or joins a real room
 * and navigates there; it does not fly the camera, since the room has no
 * stage to land on until Phase 1.
 */
function HomePage() {
  return (
    <LandingScreen
      form={<StartForm />}
      footer={
        <Link to="/design" className="sl-plain">
          Design reference
        </Link>
      }
    />
  );
}
