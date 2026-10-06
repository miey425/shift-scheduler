import { NextResponse } from "next/server";
import { decodeShiftPeriodCode } from "@/lib/availability/shortUrl";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { code } = await params;
  const periodId = decodeShiftPeriodCode(code);

  if (!periodId) {
    return new Response("Not Found", { status: 404 });
  }

  return NextResponse.redirect(new URL(`/availability/periods/${periodId}`, request.url));
}
