import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/db";

export async function GET() {
  const result = await checkDatabaseConnection();

  if (!result.ok) {
    return NextResponse.json(result, { status: 503 });
  }

  return NextResponse.json(result);
}
