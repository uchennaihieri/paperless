import { getActionItems } from "@/app/actions/form";
import ActionClient from "../client";

export default async function ActionDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  const items = await getActionItems();
  
  return <ActionClient items={items as any} viewMode="detail" detailId={resolvedParams.id} />;
}
