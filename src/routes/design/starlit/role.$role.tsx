import { createFileRoute, notFound } from "@tanstack/react-router";
import { isRoleVariant } from "@/design/directions";
import { RoleScreen } from "./-components/role/role-screen";
import { RoleStageScreen } from "./-components/role/role-stage-screen";
import { useStage } from "./-components/stage/stage-context";

export const Route = createFileRoute("/design/starlit/role/$role")({
  beforeLoad: ({ params }) => {
    if (!isRoleVariant(params.role)) throw notFound();
  },
  head: () => ({ meta: [{ title: "Your role · Starlit Vale" }] }),
  component: RolePage,
});

function RolePage() {
  const { role } = Route.useParams();
  const { status } = useStage();
  if (!isRoleVariant(role)) return null;
  // A different role is a different screen: remount so nothing carries over.
  // Without WebGL (a failed stage stays failed) the flat card is the screen.
  return status === "failed" ? (
    <RoleScreen key={role} variant={role} />
  ) : (
    <RoleStageScreen key={role} variant={role} />
  );
}
