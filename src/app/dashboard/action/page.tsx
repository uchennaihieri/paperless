import { getActionItems } from "@/app/actions/form";
import ActionClient from "./client";

export default async function ActionPage() {
  const items = await getActionItems();
  return <ActionClient items={items as any} />;
}
