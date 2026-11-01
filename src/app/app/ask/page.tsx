import { AskBox } from "@/components/AskBox";
import { PageTitle } from "@/components/ui";

export default function Ask() {
  return (
    <div className="max-w-2xl">
      <PageTitle title="Ask Tick" sub="Ask anything about what you’ve saved." />
      <AskBox />
    </div>
  );
}
