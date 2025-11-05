import { NextResponse } from "next/server";
import { getAllDays, getAllExercises, getAllWorkouts, expandDay } from "@/lib/db";
import type { DayExpanded, WorkoutExpanded, Exercise as ServerExercise } from "@/lib/types";

function getCurrentMondayIso(): string {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function makeWeekDatesFromMondayIso(mondayIso: string): string[] {
  const start = new Date(mondayIso);
  start.setHours(0, 0, 0, 0);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    d.setHours(0, 0, 0, 0);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monday = searchParams.get("monday") ?? getCurrentMondayIso();

  // Raw catalogs
  const daysRaw = getAllDays();
  const workoutsRaw = getAllWorkouts();
  const exercisesRaw = getAllExercises();

  // Expanded (server shape)
  const daysExpanded = daysRaw.map(expandDay) as DayExpanded[];

  // UI-shaped week (like your default client schema)
  const requestedWeekIsos = makeWeekDatesFromMondayIso(monday);
  const expandedByIso = new Map<string, DayExpanded>(
    daysExpanded.map((d) => [d.date, d])
  );
  const dataIsoSet = new Set<string>(daysExpanded.map((d) => d.date));
  const requestedOverlapsData = requestedWeekIsos.some((iso) => dataIsoSet.has(iso));

  // If requested week has no overlap with data, fall back to earliest data week
  const earliestIso = daysExpanded
    .map((d) => d.date)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0];
  const fallbackMonday = (() => {
    if (!earliestIso) return monday;
    const d = new Date(earliestIso);
    const dow = d.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    const m = new Date(d);
    m.setDate(d.getDate() + offset);
    m.setHours(0, 0, 0, 0);
    return m.toISOString().slice(0, 10);
  })();
  const effectiveMonday = requestedOverlapsData ? monday : fallbackMonday;
  const effectiveWeekIsos = requestedOverlapsData
    ? requestedWeekIsos
    : makeWeekDatesFromMondayIso(effectiveMonday);

  const uiDaysForWeek = effectiveWeekIsos.map((iso) => {
    const d = expandedByIso.get(iso);
    if (!d) return { date: iso, sections: [] };
    const workouts = (d.workouts ?? []) as WorkoutExpanded[];
    return {
      date: iso,
      sections: workouts.map((w) => {
        const rawWid = String(w.id ?? "w");
        const sectionId = rawWid.startsWith("sec-") ? rawWid : `sec-${iso}-${rawWid}`;
        return {
          id: sectionId,
          title: String(w.name ?? "WORKOUT"),
          exercises: (w.exercises ?? []).map((e: ServerExercise) => {
            const rawEid = String(e.id ?? "e");
            const exerciseId = rawEid.startsWith("ex-") ? rawEid : `ex-${rawWid}-${rawEid}`;
            return {
              id: exerciseId,
              name: String(e.name ?? "Exercise"),
              sets: String((e as ServerExercise).setsCount ?? "1"),
              details: String((e as ServerExercise).setsInfo ?? ""),
            };
          }),
        };
      }),
    };
  });

  return NextResponse.json({
    monday,
    resolvedMonday: effectiveMonday,
    daysRaw,
    workoutsRaw,
    exercisesRaw,
    daysExpanded,
    uiDaysForWeek,
  });
}


