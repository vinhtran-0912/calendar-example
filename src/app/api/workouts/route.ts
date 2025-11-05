import { NextResponse } from "next/server";
import { getAllWorkouts } from "@/lib/db";

export function GET() {
  return NextResponse.json({ workouts: getAllWorkouts() });
}


