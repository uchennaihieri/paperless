import { getMyQueue } from "@/app/actions/workflow";
import WorkflowClient from "./client";

export default async function WorkflowPage() {
  const queue = await getMyQueue();
  return <WorkflowClient initialQueue={queue as any} />;
}
