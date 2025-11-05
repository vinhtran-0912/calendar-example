import days from "@/data/days.json" assert { type: "json" };
import workouts from "@/data/workouts.json" assert { type: "json" };
import exercises from "@/data/exercises.json" assert { type: "json" };
import type { Day, DayExpanded, Exercise, Workout, WorkoutExpanded } from "@/lib/types";

export function getAllDays(): Day[] {
  return days as unknown as Day[];
}

export function getAllWorkouts(): Workout[] {
  return workouts as unknown as Workout[];
}

export function getAllExercises(): Exercise[] {
  return exercises as unknown as Exercise[];
}

export function expandWorkout(workout: Workout): WorkoutExpanded {
  const allExercises = getAllExercises();
  return {
    id: workout.id,
    name: workout.name,
    exercises: workout.exerciseIds.map((id) => allExercises.find((e) => e.id === id)!).filter(Boolean),
  };
}

export function expandDay(day: Day): DayExpanded {
  const allWorkouts = getAllWorkouts();
  return {
    id: day.id,
    date: day.date,
    workouts: day.workoutIds.map((id) => allWorkouts.find((w) => w.id === id)!).filter(Boolean).map(expandWorkout),
  };
}

export function getWeekByMonday(mondayIso: string): DayExpanded[] {
  const ds = getAllDays();
  const start = new Date(mondayIso);
  start.setHours(0, 0, 0, 0);
  const targetIsoSet = new Set(
    Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().slice(0, 10);
    })
  );
  return ds.filter((d) => targetIsoSet.has(d.date)).map(expandDay);
}


