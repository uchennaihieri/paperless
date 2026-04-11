import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files received." }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const savedFiles = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const filePath = path.join(uploadDir, uniqueName);
      await fs.writeFile(filePath, buffer);
      
      savedFiles.push(`/uploads/${uniqueName}`);
    }

    return NextResponse.json({ success: true, files: savedFiles }, { status: 200 });
  } catch (error) {
    console.error("Error saving files:", error);
    return NextResponse.json({ success: false, error: "Failed to upload files." }, { status: 500 });
  }
}
