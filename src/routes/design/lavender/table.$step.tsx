import { createFileRoute, notFound } from "@tanstack/react-router";
import { isTableStep } from "@/design/directions";
import { TableScreen } from "./-components/table/table-screen";

export const Route = createFileRoute("/design/lavender/table/$step")({
  beforeLoad: ({ params }) => {
    if (!isTableStep(params.step)) throw notFound();
  },
  head: () => ({ meta: [{ title: "The table · Lavender Vigil" }] }),
  component: TablePage,
});

function TablePage() {
  const { step } = Route.useParams();
  if (!isTableStep(step)) return null;
  // Each step starts fresh: remount so local state does not carry over.
  return <TableScreen key={step} step={step} />;
}
