import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ROLE_VARIANTS, isRoleVariant } from "@/design/directions";
import { RoleScreen } from "../../_components/role/role-screen";

export const metadata: Metadata = { title: "Your role · Starlit Vale" };

export function generateStaticParams() {
  return ROLE_VARIANTS.map((role) => ({ role }));
}

type Params = PageProps<"/design/starlit/role/[role]">["params"];

async function Role({ params }: { params: Params }) {
  const { role } = await params;
  if (!isRoleVariant(role)) notFound();
  return <RoleScreen variant={role} />;
}

/**
 * Both variants are prerendered (see generateStaticParams). The Suspense
 * boundary is what lets Next treat `await params` as instant on navigation.
 */
export default function RolePage({
  params,
}: PageProps<"/design/starlit/role/[role]">) {
  return (
    <Suspense fallback={null}>
      <Role params={params} />
    </Suspense>
  );
}
