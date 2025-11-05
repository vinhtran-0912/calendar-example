"use client";

import React, { useEffect, useRef, useState, useReducer } from "react";
import { useDrag, useDrop } from "react-dnd";
import type { RefObject } from "react";
import Button from "../components/button";
import Card from "../components/card";
import Modal from "../components/modal";
import type {
  Exercise,
  Section,
  Day,
  DragItem,
  SectionDragItem,
} from "../lib/types/calendar";
import { getCurrentWeek, isSameDay } from "../lib/utils/date";
import { getDayIndexByDate } from "../lib/utils/calendar";
import { calendarReducer } from "../lib/state/calendarReducer";
import { ITEM_TYPES, DAY_NAMES } from "../lib/constants/calendar";
import Image from "next/image";
import { useHorizontalAutoScrollOnDrag } from "../hooks/useHorizontalAutoScrollOnDrag";
import type {
  DayExpanded,
  WorkoutExpanded,
  Exercise as ServerExercise,
} from "@/lib/types";

function DraggableExercise({
  exercise,
  dayDate,
  sectionId,
  exerciseIndex,
  onOpenEdit,
  onDropOnExercise,
  onPreviewHover,
  onDragStart,
  onDragEnd,
}: {
  exercise: Exercise;
  dayDate: Date;
  sectionId: string;
  exerciseIndex: number;
  onOpenEdit: (exercise: Exercise) => void;
  onDropOnExercise: (
    item: DragItem,
    targetDay: Date,
    targetSectionId: string,
    targetExerciseIndex: number
  ) => void;
  onPreviewHover: (args: {
    day: Date;
    sectionId: string;
    index: number;
  }) => void;
  onDragStart: (args: { name: string; sets: string; details: string }) => void;
  onDragEnd: () => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPES.EXERCISE,
    item: {
      exerciseId: exercise.id,
      sourceDay: dayDate,
      sourceSectionId: sectionId,
      sourceExerciseIndex: exerciseIndex,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => onDragEnd(),
  }));

  React.useEffect(() => {
    if (isDragging) {
      onDragStart({
        name: exercise.name,
        sets: exercise.sets,
        details: exercise.details,
      });
    }
    // no cleanup here; end() callback handles drag end
  }, [isDragging, onDragStart, exercise.name, exercise.sets, exercise.details]);

  const nodeRef = React.useRef<HTMLDivElement | null>(null);

  // This is used to drop the exercise on or around another exercise to get index.
  const [, drop] = useDrop<DragItem, { handled: true } | undefined>(() => ({
    accept: [ITEM_TYPES.EXERCISE],
    drop: (item, monitor) => {
      if (monitor.didDrop()) return undefined;
      onDropOnExercise(item, dayDate, sectionId, exerciseIndex);
      return { handled: true };
    },
    hover: (item, monitor) => {
      if (!nodeRef.current) return;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const rect = nodeRef.current.getBoundingClientRect();
      const middleY = rect.top + rect.height / 2;
      const insertIndex =
        clientOffset.y < middleY ? exerciseIndex : exerciseIndex + 1;
      onPreviewHover({ day: dayDate, sectionId, index: insertIndex });
    },
  }));

  // This is used to set the ref for the drag and drop component.
  const setDragDropRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        nodeRef.current = node;
        drag(drop(node));
      }
    },
    [drag, drop]
  );

  return (
    <Card
      ref={setDragDropRef as unknown as RefObject<HTMLDivElement>}
      isDragging={isDragging}
      className="cursor-move flex flex-col items-end"
    >
      <div
        className="mb-1 w-full truncate max-w-48 text-end text-xs font-medium leading-tight text-gray-900 underline-offset-2 cursor-pointer hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onOpenEdit(exercise);
        }}
      >
        {exercise.name}
      </div>
      <div className="flex items-baseline gap-1 text-[11px] leading-tight text-gray-600 justify-between w-full">
        <strong className="text-gray-500">{exercise.sets}x</strong>
        <span className="truncate max-w-40">{exercise.details}</span>
      </div>
    </Card>
  );
}

