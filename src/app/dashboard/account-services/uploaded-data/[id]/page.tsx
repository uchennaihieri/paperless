import React from "react";
import UploadedDataDetailClientPage from "./client-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UploadedDataDetailClientPage datasetId={id} />;
}
