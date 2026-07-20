import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertRateLimit } from "@/lib/rate-limit";

/**
 * Shared wrapper for Excel-report route handlers:
 * auth → rate limit → build workbook → stream .xlsx, with uniform errors.
 */
export async function excelResponse(
  reportKey: string,
  build: (userId: string) => Promise<{ buffer: Buffer; filename: string }>,
): Promise<NextResponse> {
  try {
    const user = await requireRole("VIEWER");
    assertRateLimit(`report:${reportKey}:${user.id}`, {
      limit: 10,
      windowMs: 60_000,
    });

    const { buffer, filename } = await build(user.id);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
    logger.error("Excel report failed", {
      reportKey,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}