function DroppableSection({
  section,
  dayDate,
  onDrop,
  onSectionDrop,
  onPreviewHover,
  children,
}: {
  section: Section;
  dayDate: Date;
  onDrop: (item: DragItem, targetDay: Date, targetSectionId: string) => void;
  onSectionDrop: (
    item: SectionDragItem,
    targetDay: Date,
    targetSectionId: string
  ) => void;
  onAddExercise: (day: Date, sectionId: string) => void;
  onPreviewHover: (args: {
    day: Date;
    sectionId: string;
    index: number;
  }) => void;
  children: React.ReactNode;
}) {
  const [{ isOver }, drop] = useDrop<
    DragItem | SectionDragItem,
    { handled: true } | undefined,
    { isOver: boolean }
  >(() => ({
    accept: [ITEM_TYPES.EXERCISE, ITEM_TYPES.WORKOUT],
    drop: (item: DragItem | SectionDragItem, monitor) => {
      if (monitor.didDrop()) return undefined;
      if ("exerciseId" in item) {
        onDrop(item, dayDate, section.id);
      } else {
        onSectionDrop(item, dayDate, section.id);
      }
      return { handled: true };
    },
    hover: (item) => {
      if ("exerciseId" in item) {
        // When hovering over empty space in the section, preview append at end
        onPreviewHover({
          day: dayDate,
          sectionId: section.id,
          index: section.exercises.length,
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  }));

  return (
    <div
      ref={drop as unknown as RefObject<HTMLDivElement>}
      className={`relative flex flex-col gap-2 ${
        isOver ? "bg-blue-100 rounded-md p-1" : ""
      } ${
        section.exercises.length === 0
          ? "min-h-10 rounded-md p-2 border border-dashed border-gray-300 bg-white"
          : ""
      }`}
    >
      {children}
    </div>
  );
}

function DroppableDay({
  day,
  onDrop,
  onSectionDayDrop,
  children,
}: {
  day: Day;
  onDrop: (item: DragItem, targetDay: Date) => void;
  onSectionDayDrop: (item: SectionDragItem, targetDay: Date) => void;
  children: React.ReactNode;
}) {
  const [{ isOver }, drop] = useDrop<
    DragItem | SectionDragItem,
    { handled: true } | undefined,
    { isOver: boolean }
  >(() => ({
    accept: [ITEM_TYPES.EXERCISE, ITEM_TYPES.WORKOUT],
    drop: (item: DragItem | SectionDragItem, monitor) => {
      if (monitor.didDrop()) return undefined; // child already handled
      if ("exerciseId" in item) onDrop(item, day.date);
      else onSectionDayDrop(item, day.date);
      return { handled: true };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop as unknown as RefObject<HTMLDivElement>}
      className={`flex flex-col bg-calendar-bg rounded-lg p-3 min-w-60 h-screen overflow-y-auto ${
        isOver ? "ring-2 ring-blue-400" : ""
      }`}
    >
      {children}
    </div>
  );
}

function DraggableSection({
  section,
  dayDate,
  index,
  children,
}: {
  section: Section;
  dayDate: Date;
  index: number;
  children: React.ReactNode;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPES.WORKOUT,
    item: {
      sectionId: section.id,
      sourceDay: dayDate,
      sourceSectionIndex: index,
    } satisfies SectionDragItem,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag as unknown as RefObject<HTMLDivElement>}
      className={isDragging ? "opacity-50" : undefined}
    >
      {children}
    </div>
  );
}

export default function CalendarPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [days, dispatch] = useReducer(calendarReducer, [] as Day[]);
  const [resolvedMondayIso, setResolvedMondayIso] = useState<string | null>(
    null
  );

  type WeekResponse = { monday?: string; days: DayExpanded[] };

  const mapApiWeekToUiDays = React.useCallback(
    (payload: WeekResponse): Day[] => {
      const apiDays = Array.isArray(payload?.days)
        ? (payload.days as DayExpanded[])
        : ([] as DayExpanded[]);

      const startOfDayIso = (date: Date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
      };

      const weekDates: Date[] = (() => {
        if (typeof payload?.monday === "string") {
          const start = new Date(payload.monday);
          start.setHours(0, 0, 0, 0);
          const arr: Date[] = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            arr.push(d);
          }
          return arr;
        }
        return getCurrentWeek();
      })();

      const byIso = new Map<string, DayExpanded>(
        apiDays.map((d) => [d.date, d])
      );

      return weekDates.map((date) => {
        const iso = startOfDayIso(date);
        const d = byIso.get(iso);
        if (!d) {
          return { date, sections: [] };
        }
        return {
          date,
          sections: Array.isArray(d?.workouts)
            ? (d.workouts as WorkoutExpanded[]).map((w) => ({
                id: String(
                  (w as WorkoutExpanded)?.id ??
                    `sec-${iso}-${Math.random().toString(36).slice(2)}`
                ),
                title: String((w as WorkoutExpanded)?.name ?? "WORKOUT"),
                exercises: Array.isArray((w as WorkoutExpanded)?.exercises)
                  ? ((w as WorkoutExpanded).exercises as ServerExercise[]).map(
                      (e) => ({
                        id: String(
                          e?.id ?? `ex-${Math.random().toString(36).slice(2)}`
                        ),
                        name: String(e?.name ?? "Exercise"),
                        sets: String((e as ServerExercise)?.setsCount ?? "1"),
                        details: String((e as ServerExercise)?.setsInfo ?? ""),
                      })
                    )
                  : [],
              }))
            : [],
        };
      });
    },
    []
  );

  const fetchAndInitWeek = React.useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/all", { method: "GET" });
      if (!res.ok) {
        const errText = await res.text().catch(() => "<no body>");
        throw new Error(
          `GET /api/calendar/all failed: ${res.status} ${res.statusText} - ${errText}`
        );
      }
      let data: unknown;
      try {
        data = await res.json();
      } catch (e) {
        console.error("Failed to parse /api/calendar/all JSON:", e);
        throw e;
      }
      const toDate = (iso: string) => {
        const d = new Date(iso);
        d.setHours(0, 0, 0, 0);
        return d;
      };
      if (
        Array.isArray(
          (
            data as {
              uiDaysForWeek?: Array<{
                date: string;
                sections: Array<{
                  id: string;
                  title: string;
                  exercises: Array<{
                    id: string;
                    name: string;
                    sets: string;
                    details: string;
                  }>;
                }>;
              }>;
            }
          )?.uiDaysForWeek
        )
      ) {
        type UiExercise = {
          id: string;
          name: string;
          sets: string;
          details: string;
        };
        type UiSection = { id: string; title: string; exercises: UiExercise[] };
        type UiDay = { date: string; sections: UiSection[] };
        const uiDaysPayload = (data as { uiDaysForWeek: UiDay[] })
          .uiDaysForWeek;
        const uiDays: Day[] = uiDaysPayload.map((d: UiDay) => ({
          date: typeof d?.date === "string" ? toDate(d.date) : new Date(),
          sections: Array.isArray(d?.sections)
            ? d.sections.map((s: UiSection) => ({
                id: String(
                  s?.id ?? `sec-${Math.random().toString(36).slice(2)}`
                ),
                title: String(s?.title ?? "WORKOUT"),
                exercises: Array.isArray(s?.exercises)
                  ? s.exercises.map((e: UiExercise) => ({
                      id: String(
                        e?.id ?? `ex-${Math.random().toString(36).slice(2)}`
                      ),
                      name: String(e?.name ?? "Exercise"),
                      sets: String(e?.sets ?? "1"),
                      details: String(e?.details ?? ""),
                    }))
                  : [],
              }))
            : [],
        }));
        const respMonday =
          (data as { resolvedMonday?: string; monday?: string })
            .resolvedMonday || (data as { monday?: string }).monday;
        if (typeof respMonday === "string" && respMonday) {
          setResolvedMondayIso(respMonday);
        }
        dispatch({ type: "INIT", days: uiDays });
      } else {
        console.warn(
          "uiDaysForWeek missing from /api/calendar/all; mapping from expanded shape instead"
        );
        const mapped = mapApiWeekToUiDays(
          data as { days: DayExpanded[]; monday?: string }
        );
        const respMonday =
          (data as { resolvedMonday?: string; monday?: string })
            .resolvedMonday || (data as { monday?: string }).monday;
        if (typeof respMonday === "string" && respMonday) {
          setResolvedMondayIso(respMonday);
        }
        dispatch({ type: "INIT", days: mapped });
      }
    } catch (err) {
      // fallback to local mock if API is unavailable
      const weekDates = getCurrentWeek();
      const next = weekDates.map((date, index) => {
        if (index === 1) {
          return {
            date,
            sections: [
              {
                id: `sec-${index}-0`,
                title: "CHEST DAY - WITH ARM DAY",
                exercises: [
                  {
                    id: `ex-${index}-0-0`,
                    name: "Bench Press Med...",
                    sets: "3",
                    details: "50 lb x 5, 60 lb x 5, 70 l...",
                  },
                  {
                    id: `ex-${index}-0-1`,
                    name: "Exercise B",
                    sets: "1",
                    details: "40 lb x 10",
                  },
                ],
              },
            ],
          };
        }
        if (index === 2) {
          return {
            date,
            sections: [
              {
                id: `sec-${index}-0`,
                title: "LEG DAY",
                exercises: [
                  {
                    id: `ex-${index}-0-0`,
                    name: "Exercise C",
                    sets: "1",
                    details: "30 lb x 6",
                  },
                  {
                    id: `ex-${index}-0-1`,
                    name: "Exercise D",
                    sets: "1",
                    details: "40 lb x 5",
                  },
                  {
                    id: `ex-${index}-0-2`,
                    name: "Exercise E",
                    sets: "1",
                    details: "50 lb x 5",
                  },
                ],
              },
              {
                id: `sec-${index}-1`,
                title: "ARM DAY",
                exercises: [
                  {
                    id: `ex-${index}-1-0`,
                    name: "Exercise F",
                    sets: "1",
                    details: "60 lb x 6",
                  },
                ],
              },
            ],
          };
        }
        return { date, sections: [] };
      });
      dispatch({ type: "INIT", days: next });
      console.error("Falling back to mock data due to week API error:", err);
    }
  }, [mapApiWeekToUiDays]);

  const serverPatch = async (body: unknown) => {
    try {
      const res = await fetch("/api/calendar/mutation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(typeof body === "object" && body !== null
            ? (body as Record<string, unknown>)
            : {}),
          monday:
            resolvedMondayIso ??
            (() => {
              const week = getCurrentWeek();
              const d = week[0];
              d.setHours(0, 0, 0, 0);
              return d.toISOString().slice(0, 10);
            })(),
        }),
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = (await res.json()) as unknown;
          if (
            Array.isArray(
              (
                data as {
                  uiDaysForWeek?: Array<{
                    date: string;
                    sections: Array<{
                      id: string;
                      title: string;
                      exercises: Array<{
                        id: string;
                        name: string;
                        sets: string;
                        details: string;
                      }>;
                    }>;
                  }>;
                }
              )?.uiDaysForWeek
            )
          ) {
            type UiExercise = {
              id: string;
              name: string;
              sets: string;
              details: string;
            };
            type UiSection = {
              id: string;
              title: string;
              exercises: UiExercise[];
            };
            type UiDay = { date: string; sections: UiSection[] };
            const toDate = (iso: string) => {
              const d = new Date(iso);
              d.setHours(0, 0, 0, 0);
              return d;
            };
            const uiDaysPayload = (data as { uiDaysForWeek: UiDay[] })
              .uiDaysForWeek;
            const uiDays: Day[] = uiDaysPayload.map((d: UiDay) => ({
              date: typeof d?.date === "string" ? toDate(d.date) : new Date(),
              sections: Array.isArray(d?.sections)
                ? d.sections.map((s: UiSection) => ({
                    id: String(
                      s?.id ?? `sec-${Math.random().toString(36).slice(2)}`
                    ),
                    title: String(s?.title ?? "WORKOUT"),
                    exercises: Array.isArray(s?.exercises)
                      ? s.exercises.map((e: UiExercise) => ({
                          id: String(
                            e?.id ?? `ex-${Math.random().toString(36).slice(2)}`
                          ),
                          name: String(e?.name ?? "Exercise"),
                          sets: String(e?.sets ?? "1"),
                          details: String(e?.details ?? ""),
                        }))
                      : [],
                  }))
                : [],
            }));
            const respMonday =
              (data as { resolvedMonday?: string; monday?: string })
                .resolvedMonday || (data as { monday?: string }).monday;
            if (typeof respMonday === "string" && respMonday) {
              setResolvedMondayIso(respMonday);
            }
            dispatch({ type: "INIT", days: uiDays });
            return;
          }
        }
      }
      await fetchAndInitWeek();
    } catch (error) {
      console.error("Failed to PATCH calendar mutation", error);
    }
  };

  useEffect(() => {
    void fetchAndInitWeek();
  }, [fetchAndInitWeek]);

  const [creatingDay, setCreatingDay] = useState<Date | null>(null);
  const [newWorkoutTitle, setNewWorkoutTitle] = useState<string>("");
  const [creatingExerciseFor, setCreatingExerciseFor] = useState<{
    day: Date;
    sectionId: string;
  } | null>(null);
  const [newExerciseName, setNewExerciseName] = useState<string>("");
  const [newExerciseSetsInfo, setNewExerciseSetsInfo] = useState<string>("");
  const [newExerciseSetsCount, setNewExerciseSetsCount] = useState<string>("1");
  const [sectionTitleInput, setSectionTitleInput] = useState<string>("");
  const [editExerciseName, setEditExerciseName] = useState<string>("");
  const [editExerciseSets, setEditExerciseSets] = useState<string>("");
  const [editExerciseDetails, setEditExerciseDetails] = useState<string>("");
  const [sectionModal, setSectionModal] = useState<{
    open: boolean;
    day?: Date;
    sectionId?: string;
  }>({ open: false });
  const [exerciseModal, setExerciseModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    day?: Date;
    sectionId?: string;
    exerciseId?: string;
  }>({ open: false, mode: "create" });
  const [isSectionActionLoading, setIsSectionActionLoading] = useState(false);
  const [isExerciseActionLoading, setIsExerciseActionLoading] = useState(false);

  // Preview states
  const [exercisePreview, setExercisePreview] = useState<{
    day: Date;
    sectionId: string;
    index: number;
  } | null>(null);
  const [sectionPreview, setSectionPreview] = useState<{
    day: Date;
    index: number;
  } | null>(null);
  const [draggingExerciseData, setDraggingExerciseData] = useState<{
    name: string;
    sets: string;
    details: string;
  } | null>(null);

  // Stable setters to avoid unnecessary state updates during hover
  const updateExercisePreview = React.useCallback(
    (next: { day: Date; sectionId: string; index: number }) => {
      setExercisePreview((prev) => {
        if (
          !prev ||
          prev.day.getTime() !== next.day.getTime() ||
          prev.sectionId !== next.sectionId ||
          prev.index !== next.index
        ) {
          return next;
        }
        return prev;
      });
    },
    []
  );

  const updateSectionPreview = React.useCallback(
    (next: { day: Date; index: number }) => {
      setSectionPreview((prev) => {
        if (
          !prev ||
          !isSameDay(prev.day, next.day) ||
          prev.index !== next.index
        ) {
          return next;
        }
        return prev;
      });
    },
    []
  );

  const handleExerciseDragStart = React.useCallback(
    (data: { name: string; sets: string; details: string }) => {
      setDraggingExerciseData(data);
    },
    []
  );

  const startCreateForDay = (date: Date) => {
    setCreatingDay(date);
    setNewWorkoutTitle("");
  };

  const cancelCreate = () => {
    setCreatingDay(null);
    setNewWorkoutTitle("");
  };

  const saveCreate = async (date: Date) => {
    const title = newWorkoutTitle.trim();
    if (!title) return;
    const dayIndex = getDayIndexByDate(days, date);
    if (dayIndex !== -1) {
      await serverPatch({ type: "CREATE_SECTION", title, dayIndex });
    }
    setCreatingDay(null);
    setNewWorkoutTitle("");
  };
  const cancelEditSection = () => {
    setSectionTitleInput("");
  };

  const saveEditSection = (day: Date, sectionId: string) => {
    const title = sectionTitleInput.trim();
    if (!title) return;
    dispatch({ type: "EDIT_SECTION", day, sectionId, title });
    cancelEditSection();
  };

  const deleteSection = (day: Date, sectionId: string) => {
    dispatch({ type: "DELETE_SECTION", day, sectionId });
    cancelEditSection();
  };

  const cancelCreateExercise = () => {
    setCreatingExerciseFor(null);
  };

  const saveCreateExercise = async (day: Date, sectionId: string) => {
    const name = newExerciseName.trim();
    if (!name) return;
    const dayIndex = getDayIndexByDate(days, day);
    if (dayIndex !== -1) {
      const sectionIndex = days[dayIndex].sections.findIndex((s) => s.id === sectionId);
      if (sectionIndex !== -1) {
        await serverPatch({
          type: "CREATE_EXERCISE",
          dayIndex,
          sectionIndex,
          name,
          sets: newExerciseSetsCount.trim() || "1",
          details: newExerciseSetsInfo.trim(),
        });
      }
    }
    setCreatingExerciseFor(null);
  };

  const saveEditExercise = (
    day: Date,
    sectionId: string,
    exerciseId: string
  ) => {
    dispatch({
      type: "EDIT_EXERCISE",
      day,
      sectionId,
      exerciseId,
      name: editExerciseName,
      sets: editExerciseSets,
      details: editExerciseDetails,
    });
  };

  const deleteExercise = (day: Date, sectionId: string, exerciseId: string) => {
    dispatch({ type: "DELETE_EXERCISE", day, sectionId, exerciseId });
  };

  const moveExerciseToSection = (
    source: { dayIndex: number; sectionIndex: number; exerciseIndex: number },
    target: { dayIndex: number; sectionIndex: number; exerciseIndex?: number }
  ) => {
    void serverPatch({ type: "MOVE_EXERCISE", source, target });
  };

  const onSectionDrop = (
    item: SectionDragItem,
    targetDay: Date,
    targetSectionId: string
  ) => {
    const sourceDayIndex = getDayIndexByDate(days, item.sourceDay);
    const targetDayIndex = getDayIndexByDate(days, targetDay);
    if (sourceDayIndex === -1 || targetDayIndex === -1) return;
    const targetSectionIndex = days[targetDayIndex].sections.findIndex(
      (s) => s.id === targetSectionId
    );
    if (targetSectionIndex === -1) return;

    void serverPatch({
      type: "MOVE_SECTION",
      sourceDayIndex,
      sourceSectionIndex: item.sourceSectionIndex,
      targetDayIndex,
      targetSectionIndex,
    });
    setSectionPreview(null);
  };

  const onSectionDayDrop = (item: SectionDragItem, targetDay: Date) => {
    const sourceDayIndex = getDayIndexByDate(days, item.sourceDay);
    const targetDayIndex = getDayIndexByDate(days, targetDay);
    if (sourceDayIndex === -1 || targetDayIndex === -1) return;
    void serverPatch({
      type: "MOVE_SECTION",
      sourceDayIndex,
      sourceSectionIndex: item.sourceSectionIndex,
      targetDayIndex,
      targetSectionIndex: days[targetDayIndex].sections.length,
    });
    setSectionPreview(null);
  };

  const handleDrop = (
    item: DragItem,
    targetDay: Date,
    targetSectionId: string
  ) => {
    const sourceDayIndex = getDayIndexByDate(days, item.sourceDay);
    if (sourceDayIndex === -1) return;
    const sourceSectionIndex = days[sourceDayIndex].sections.findIndex(
      (s) => s.id === item.sourceSectionId
    );
    if (sourceSectionIndex === -1) return;
    const sourceExerciseIndex = item.sourceExerciseIndex;

    const targetDayIndex = getDayIndexByDate(days, targetDay);
    if (targetDayIndex === -1) return;

    const targetSectionIndex = days[targetDayIndex].sections.findIndex(
      (s) => s.id === targetSectionId
    );
    if (targetSectionIndex === -1) return;

    moveExerciseToSection(
      {
        dayIndex: sourceDayIndex,
        sectionIndex: sourceSectionIndex,
        exerciseIndex: sourceExerciseIndex,
      },
      { dayIndex: targetDayIndex, sectionIndex: targetSectionIndex }
    );
    setExercisePreview(null);
  };

  const handleExerciseDrop = (
    item: DragItem,
    targetDay: Date,
    targetSectionId: string,
    targetExerciseIndex: number
  ) => {
    const sourceDayIndex = getDayIndexByDate(days, item.sourceDay);
    if (sourceDayIndex === -1) return;
    const sourceSectionIndex = days[sourceDayIndex].sections.findIndex(
      (s) => s.id === item.sourceSectionId
    );
    if (sourceSectionIndex === -1) return;
    const sourceExerciseIndex = item.sourceExerciseIndex;

    const targetDayIndex = getDayIndexByDate(days, targetDay);
    if (targetDayIndex === -1) return;
    const targetSectionIndex = days[targetDayIndex].sections.findIndex(
      (s) => s.id === targetSectionId
    );
    if (targetSectionIndex === -1) return;
    moveExerciseToSection(
      {
        dayIndex: sourceDayIndex,
        sectionIndex: sourceSectionIndex,
        exerciseIndex: sourceExerciseIndex,
      },
      {
        dayIndex: targetDayIndex,
        sectionIndex: targetSectionIndex,
        exerciseIndex: targetExerciseIndex,
      }
    );
    setExercisePreview(null);
  };

  const handleDayDrop = (item: DragItem, targetDay: Date) => {
    const targetDayIndex = getDayIndexByDate(days, targetDay);
    if (targetDayIndex === -1) return;

    const sourceDayIndex = getDayIndexByDate(days, item.sourceDay);
    if (sourceDayIndex === -1) return;
    const sourceSectionIndex = days[sourceDayIndex].sections.findIndex(
      (s) => s.id === item.sourceSectionId
    );
    if (sourceSectionIndex === -1) return;
    const sourceExerciseIndex = item.sourceExerciseIndex;

    void serverPatch({
      type: "DROP_EXERCISE_TO_DAY",
      source: {
        dayIndex: sourceDayIndex,
        sectionIndex: sourceSectionIndex,
        exerciseIndex: sourceExerciseIndex,
      },
      targetDayIndex,
    });
    setExercisePreview(null);
  };

  // Section insertion indicator component
  function SectionInsertionIndicator({
    dayDate,
    index,
  }: {
    dayDate: Date;
    index: number;
  }) {
    const [, drop] = useDrop<SectionDragItem, { handled: true } | undefined>(
      () => ({
        accept: [ITEM_TYPES.WORKOUT],
        hover: () => {
          updateSectionPreview({ day: dayDate, index });
        },
        drop: (item, monitor) => {
          if (monitor.didDrop()) return undefined;
          const sourceDayIndex = getDayIndexByDate(days, item.sourceDay);
          const targetDayIndex = getDayIndexByDate(days, dayDate);
          if (sourceDayIndex === -1 || targetDayIndex === -1)
            return { handled: true };
          dispatch({
            type: "MOVE_SECTION",
            sourceDayIndex,
            sourceSectionIndex: item.sourceSectionIndex,
            targetDayIndex,
            targetSectionIndex: index,
          });
          void serverPatch({
            type: "MOVE_SECTION",
            sourceDayIndex,
            sourceSectionIndex: item.sourceSectionIndex,
            targetDayIndex,
            targetSectionIndex: index,
          });
          setSectionPreview(null);
          return { handled: true };
        },
      })
    );
    const isActive =
      !!sectionPreview &&
      isSameDay(sectionPreview.day, dayDate) &&
      sectionPreview.index === index;
    return (
      <div
        ref={drop as unknown as RefObject<HTMLDivElement>}
        className="relative my-1 h-2"
      >
        {isActive && (
          <div className="pointer-events-none absolute -top-2 left-0 right-0">
            <div className="group flex flex-col gap-2.5 border border-dashed border-gray-300 rounded-md py-2.5 px-1 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold leading-tight text-gray-700 uppercase truncate max-w-36">
                  Drop section here
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-6 bg-gray-100 rounded" />
                <div className="h-6 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  useHorizontalAutoScrollOnDrag(scrollRef);

  return (
    <div className="min-h-screen bg-white p-6">
      <div
        className="overflow-x-auto w-full flex flex-col justify-center items-center"
        ref={scrollRef}
      >
        <div className="flex gap-4 w-full">
          {DAY_NAMES.map((dayName, dayIndex) => (
            <div key={dayIndex} className="flex-none min-w-60 text-start">
              <span className="text-xs font-medium text-gray-500">
                {dayName}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 w-full">
          {days.map((day) => {
            const isToday = isSameDay(day.date, today);
            const dateString = String(day.date.getDate()).padStart(2, "0");

            return (
              <div key={day.date.getTime()} className="flex-none min-w-60">
                <DroppableDay
                  day={day}
                  onDrop={handleDayDrop}
                  onSectionDayDrop={onSectionDayDrop}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isToday ? "font-bold text-purple-600" : "text-gray-500"
                      }`}
                    >
                      {dateString}
                    </span>
                    {
                      <Button
                        variant="icon-small"
                        className="bg-gray-500 hover:border-none hover:animate-pulse"
                        childrenClassName="text-white text-md"
                        onClick={() => startCreateForDay(day.date)}
                      >
                        <Image
                          src="/plus.svg"
                          alt="Add workout"
                          width={11}
                          height={11}
                        />
                      </Button>
                    }
                  </div>

                  <div className="flex flex-1 flex-col gap-4">
                    {day.sections?.map((section, sectionIndex) => (
                      <React.Fragment key={section.id}>
                        <SectionInsertionIndicator
                          dayDate={day.date}
                          index={sectionIndex}
                        />
                        <DraggableSection
                          section={section}
                          dayDate={day.date}
                          index={sectionIndex}
                        >
                          <div className="group flex flex-col gap-2.5 border border-gray-200 rounded-md py-2.5 px-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-semibold leading-tight text-purple-600 uppercase truncate max-w-36">
                                {section.title}
                              </h3>
                              <div className="relative">
                                <Button
                                  variant="unstyled"
                                  className="text-purple-600 hover:text-purple-700 hover:animate-pulse"
                                  onClick={() => {
                                    setSectionTitleInput(section.title);
                                    setSectionModal({
                                      open: true,
                                      day: day.date,
                                      sectionId: section.id,
                                    });
                                  }}
                                >
                                  <Image
                                    src="/ellipsis.svg"
                                    alt="More options"
                                    width={11}
                                    height={3}
                                  />
                                </Button>
                              </div>
                            </div>

                            <DroppableSection
                              section={section}
                              dayDate={day.date}
                              onDrop={handleDrop}
                              onSectionDrop={onSectionDrop}
                              onPreviewHover={({ day, sectionId, index }) =>
                                updateExercisePreview({ day, sectionId, index })
                              }
                              onAddExercise={(d, sId) => {
                                setNewExerciseName("");
                                setNewExerciseSetsInfo("");
                                setNewExerciseSetsCount("1");
                                setExerciseModal({
                                  open: true,
                                  mode: "create",
                                  day: d,
                                  sectionId: sId,
                                });
                              }}
                            >
                              <div className="flex flex-col gap-2">
                                {section.exercises?.map(
                                  (exercise, exerciseIndex) => {
                                    if (!exercise?.id) return null;
                                    return (
                                      <div
                                        key={`${section.id}-${exercise.id}-${exerciseIndex}`}
                                        className="relative"
                                      >
                                        {/* Exercise insertion preview before this item */}
                                        {exercisePreview &&
                                          isSameDay(
                                            exercisePreview.day,
                                            day.date
                                          ) &&
                                          exercisePreview.sectionId ===
                                            section.id &&
                                          exercisePreview.index ===
                                            exerciseIndex && (
                                            <Card
                                              isDragging
                                              className="cursor-move flex flex-col items-end my-1"
                                            >
                                              <div className="mb-1 w-full truncate max-w-48 text-end text-xs font-medium leading-tight text-gray-900">
                                                {draggingExerciseData?.name ??
                                                  ""}
                                              </div>
                                              <div className="flex items-baseline gap-1 text-[11px] leading-tight text-gray-600 justify-between w-full">
                                                <strong className="text-gray-500">
                                                  {draggingExerciseData?.sets ??
                                                    ""}
                                                  x
                                                </strong>
                                                <span className="truncate max-w-40">
                                                  {draggingExerciseData?.details ??
                                                    ""}
                                                </span>
                                              </div>
                                            </Card>
                                          )}
                                        <DraggableExercise
                                          exercise={exercise}
                                          dayDate={day.date}
                                          sectionId={section.id}
                                          exerciseIndex={exerciseIndex}
                                          onDropOnExercise={handleExerciseDrop}
                                          onDragStart={handleExerciseDragStart}
                                          onPreviewHover={updateExercisePreview}
                                          onOpenEdit={(ex) => {
                                            setEditExerciseName(ex.name);
                                            setEditExerciseSets(ex.sets);
                                            setEditExerciseDetails(ex.details);
                                            setExerciseModal({
                                              open: true,
                                              mode: "edit",
                                              day: day.date,
                                              sectionId: section.id,
                                              exerciseId: ex.id,
                                            });
                                          }}
                                          onDragEnd={() => {
                                            setExercisePreview(null);
                                            setDraggingExerciseData(null);
                                          }}
                                        />
                                      </div>
                                    );
                                  }
                                )}
                                {/* Exercise insertion preview at end */}
                                {exercisePreview &&
                                  isSameDay(exercisePreview.day, day.date) &&
                                  exercisePreview.sectionId === section.id &&
                                  exercisePreview.index ===
                                    section.exercises.length && (
                                    <Card
                                      isDragging
                                      className="cursor-move flex flex-col items-end my-1"
                                    >
                                      <div className="mb-1 w-full truncate max-w-48 text-end text-xs font-medium leading-tight text-gray-900">
                                        {draggingExerciseData?.name ?? ""}
                                      </div>
                                      <div className="flex items-baseline gap-1 text-[11px] leading-tight text-gray-600 justify-between w-full">
                                        <strong className="text-gray-500">
                                          {draggingExerciseData?.sets ?? ""}x
                                        </strong>
                                        <span className="truncate max-w-40">
                                          {draggingExerciseData?.details ?? ""}
                                        </span>
                                      </div>
                                    </Card>
                                  )}
                                <div className="flex justify-end pt-1">
                                  <Button
                                    variant="icon-small"
                                    className="bg-gray-500 hover:border-none hover:animate-pulse"
                                    childrenClassName="text-white text-md"
                                    onClick={() => {
                                      setNewExerciseName("");
                                      setNewExerciseSetsInfo("");
                                      setNewExerciseSetsCount("1");
                                      setExerciseModal({
                                        open: true,
                                        mode: "create",
                                        day: day.date,
                                        sectionId: section.id,
                                      });
                                    }}
                                  >
                                    <Image
                                      src="/plus.svg"
                                      alt="Add exercise"
                                      width={11}
                                      height={11}
                                    />
                                  </Button>
                                </div>
                              </div>
                            </DroppableSection>

                            {creatingExerciseFor &&
                              isSameDay(creatingExerciseFor.day, day.date) &&
                              creatingExerciseFor.sectionId === section.id && (
                                <div className="rounded-md border border-gray-200 bg-white p-2">
                                  <div className="flex flex-col gap-2">
                                    <input
                                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                                      placeholder="Exercise name"
                                      value={newExerciseName}
                                      onChange={(e) =>
                                        setNewExerciseName(e.target.value)
                                      }
                                    />
                                    <div className="flex items-center gap-2">
                                      <input
                                        className="w-14 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                                        placeholder="3"
                                        value={newExerciseSetsCount}
                                        onChange={(e) =>
                                          setNewExerciseSetsCount(
                                            e.target.value
                                          )
                                        }
                                      />
                                      <span className="text-xs text-gray-500">
                                        x
                                      </span>
                                      <input
                                        className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                                        placeholder="50 lb x 5, 60 lb x 5, 70 lb x 5"
                                        value={newExerciseSetsInfo}
                                        onChange={(e) =>
                                          setNewExerciseSetsInfo(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            saveCreateExercise(
                                              day.date,
                                              section.id
                                            );
                                          if (e.key === "Escape")
                                            cancelCreateExercise();
                                        }}
                                      />
                                      <Button
                                        variant="icon-small"
                                        onClick={() =>
                                          saveCreateExercise(
                                            day.date,
                                            section.id
                                          )
                                        }
                                      >
                                        ✓
                                      </Button>
                                      <Button
                                        variant="icon-small"
                                        onClick={cancelCreateExercise}
                                      >
                                        ✕
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                          </div>
                        </DraggableSection>
                      </React.Fragment>
                    ))}

                    {/* Section insertion preview at end of day */}
                    <SectionInsertionIndicator
                      dayDate={day.date}
                      index={day.sections.length}
                    />

                    {creatingDay && isSameDay(creatingDay, day.date) && (
                      <div className="rounded-md border border-gray-200 bg-white p-2">
                        <div className="flex items-center gap-2 flex-col">
                          <input
                            className="w-full h-10 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                            placeholder="New workout name"
                            value={newWorkoutTitle}
                            onChange={(e) => setNewWorkoutTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveCreate(day.date);
                              if (e.key === "Escape") cancelCreate();
                            }}
                          />
                          <div className="flex items-center gap-1 justify-end w-full">
                            <Button
                              variant="icon-small"
                              onClick={() => saveCreate(day.date)}
                            >
                              ✓
                            </Button>
                            <Button variant="icon-small" onClick={cancelCreate}>
                              ✕
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </DroppableDay>
              </div>
            );
          })}
        </div>
        {/* Section Modal */}
        <Modal
          open={sectionModal.open}
          onClose={() => setSectionModal({ open: false })}
          title="Edit workout"
          actions={
            <>
              <Button
                variant="primary"
                loading={isSectionActionLoading}
                onClick={() => {
                  if (isSectionActionLoading) return;
                  setIsSectionActionLoading(true);
                  if (sectionModal.day && sectionModal.sectionId) {
                    saveEditSection(sectionModal.day, sectionModal.sectionId);
                  }
                  setSectionModal({ open: false });
                  setIsSectionActionLoading(false);
                }}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                loading={isSectionActionLoading}
                onClick={() => {
                  if (isSectionActionLoading) return;
                  setIsSectionActionLoading(true);
                  if (sectionModal.day && sectionModal.sectionId) {
                    deleteSection(sectionModal.day, sectionModal.sectionId);
                  }
                  setSectionModal({ open: false });
                  setIsSectionActionLoading(false);
                }}
              >
                Delete
              </Button>
              <Button onClick={() => setSectionModal({ open: false })}>
                Cancel
              </Button>
            </>
          }
        >
          <input
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
            value={sectionTitleInput}
            onChange={(e) => setSectionTitleInput(e.target.value)}
          />
        </Modal>

        {/* Exercise Modal */}
        <Modal
          open={exerciseModal.open}
          onClose={() => setExerciseModal({ open: false, mode: "create" })}
          title={
            exerciseModal.mode === "create" ? "Add exercise" : "Edit exercise"
          }
          actions={
            <>
              {exerciseModal.mode === "create" ? (
                <Button
                  variant="primary"
                  loading={isExerciseActionLoading}
                  onClick={() => {
                    if (isExerciseActionLoading) return;
                    setIsExerciseActionLoading(true);
                    if (exerciseModal.day && exerciseModal.sectionId) {
                      saveCreateExercise(
                        exerciseModal.day,
                        exerciseModal.sectionId
                      );
                      setExerciseModal({ open: false, mode: "create" });
                    }
                    setIsExerciseActionLoading(false);
                  }}
                >
                  Save
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    loading={isExerciseActionLoading}
                    onClick={() => {
                      if (isExerciseActionLoading) return;
                      setIsExerciseActionLoading(true);
                      if (
                        exerciseModal.day &&
                        exerciseModal.sectionId &&
                        exerciseModal.exerciseId
                      ) {
                        saveEditExercise(
                          exerciseModal.day,
                          exerciseModal.sectionId,
                          exerciseModal.exerciseId
                        );
                        setExerciseModal({ open: false, mode: "create" });
                      }
                      setIsExerciseActionLoading(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    loading={isExerciseActionLoading}
                    onClick={() => {
                      if (isExerciseActionLoading) return;
                      setIsExerciseActionLoading(true);
                      if (
                        exerciseModal.day &&
                        exerciseModal.sectionId &&
                        exerciseModal.exerciseId
                      ) {
                        deleteExercise(
                          exerciseModal.day,
                          exerciseModal.sectionId,
                          exerciseModal.exerciseId
                        );
                        setExerciseModal({ open: false, mode: "create" });
                      }
                      setIsExerciseActionLoading(false);
                    }}
                  >
                    Delete
                  </Button>
                </>
              )}
              <Button
                onClick={() =>
                  setExerciseModal({ open: false, mode: "create" })
                }
              >
                Cancel
              </Button>
            </>
          }
        >
          {exerciseModal.mode === "create" ? (
            <>
              <input
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                placeholder="Exercise name"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                  placeholder="3"
                  value={newExerciseSetsCount}
                  onChange={(e) => setNewExerciseSetsCount(e.target.value)}
                />
                <span className="text-xs text-gray-500">x</span>
                <input
                  className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                  placeholder="50 lb x 5, 60 lb x 5, 70 lb x 5"
                  value={newExerciseSetsInfo}
                  onChange={(e) => setNewExerciseSetsInfo(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <input
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                value={editExerciseName}
                onChange={(e) => setEditExerciseName(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                  value={editExerciseSets}
                  onChange={(e) => setEditExerciseSets(e.target.value)}
                />
                <span className="text-xs text-gray-500">x</span>
                <input
                  className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                  value={editExerciseDetails}
                  onChange={(e) => setEditExerciseDetails(e.target.value)}
                />
              </div>
            </>
          )}
        </Modal>
      </div>
    </div>
  );
}
