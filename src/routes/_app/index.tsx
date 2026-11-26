import { Link, createFileRoute } from "@tanstack/react-router";
import { LandingScreen } from "@/components/landing/landing-screen";
import { StartForm } from "@/components/landing/start-form";

export const Route = createFileRoute("/_app/")({ component: HomePage });

/**
 * The landing on the 3D Star Table. The form creates or joins a real room
 * and the camera flies there, into the lobby on the same table.
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
