import { NextResponse } from "next/server";
import { getWeekByMonday } from "@/lib/db";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monday = searchParams.get("monday");
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const computedMonday = new Date(today);
  computedMonday.setDate(today.getDate() + mondayOffset);
  computedMonday.setHours(0, 0, 0, 0);
  const mondayIso = monday ?? computedMonday.toISOString().slice(0, 10);

  const week = getWeekByMonday(mondayIso);
  return NextResponse.json({ monday: mondayIso, days: week });
}


