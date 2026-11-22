import { createFileRoute, notFound } from "@tanstack/react-router";
import { isTableStep } from "@/design/directions";
import { NoWebGLNotice } from "./-components/no-webgl-notice";
import { useStage } from "./-components/stage/stage-context";
import { TableStageScreen } from "./-components/table/table-stage-screen";

export const Route = createFileRoute("/design/starlit/table/$step")({
  beforeLoad: ({ params }) => {
    if (!isTableStep(params.step)) {
      throw notFound();
    }
  },
  head: () => ({ meta: [{ title: "The table · Starlit Vale" }] }),
  component: TablePage,
});

function TablePage() {
  const { step } = Route.useParams();
  const { status } = useStage();

  if (!isTableStep(step)) {
    return null;
  }

  // Each step starts fresh: remount so local state does not carry over.
  // Without WebGL (a failed stage stays failed) the game cannot be shown.
  return status === "failed" ? (
    <NoWebGLNotice />
  ) : (
    <TableStageScreen key={step} step={step} />
  );
}
