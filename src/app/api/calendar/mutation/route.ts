import { NextResponse } from "next/server";
import { getAllDays, getAllExercises, expandDay } from "@/lib/db";
import type {
  DayExpanded,
  WorkoutExpanded,
  Exercise as ServerExercise,
} from "@/lib/types";

// In-memory, non-persistent cache of expanded days keyed by monday ISO
// Note: suitable for local dev; not durable in serverless environments
const weekCache = new Map<string, DayExpanded[]>();

// Unique ID generator for server-created sections (workouts)
let sectionIdCounter = 0;
const generateSectionId = (iso: string): string =>
  `sec-${iso}-${Date.now().toString(36)}-${(sectionIdCounter++).toString(36)}`;

// Unique ID generator for server-created exercises
let exerciseIdCounter = 0;
const generateExerciseId = (): string =>
  `e-${Date.now().toString(36)}-${(exerciseIdCounter++).toString(36)}`;

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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    void body; // accept any action for now; persistence can be added later

    // Build combined payload (same shape as GET /api/calendar/all)
    const inputMonday =
      (body &&
        typeof body === "object" &&
        (body as { monday?: string }).monday) ||
      getCurrentMondayIso();
    // Normalize any provided date to the Monday of its week
    const monday = (() => {
      const d = new Date(String(inputMonday));
      if (Number.isNaN(d.getTime())) return getCurrentMondayIso();
      const dow = d.getDay();
      const offset = dow === 0 ? -6 : 1 - dow;
      const m = new Date(d);
      m.setDate(d.getDate() + offset);
      m.setHours(0, 0, 0, 0);
      return m.toISOString().slice(0, 10);
    })();

    const daysRaw = getAllDays();
    // workoutsRaw will be reconstructed from the expanded snapshot below
    const exercisesRaw = getAllExercises();

    // Load from cache if present; else expand from raw
    const freshExpanded = daysRaw.map(expandDay) as DayExpanded[];
    const cachedForWeek = weekCache.get(monday);
    const daysExpanded = cachedForWeek ?? freshExpanded;

    const requestedWeekIsos = makeWeekDatesFromMondayIso(monday);
    const expandedByIso = new Map<string, DayExpanded>(
      daysExpanded.map((d) => [d.date, d])
    );
    const dataIsoSet = new Set<string>(daysExpanded.map((d) => d.date));
    const requestedOverlapsData = requestedWeekIsos.some((iso) =>
      dataIsoSet.has(iso)
    );

    const earliestIso = daysExpanded
      .map((d) => d.date)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0];
    const fallbackMonday = (() => {
      if (!earliestIso) return String(monday);
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

    // Create a mutable snapshot for the effective week to apply the mutation
    const weekExpandedClones = new Map<string, DayExpanded>();
    for (const iso of effectiveWeekIsos) {
      const d = expandedByIso.get(iso);
      if (!d) {
        // ensure target days exist to support moves into empty days
        weekExpandedClones.set(iso, { id: iso, date: iso, workouts: [] });
        continue;
      }
      weekExpandedClones.set(iso, {
        id: d.id,
        date: d.date,
        workouts: (d.workouts || []).map((w) => ({
          id: w.id,
          name: w.name,
          exercises: (w.exercises || []).map((e) => ({
            id: e.id,
            name: e.name,
            setsInfo: e.setsInfo,
            setsCount: e.setsCount,
          })),
        })),
      });
    }

    // Apply mutation to the snapshot when indices reference the current week
    const isObject = (v: unknown): v is Record<string, unknown> =>
      !!v && typeof v === "object";
    const actionType =
      isObject(body) && typeof body.type === "string" ? body.type : undefined;
    if (actionType === "MOVE_EXERCISE" && isObject(body)) {
      const source = body.source as {
        dayIndex: number;
        sectionIndex: number;
        exerciseIndex: number;
      };
      const target = body.target as {
        dayIndex: number;
        sectionIndex: number;
        exerciseIndex?: number;
      };
      if (
        source &&
        target &&
        typeof source.dayIndex === "number" &&
        typeof source.sectionIndex === "number" &&
        typeof source.exerciseIndex === "number" &&
        typeof target.dayIndex === "number" &&
        typeof target.sectionIndex === "number"
      ) {
        const sourceIso = effectiveWeekIsos[source.dayIndex];
        const targetIso = effectiveWeekIsos[target.dayIndex];
        const srcDay = weekExpandedClones.get(sourceIso);
        const tgtDay = weekExpandedClones.get(targetIso);
        if (srcDay && tgtDay) {
          const srcWorkout = srcDay.workouts[source.sectionIndex];
          const tgtWorkout = tgtDay.workouts[target.sectionIndex];
          if (srcWorkout && tgtWorkout) {
            const removed = srcWorkout.exercises.splice(
              source.exerciseIndex,
              1
            )[0];
            if (removed) {
              const insertIndex =
                typeof target.exerciseIndex === "number"
                  ? Math.max(
                      0,
                      Math.min(
                        target.exerciseIndex,
                        tgtWorkout.exercises.length
                      )
                    )
                  : tgtWorkout.exercises.length;
              tgtWorkout.exercises.splice(insertIndex, 0, removed);
            }
          }
        }
      }
    } else if (actionType === "MOVE_SECTION" && isObject(body)) {
      const srcBody = body as {
        sourceDayIndex?: number;
        sourceSectionIndex?: number;
        targetDayIndex?: number;
        targetSectionIndex?: number;
      };
      const sourceDayIndex = srcBody.sourceDayIndex as number;
      const sourceSectionIndex = srcBody.sourceSectionIndex as number;
      const targetDayIndex = srcBody.targetDayIndex as number;
      const targetSectionIndex = srcBody.targetSectionIndex as number;
      if (
        typeof sourceDayIndex === "number" &&
        typeof sourceSectionIndex === "number" &&
        typeof targetDayIndex === "number" &&
        typeof targetSectionIndex === "number"
      ) {
        const sourceIso = effectiveWeekIsos[sourceDayIndex];
        const targetIso = effectiveWeekIsos[targetDayIndex];
        const srcDay = weekExpandedClones.get(sourceIso);
        const tgtDay = weekExpandedClones.get(targetIso);
        if (srcDay && tgtDay) {
          const removed = srcDay.workouts.splice(sourceSectionIndex, 1)[0];
          if (removed) {
            // If the workout id encodes date (sec-<iso>-...), rewrite it to match target day iso
            const idParts = typeof removed.id === "string" ? removed.id.split("-") : [];
            if (idParts.length >= 3 && idParts[0] === "sec") {
              const targetIso = effectiveWeekIsos[targetDayIndex];
              const suffix = idParts.slice(2).join("-");
              removed.id = `sec-${targetIso}-${suffix}`;
            }
            const adjustedIndex = Math.max(
              0,
              Math.min(targetSectionIndex, tgtDay.workouts.length)
            );
            tgtDay.workouts.splice(adjustedIndex, 0, removed);
          }
        }
      }
    } else if (actionType === "DROP_EXERCISE_TO_DAY" && isObject(body)) {
      const srcBody = body as {
        source?: {
          dayIndex: number;
          sectionIndex: number;
          exerciseIndex: number;
        };
        targetDayIndex?: number;
      };
      const source = srcBody.source as {
        dayIndex: number;
        sectionIndex: number;
        exerciseIndex: number;
      };
      const targetDayIndex = srcBody.targetDayIndex as number;
      if (
        source &&
        typeof source.dayIndex === "number" &&
        typeof source.sectionIndex === "number" &&
        typeof source.exerciseIndex === "number" &&
        typeof targetDayIndex === "number"
      ) {
        const sourceIso = effectiveWeekIsos[source.dayIndex];
        const targetIso = effectiveWeekIsos[targetDayIndex];
        const srcDay = weekExpandedClones.get(sourceIso);
        const tgtDay = weekExpandedClones.get(targetIso);
        if (srcDay && tgtDay) {
          const srcWorkout = srcDay.workouts[source.sectionIndex];
          if (srcWorkout) {
            const removed = srcWorkout.exercises.splice(
              source.exerciseIndex,
              1
            )[0];
            if (removed) {
              // Create a new workout on the target day with the single exercise
              const newWorkoutId = generateSectionId(targetIso);
              tgtDay.workouts.push({
                id: newWorkoutId,
                name: "NEW SECTION",
                exercises: [removed],
              });
            }
          }
        }
      }
    } else if (actionType === "CREATE_SECTION" && isObject(body)) {
      const b = body as { title?: string; targetDayIndex?: number; dayIndex?: number; dayIso?: string };
      const title = typeof b.title === "string" && b.title.trim() ? b.title.trim() : "NEW SECTION";
      let dayIdx: number | null = null;
      if (typeof b.dayIndex === "number") dayIdx = b.dayIndex;
      else if (typeof b.targetDayIndex === "number") dayIdx = b.targetDayIndex;
      else if (typeof b.dayIso === "string") {
        const idx = effectiveWeekIsos.findIndex((iso) => iso === b.dayIso);
        dayIdx = idx >= 0 ? idx : null;
      }
      if (dayIdx === null) dayIdx = 0;
      const targetIso = effectiveWeekIsos[dayIdx];
      const tgtDay = weekExpandedClones.get(targetIso);
      if (tgtDay) {
        // Deduplicate: if a just-created empty section with same title exists on that day, skip
        const existsEmptySameTitle = (tgtDay.workouts || []).some(
          (w) => w.name === title && (w.exercises || []).length === 0
        );
        if (!existsEmptySameTitle) {
          tgtDay.workouts.push({ id: generateSectionId(targetIso), name: title, exercises: [] });
        }
      }
    } else if (actionType === "CREATE_EXERCISE" && isObject(body)) {
      const b = body as {
        dayIndex?: number;
        sectionIndex?: number;
        name?: string;
        sets?: string;
        details?: string;
      };
      if (typeof b.dayIndex === "number" && typeof b.sectionIndex === "number") {
        const iso = effectiveWeekIsos[b.dayIndex];
        const day = weekExpandedClones.get(iso);
        const workout = day?.workouts[b.sectionIndex];
        if (workout) {
          const name = (b.name || "Exercise").toString();
          const setsInfo = (b.details || "").toString();
          const setsCountNum = parseInt((b.sets || "1").toString(), 10);
          const setsCount = Number.isFinite(setsCountNum) && setsCountNum > 0 ? setsCountNum : 1;
          workout.exercises.push({
            id: generateExerciseId(),
            name,
            setsInfo,
            setsCount,
          });
        }
      }
    }

    // Reflect modified snapshot back into expandedByIso and persist week cache
    for (const [iso, cloned] of weekExpandedClones.entries()) {
      expandedByIso.set(iso, cloned);
    }
    const mergedExpanded: DayExpanded[] = daysExpanded.map(
      (d) => expandedByIso.get(d.date) ?? d
    );
    weekCache.set(monday, mergedExpanded);

    const uiDaysForWeek = effectiveWeekIsos.map((iso) => {
      const d = expandedByIso.get(iso);
      if (!d) return { date: iso, sections: [] };
      const workouts = (d.workouts ?? []) as WorkoutExpanded[];
      return {
        date: iso,
        sections: workouts.map((w) => ({
          id: `sec-${iso}-${String(w.id ?? "w")}`,
          title: String(w.name ?? "WORKOUT"),
          exercises: (w.exercises ?? []).map((e: ServerExercise) => ({
            id: `ex-${String(w.id ?? "w")}-${String(e.id ?? "e")}`,
            name: String(e.name ?? "Exercise"),
            sets: String((e as ServerExercise).setsCount ?? "1"),
            details: String((e as ServerExercise).setsInfo ?? ""),
          })),
        })),
      };
    });

    // Rebuild raw views from the merged expanded snapshot so clients that rely on raw data also see updates
    const workoutMap = new Map<
      string,
      { id: string; name: string; exerciseIds: string[] }
    >();
    for (const day of mergedExpanded) {
      for (const w of day.workouts) {
        workoutMap.set(w.id, {
          id: w.id,
          name: w.name,
          exerciseIds: (w.exercises || []).map((e) => e.id),
        });
      }
    }
    const newWorkoutsRaw = Array.from(workoutMap.values());

    const mergedByIso = new Map<string, DayExpanded>(
      mergedExpanded.map((d) => [d.date, d])
    );
    const newDaysRaw = getAllDays().map((d) => {
      const exp = mergedByIso.get(d.date);
      if (!exp) return d;
      return {
        ...d,
        workoutIds: (exp.workouts || []).map((w) => w.id),
      };
    });

    return NextResponse.json({
      ok: true,
      monday: String(monday),
      resolvedMonday: effectiveMonday,
      daysRaw: newDaysRaw,
      workoutsRaw: newWorkoutsRaw,
      exercisesRaw, // unchanged catalog
      daysExpanded,
      uiDaysForWeek,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}
