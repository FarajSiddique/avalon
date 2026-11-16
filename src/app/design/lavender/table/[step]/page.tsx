import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TABLE_STEPS, isTableStep } from "@/design/directions";
import { TableScreen } from "../../_components/table/table-screen";

export const metadata: Metadata = { title: "The table · Lavender Vigil" };

export function generateStaticParams() {
  return TABLE_STEPS.map((step) => ({ step }));
}

type Params = PageProps<"/design/lavender/table/[step]">["params"];

async function Table({ params }: { params: Params }) {
  const { step } = await params;
  if (!isTableStep(step)) notFound();
  return <TableScreen step={step} />;
}

/**
 * All five steps are prerendered (see generateStaticParams). The Suspense
 * boundary is what lets Next treat `await params` as instant on navigation.
 */
export default function TablePage({
  params,
}: PageProps<"/design/lavender/table/[step]">) {
  return (
    <Suspense fallback={null}>
      <Table params={params} />
    </Suspense>
  );
}
