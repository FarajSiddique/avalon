import { createFileRoute, notFound } from "@tanstack/react-router";
import { isRoleVariant } from "@/design/directions";
import { RoleScreen } from "./-components/role/role-screen";

export const Route = createFileRoute("/design/starlit/role/$role")({
  beforeLoad: ({ params }) => {
    if (!isRoleVariant(params.role)) throw notFound();
  },
  head: () => ({ meta: [{ title: "Your role · Starlit Vale" }] }),
  component: RolePage,
});

function RolePage() {
  const { role } = Route.useParams();
  if (!isRoleVariant(role)) return null;
  // A different role is a different screen: remount so nothing carries over.
  return <RoleScreen key={role} variant={role} />;
}
