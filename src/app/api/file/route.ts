import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { promises as fs } from "fs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("File ID is required", { status: 400 });
    }

    const fileRecord = await prisma.uploadedFile.findUnique({
      where: { id }
    });

    if (!fileRecord) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = await fs.readFile(fileRecord.filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": fileRecord.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileRecord.originalName}"`,
      },
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
