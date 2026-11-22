import { createFileRoute, notFound } from "@tanstack/react-router";
import { isRoleVariant } from "@/design/directions";
import { NoWebGLNotice } from "./-components/no-webgl-notice";
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
  // Without WebGL (a failed stage stays failed) the game cannot be shown.
  return status === "failed" ? (
    <NoWebGLNotice />
  ) : (
    <RoleStageScreen key={role} variant={role} />
  );
}
