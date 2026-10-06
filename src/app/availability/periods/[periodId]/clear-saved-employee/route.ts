import { NextResponse } from "next/server";
import {
  rememberedEmployeeCookieName,
  rememberedEmployeeCookieOptions,
} from "@/lib/availability/rememberedEmployee";
import { shiftPeriodIdSchema } from "@/lib/validators/shift";

type RouteContext = {
  params: Promise<{ periodId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { periodId } = await params;
  const parsedPeriodId = shiftPeriodIdSchema.safeParse(periodId);

  if (!parsedPeriodId.success) {
    return new Response("Not Found", { status: 404 });
  }

  const response = NextResponse.redirect(
    new URL(`/availability/periods/${parsedPeriodId.data}`, request.url),
  );
  response.cookies.set(rememberedEmployeeCookieName, "", {
    ...rememberedEmployeeCookieOptions,
    maxAge: 0,
  });

  return response;
}
