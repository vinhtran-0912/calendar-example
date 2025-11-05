import type { Day, Exercise } from "../../lib/types/calendar";
import {
  appendExerciseToSection,
  getDayIndexByDate,
  insertSectionAt,
  removeExerciseFrom,
  removeSectionFrom,
  insertExerciseToSection,
} from "../../lib/utils/calendar";
// Local unique ID helpers to avoid relying on external generateId
let sectionIdCounter = 0;
let exerciseIdCounter = 0;
const createSectionId = (day: Date): string =>
  `sec-${day.getTime()}-${(sectionIdCounter++).toString(36)}`;
const createExerciseId = (): string =>
  `ex-${Date.now().toString(36)}-${(exerciseIdCounter++).toString(36)}`;

// It uses many useState in conponents, also I changed some logic to use reducer.
export type CalendarAction =
  | { type: "INIT"; days: Day[] }
  | { type: "CREATE_SECTION"; day: Date; title: string }
  | { type: "EDIT_SECTION"; day: Date; sectionId: string; title: string }
  | { type: "DELETE_SECTION"; day: Date; sectionId: string }
  | {
      type: "CREATE_EXERCISE";
      day: Date;
      sectionId: string;
      name: string;
      sets: string;
      details: string;
    }
  | {
      type: "EDIT_EXERCISE";
      day: Date;
      sectionId: string;
      exerciseId: string;
      name: string;
      sets: string;
      details: string;
    }
  | {
      type: "DELETE_EXERCISE";
      day: Date;
      sectionId: string;
      exerciseId: string;
    }
  | {
      type: "MOVE_EXERCISE";
      source: { dayIndex: number; sectionIndex: number; exerciseIndex: number };
      target: {
        dayIndex: number;
        sectionIndex: number;
        exerciseIndex?: number;
      };
    }
  | {
      type: "MOVE_SECTION";
      sourceDayIndex: number;
      sourceSectionIndex: number;
      targetDayIndex: number;
      targetSectionIndex: number;
    }
  | {
      type: "DROP_EXERCISE_TO_DAY";
      source: { dayIndex: number; sectionIndex: number; exerciseIndex: number };
      targetDayIndex: number;
    };

export function calendarReducer(state: Day[], action: CalendarAction): Day[] {
  switch (action.type) {
    case "INIT":
      return action.days;

    case "CREATE_SECTION": {
      const dayIndex = getDayIndexByDate(state, action.day);
      if (dayIndex === -1) return state;
      const section = {
        id: createSectionId(action.day),
        title: action.title,
        exercises: [],
      };
      return state.map((d, idx) =>
        idx === dayIndex ? { ...d, sections: [...d.sections, section] } : d
      );
    }

    case "EDIT_SECTION": {
      const dayIndex = getDayIndexByDate(state, action.day);
      if (dayIndex === -1) return state;
      return state.map((d, dIdx) =>
        dIdx !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.map((s) =>
                s.id !== action.sectionId ? s : { ...s, title: action.title }
              ),
            }
      );
    }

    case "DELETE_SECTION": {
      const dayIndex = getDayIndexByDate(state, action.day);
      if (dayIndex === -1) return state;
      return state.map((d, dIdx) =>
        dIdx !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.filter((s) => s.id !== action.sectionId),
            }
      );
    }

    case "CREATE_EXERCISE": {
      const dayIndex = getDayIndexByDate(state, action.day);
      if (dayIndex === -1) return state;
      const sectionIndex = state[dayIndex].sections.findIndex(
        (s) => s.id === action.sectionId
      );
      if (sectionIndex === -1) return state;
      const exercise: Exercise = {
        id: createExerciseId(),
        name: action.name,
        sets: action.sets || "1",
        details: action.details,
      };
      return state.map((d, dIdx) =>
        dIdx !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.map((s, sIdx) =>
                sIdx !== sectionIndex
                  ? s
                  : { ...s, exercises: [...s.exercises, exercise] }
              ),
            }
      );
    }

    case "EDIT_EXERCISE": {
      const dayIndex = getDayIndexByDate(state, action.day);
      if (dayIndex === -1) return state;
      return state.map((d, dIdx) =>
        dIdx !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.map((s) =>
                s.id !== action.sectionId
                  ? s
                  : {
                      ...s,
                      exercises: s.exercises.map((e) =>
                        e.id !== action.exerciseId
                          ? e
                          : {
                              ...e,
                              name: action.name,
                              sets: action.sets,
                              details: action.details,
                            }
                      ),
                    }
              ),
            }
      );
    }

    case "DELETE_EXERCISE": {
      const dayIndex = getDayIndexByDate(state, action.day);
      if (dayIndex === -1) return state;
      return state.map((d, dIdx) =>
        dIdx !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.map((s) =>
                s.id !== action.sectionId
                  ? s
                  : {
                      ...s,
                      exercises: s.exercises.filter(
                        (e) => e.id !== action.exerciseId
                      ),
                    }
              ),
            }
      );
    }

    case "MOVE_EXERCISE": {
      const { source, target } = action;
      const { updatedDays, removed } = removeExerciseFrom(
        source.dayIndex,
        source.sectionIndex,
        source.exerciseIndex,
        state
      );
      if (typeof target.exerciseIndex === "number") {
        const rawInsertionIndex = target.exerciseIndex;
        const adjustedInsertionIndex =
          source.dayIndex === target.dayIndex &&
          source.sectionIndex === target.sectionIndex &&
          source.exerciseIndex < rawInsertionIndex
            ? rawInsertionIndex - 1
            : rawInsertionIndex;
        return insertExerciseToSection(
          target.dayIndex,
          target.sectionIndex,
          adjustedInsertionIndex,
          removed,
          updatedDays
        );
      }
      return appendExerciseToSection(
        target.dayIndex,
        target.sectionIndex,
        removed,
        updatedDays
      );
    }

    case "MOVE_SECTION": {
      const { sourceDayIndex, sourceSectionIndex } = action;
      const { targetDayIndex } = action;
      const rawTargetSectionIndex = action.targetSectionIndex;

      const { updatedDays, removed } = removeSectionFrom(
        sourceDayIndex,
        sourceSectionIndex,
        state
      );

      const adjustedTargetSectionIndex =
        sourceDayIndex === targetDayIndex &&
        sourceSectionIndex < rawTargetSectionIndex
          ? rawTargetSectionIndex - 1
          : rawTargetSectionIndex;

      return insertSectionAt(
        targetDayIndex,
        adjustedTargetSectionIndex,
        removed,
        updatedDays
      );
    }

    case "DROP_EXERCISE_TO_DAY": {
      const { updatedDays, removed } = removeExerciseFrom(
        action.source.dayIndex,
        action.source.sectionIndex,
        action.source.exerciseIndex,
        state
      );
      const newSectionId = createSectionId(updatedDays[action.targetDayIndex].date);
      return updatedDays.map((d, idx) =>
        idx !== action.targetDayIndex
          ? d
          : {
              ...d,
              sections: [
                ...d.sections,
                {
                  id: newSectionId,
                  title: "NEW SECTION",
                  exercises: [{ ...removed }],
                },
              ],
            }
      );
    }

    default:
      return state;
  }
}
