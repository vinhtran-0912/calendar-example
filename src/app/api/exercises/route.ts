import { NextResponse } from "next/server";
import { getAllExercises } from "@/lib/db";

export function GET() {
  return NextResponse.json({ exercises: getAllExercises() });
}


