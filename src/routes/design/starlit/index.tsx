import { createFileRoute } from "@tanstack/react-router";
import { LandingScreen } from "@/components/landing/landing-screen";
import { LandingForm } from "./-components/landing-form";

export const Route = createFileRoute("/design/starlit/")({
  component: StarlitLandingPage,
});

function StarlitLandingPage() {
  return <LandingScreen form={<LandingForm />} />;
}
