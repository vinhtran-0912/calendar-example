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

function DraggableExercise({
  exercise,
  dayDate,
  sectionId,
  exerciseIndex,
  onOpenEdit,
  onDropOnExercise,
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
  }));

  // This is used to drop the exercise on the section.
  const [, drop] = useDrop<DragItem, { handled: true } | undefined>(() => ({
    accept: [ITEM_TYPES.EXERCISE],
    drop: (item, monitor) => {
      if (monitor.didDrop()) return undefined;
      onDropOnExercise(item, dayDate, sectionId, exerciseIndex);
      return { handled: true };
    },
  }));

  // This is used to set the ref for the drag and drop component.
  const setDragDropRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
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

  const serverPatch = async (body: unknown) => {
    try {
      await fetch("/api/calendar/mutation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error("Failed to PATCH calendar mutation", error);
    }
  };

  useEffect(() => {
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
    setTimeout(() => dispatch({ type: "INIT", days: next }), 0);
  }, []);

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

  const startCreateForDay = (date: Date) => {
    setCreatingDay(date);
    setNewWorkoutTitle("");
  };

  const cancelCreate = () => {
    setCreatingDay(null);
    setNewWorkoutTitle("");
  };

  const saveCreate = (date: Date) => {
    const title = newWorkoutTitle.trim();
    if (!title) return;
    dispatch({ type: "CREATE_SECTION", day: date, title });
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

  const saveCreateExercise = (day: Date, sectionId: string) => {
    const name = newExerciseName.trim();
    if (!name) return;
    dispatch({
      type: "CREATE_EXERCISE",
      day,
      sectionId,
      name,
      sets: newExerciseSetsCount.trim() || "1",
      details: newExerciseSetsInfo.trim(),
    });
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
    dispatch({ type: "MOVE_EXERCISE", source, target });
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

    dispatch({
      type: "MOVE_SECTION",
      sourceDayIndex,
      sourceSectionIndex: item.sourceSectionIndex,
      targetDayIndex,
      targetSectionIndex,
    });
    void serverPatch({
      type: "MOVE_SECTION",
      sourceDayIndex,
      sourceSectionIndex: item.sourceSectionIndex,
      targetDayIndex,
      targetSectionIndex,
    });
  };

  const onSectionDayDrop = (item: SectionDragItem, targetDay: Date) => {
    const sourceDayIndex = getDayIndexByDate(days, item.sourceDay);
    const targetDayIndex = getDayIndexByDate(days, targetDay);
    if (sourceDayIndex === -1 || targetDayIndex === -1) return;
    dispatch({
      type: "MOVE_SECTION",
      sourceDayIndex,
      sourceSectionIndex: item.sourceSectionIndex,
      targetDayIndex,
      targetSectionIndex: days[targetDayIndex].sections.length,
    });
    void serverPatch({
      type: "MOVE_SECTION",
      sourceDayIndex,
      sourceSectionIndex: item.sourceSectionIndex,
      targetDayIndex,
      targetSectionIndex: days[targetDayIndex].sections.length,
    });
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

    dispatch({
      type: "DROP_EXERCISE_TO_DAY",
      source: {
        dayIndex: sourceDayIndex,
        sectionIndex: sourceSectionIndex,
        exerciseIndex: sourceExerciseIndex,
      },
      targetDayIndex,
    });
    void serverPatch({
      type: "DROP_EXERCISE_TO_DAY",
      source: {
        dayIndex: sourceDayIndex,
        sectionIndex: sourceSectionIndex,
        exerciseIndex: sourceExerciseIndex,
      },
      targetDayIndex,
    });
  };

  useHorizontalAutoScrollOnDrag(scrollRef);

  return (
    <div className="min-h-screen bg-white p-6">
      <div
        className="overflow-x-auto w-full flex flex-col justify-center items-center"
        ref={scrollRef}
      >
        <div className="flex gap-4 w-full justify-center items-center">
          {DAY_NAMES.map((dayName, dayIndex) => (
            <div key={dayIndex} className="flex-none min-w-60 text-start">
              <span className="text-xs font-medium text-gray-500">
                {dayName}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 w-full justify-center items-center">
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
                      <DraggableSection
                        key={section.id}
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
                                      <DraggableExercise
                                        exercise={exercise}
                                        dayDate={day.date}
                                        sectionId={section.id}
                                        exerciseIndex={exerciseIndex}
                                        onDropOnExercise={handleExerciseDrop}
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
                                      />
                                    </div>
                                  );
                                }
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
                                        setNewExerciseSetsCount(e.target.value)
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
                                        saveCreateExercise(day.date, section.id)
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
                    ))}

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
