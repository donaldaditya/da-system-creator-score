import { NextRequest, NextResponse } from "next/server";
import { buildExportWorkbook } from "@/lib/parsers/excel";
import * as XLSX from "xlsx";
import type { ScoredCreator } from "@/types/creator";

export interface ExportRequestBody {
  scoredCreators: ScoredCreator[];
  filename?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ExportRequestBody = await req.json();

    if (!body.scoredCreators || !Array.isArray(body.scoredCreators)) {
      return NextResponse.json(
        { error: "scoredCreators array is required" },
        { status: 400 }
      );
    }

    const wb = buildExportWorkbook(body.scoredCreators);

    // Write workbook to buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = body.filename || `creator-roi-scores-${Date.now()}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[/api/export] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate export", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
