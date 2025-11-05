import { NextResponse } from "next/server";
import { getAllDays } from "@/lib/db";

export function GET() {
  return NextResponse.json({ days: getAllDays() });
}


