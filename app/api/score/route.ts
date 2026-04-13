import { NextRequest, NextResponse } from "next/server";
import { scoreCreators } from "@/lib/scoring/composite";
import type { Creator } from "@/types/creator";

export interface ScoreRequestBody {
  creators: Creator[];
  brandingWeight?: number;
  conversionWeight?: number;
}

export interface ScoreResponseBody {
  scored: ReturnType<typeof scoreCreators>;
  meta: {
    total: number;
    processingMs: number;
  };
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body: ScoreRequestBody = await req.json();

    if (!body.creators || !Array.isArray(body.creators)) {
      return NextResponse.json(
        { error: "creators array is required" },
        { status: 400 }
      );
    }

    if (body.creators.length === 0) {
      return NextResponse.json(
        { error: "creators array must not be empty" },
        { status: 400 }
      );
    }

    if (body.creators.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 creators per request" },
        { status: 400 }
      );
    }

    const bw = body.brandingWeight ?? 0.5;
    const cw = body.conversionWeight ?? 0.5;

    const scored = scoreCreators(body.creators, bw, cw);

    const response: ScoreResponseBody = {
      scored,
      meta: {
        total: scored.length,
        processingMs: Date.now() - start,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[/api/score] Error:", err);
    return NextResponse.json(
      { error: "Failed to score creators", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
