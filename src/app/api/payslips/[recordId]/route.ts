import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertRateLimit } from "@/lib/rate-limit";
import { payslipService } from "@/features/payslips/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payslips/:recordId — streams the payslip PDF.
 * Auth: any signed-in role (payslips are read-only artifacts); rate-limited.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const user = await requireRole("VIEWER");
    assertRateLimit(`payslip:${user.id}`, { limit: 30, windowMs: 60_000 });

    const { recordId } = await params;
    const { buffer, filename } = await payslipService.generateForRecord(
      recordId,
      user.id,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    logger.error("Payslip generation failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to generate payslip" },
      { status: 500 },
    );
  }
}
