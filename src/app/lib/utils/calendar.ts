import type { Day, Exercise, Section } from "../types/calendar";
import { isSameDay } from "./date";

export const getDayIndexByDate = (days: Day[], date: Date): number =>
  days.findIndex((d) => isSameDay(d.date, date));

export const removeExerciseFrom = (
  sourceDayIndex: number,
  sourceSectionIndex: number,
  sourceExerciseIndex: number,
  state: Day[]
): { updatedDays: Day[]; removed: Exercise } => {
  const removed =
    state[sourceDayIndex].sections[sourceSectionIndex].exercises[
      sourceExerciseIndex
    ];

  const updatedDays = state.map((day, dIdx) => {
    if (dIdx !== sourceDayIndex) return day;
    return {
      ...day,
      sections: day.sections.map((section, sIdx) => {
        if (sIdx !== sourceSectionIndex) return section;
        return {
          ...section,
          exercises: section.exercises.filter(
            (_, eIdx) => eIdx !== sourceExerciseIndex
          ),
        };
      }),
    };
  });

  return { updatedDays, removed };
};

export const appendExerciseToSection = (
  targetDayIndex: number,
  targetSectionIndex: number,
  exercise: Exercise,
  state: Day[]
): Day[] => {
  return state.map((day, dIdx) => {
    if (dIdx !== targetDayIndex) return day;
    return {
      ...day,
      sections: day.sections.map((section, sIdx) => {
        if (sIdx !== targetSectionIndex) return section;
        return {
          ...section,
          exercises: [...section.exercises, { ...exercise }],
        };
      }),
    };
  });
};

export const insertExerciseToSection = (
  targetDayIndex: number,
  targetSectionIndex: number,
  targetExerciseIndex: number,
  exercise: Exercise,
  state: Day[]
): Day[] => {
  return state.map((day, dIdx) => {
    if (dIdx !== targetDayIndex) return day;
    return {
      ...day,
      sections: day.sections.map((section, sIdx) => {
        if (sIdx !== targetSectionIndex) return section;
        const next = [...section.exercises];
        const clampedIndex = Math.max(0, Math.min(targetExerciseIndex, next.length));
        next.splice(clampedIndex, 0, { ...exercise });
        return { ...section, exercises: next };
      }),
    };
  });
};

export const removeSectionFrom = (
  sourceDayIndex: number,
  sourceSectionIndex: number,
  state: Day[]
): { updatedDays: Day[]; removed: Section } => {
  const removed = state[sourceDayIndex].sections[sourceSectionIndex];
  const updatedDays = state.map((d, idx) =>
    idx !== sourceDayIndex
      ? d
      : {
          ...d,
          sections: d.sections.filter((_, i) => i !== sourceSectionIndex),
        }
  );
  return { updatedDays, removed };
};

export const insertSectionAt = (
  targetDayIndex: number,
  targetSectionIndex: number,
  section: Section,
  state: Day[]
): Day[] => {
  return state.map((d, idx) => {
    if (idx !== targetDayIndex) return d;
    const nextSections = [...d.sections];
    nextSections.splice(targetSectionIndex, 0, { ...section });
    return { ...d, sections: nextSections };
  });
};

export const findExercise = (
  days: Day[],
  dayDate: Date,
  sectionId: string,
  exerciseId: string
) => {
  const dayIndex = days.findIndex((d) => isSameDay(d.date, dayDate));
  if (dayIndex === -1) return null;

  const sectionIndex = days[dayIndex].sections.findIndex(
    (s) => s.id === sectionId
  );
  if (sectionIndex === -1) return null;

  const exerciseIndex = days[dayIndex].sections[
    sectionIndex
  ].exercises.findIndex((e) => e.id === exerciseId);
  if (exerciseIndex === -1) return null;

  return {
    exercise: days[dayIndex].sections[sectionIndex].exercises[exerciseIndex],
    dayIndex,
    sectionIndex,
    exerciseIndex,
  };
};

export const findExerciseAnywhere = (
  days: Day[],
  exerciseId: string
) => {
  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const sections = days[dayIndex].sections;
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const exercises = sections[sectionIndex].exercises;
      const exerciseIndex = exercises.findIndex((e) => e.id === exerciseId);
      if (exerciseIndex !== -1) {
        return {
          exercise: exercises[exerciseIndex],
          dayIndex,
          sectionIndex,
          exerciseIndex,
        };
      }
    }
  }
  return null;
};
