import { PlanBox } from "@/components/PlanBox";
import { PageTitle } from "@/components/ui";

export default function Plan() {
  return (
    <div className="max-w-2xl">
      <PageTitle title="Plan with Tick" sub="Turn what you saved into a real plan." />
      <PlanBox />
    </div>
  );
}
