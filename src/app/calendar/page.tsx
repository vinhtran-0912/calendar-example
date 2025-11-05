"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  getDayIndexByDate,
  removeExerciseFrom,
  appendExerciseToSection,
  removeSectionFrom,
  insertSectionAt,
  findExercise,
} from "../lib/utils/calendar";
import { ITEM_TYPES, DAY_NAMES } from "../lib/constants/calendar";
import Image from "next/image";

function DraggableExercise({
  exercise,
  dayDate,
  sectionId,
  exerciseIndex,
  onOpenEdit,
}: {
  exercise: Exercise;
  dayDate: Date;
  sectionId: string;
  exerciseIndex: number;
  onOpenEdit: (exercise: Exercise) => void;
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

  return (
    <Card
      ref={drag as unknown as RefObject<HTMLDivElement>}
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
  onAddExercise,
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
    void,
    { isOver: boolean }
  >(() => ({
    accept: [ITEM_TYPES.EXERCISE, ITEM_TYPES.WORKOUT],
    drop: (item: DragItem | SectionDragItem) => {
      if ("exerciseId" in item) {
        onDrop(item, dayDate, section.id);
      } else {
        onSectionDrop(item, dayDate, section.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
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
    void,
    { isOver: boolean }
  >(() => ({
    accept: [ITEM_TYPES.EXERCISE, ITEM_TYPES.WORKOUT],
    drop: (item: DragItem | SectionDragItem) => {
      if ("exerciseId" in item) onDrop(item, day.date);
      else onSectionDayDrop(item, day.date);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop as unknown as RefObject<HTMLDivElement>}
      className={`flex flex-col bg-calendar-bg rounded-lg p-3 min-w-60 min-h-[600px] ${
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

  const [days, setDays] = useState<Day[]>(() => {
    const weekDates = getCurrentWeek();
    return weekDates.map((date, index) => {
      if (index === 1) {
        return {
          date,
          sections: [
            {
              id: "1",
              title: "CHEST DAY - WITH ARM DAY",
              exercises: [
                {
                  id: "1",
                  name: "Bench Press Med...",
                  sets: "3",
                  details: "50 lb x 5, 60 lb x 5, 70 l...",
                },
                {
                  id: "2",
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
              id: "2",
              title: "LEG DAY",
              exercises: [
                {
                  id: "3",
                  name: "Exercise C",
                  sets: "1",
                  details: "30 lb x 6",
                },
                {
                  id: "4",
                  name: "Exercise D",
                  sets: "1",
                  details: "40 lb x 5",
                },
                {
                  id: "5",
                  name: "Exercise E",
                  sets: "1",
                  details: "50 lb x 5",
                },
              ],
            },
            {
              id: "3",
              title: "ARM DAY",
              exercises: [
                {
                  id: "6",
                  name: "Exercise F",
                  sets: "1",
                  details: "60 lb x 6",
                },
              ],
            },
          ],
        };
      }
      return {
        date,
        sections: [],
      };
    });
  });

  const [creatingDay, setCreatingDay] = useState<Date | null>(null);
  const [newWorkoutTitle, setNewWorkoutTitle] = useState<string>("");
  const sectionIdRef = useRef<number>(0);
  const exerciseIdRef = useRef<number>(0);
  const [creatingExerciseFor, setCreatingExerciseFor] = useState<{
    day: Date;
    sectionId: string;
  } | null>(null);
  const [newExerciseName, setNewExerciseName] = useState<string>("");
  const [newExerciseSetsInfo, setNewExerciseSetsInfo] = useState<string>("");
  const [newExerciseSetsCount, setNewExerciseSetsCount] = useState<string>("1");
  const [editingSection, setEditingSection] = useState<{
    day: Date;
    sectionId: string;
  } | null>(null);
  const [sectionTitleInput, setSectionTitleInput] = useState<string>("");
  const [editingExercise, setEditingExercise] = useState<{
    day: Date;
    sectionId: string;
    exerciseId: string;
  } | null>(null);
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

  const [openSectionMenu, setOpenSectionMenu] = useState<{
    day: Date;
    sectionId: string;
  } | null>(null);

  useEffect(() => {
    if (!openSectionMenu) return;
    const handleClickAway = () => setOpenSectionMenu(null);
    document.addEventListener("click", handleClickAway);
    return () => document.removeEventListener("click", handleClickAway);
  }, [openSectionMenu]);

  const startCreateForDay = (date: Date) => {
    setCreatingDay(date);
    setNewWorkoutTitle("");
  };

  const cancelCreate = () => {
    setCreatingDay(null);
    setNewWorkoutTitle("");
  };

  const saveCreate = (date: Date) => {
    const dayIndex = getDayIndexByDate(days, date);
    if (dayIndex === -1) return;
    const title = newWorkoutTitle.trim();
    if (!title) return;
    sectionIdRef.current += 1;
    const section: Section = {
      id: `sec-${sectionIdRef.current}`,
      title,
      exercises: [],
    };
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === dayIndex ? { ...d, sections: [...d.sections, section] } : d
      )
    );
    setCreatingDay(null);
    setNewWorkoutTitle("");
  };

  const beginEditSection = (
    day: Date,
    sectionId: string,
    currentTitle: string
  ) => {
    setEditingSection({ day, sectionId });
    setSectionTitleInput(currentTitle);
  };

  const cancelEditSection = () => {
    setEditingSection(null);
    setSectionTitleInput("");
  };

  const saveEditSection = (day: Date, sectionId: string) => {
    const title = sectionTitleInput.trim();
    if (!title) return;
    const dayIndex = getDayIndexByDate(days, day);
    if (dayIndex === -1) return;
    setDays((prev) =>
      prev.map((d, dIdx) =>
        dIdx !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.map((s) =>
                s.id !== sectionId ? s : { ...s, title }
              ),
            }
      )
    );
    cancelEditSection();
  };

  const deleteSection = (day: Date, sectionId: string) => {
    const dayIndex = getDayIndexByDate(days, day);
    if (dayIndex === -1) return;
    setDays((prev) =>
      prev.map((d, dIdx) =>
        dIdx !== dayIndex
          ? d
          : { ...d, sections: d.sections.filter((s) => s.id !== sectionId) }
      )
    );
    cancelEditSection();
  };

  const startCreateExercise = (day: Date, sectionId: string) => {
    setCreatingExerciseFor({ day, sectionId });
    setNewExerciseName("");
    setNewExerciseSetsInfo("");
    setNewExerciseSetsCount("1");
  };

  const cancelCreateExercise = () => {
    setCreatingExerciseFor(null);
  };

  const saveCreateExercise = (day: Date, sectionId: string) => {
    const name = newExerciseName.trim();
    if (!name) return;
    const info = newExerciseSetsInfo.trim();
    const count = newExerciseSetsCount.trim();
    const dayIndex = getDayIndexByDate(days, day);
    if (dayIndex === -1) return;
    const sectionIndex = days[dayIndex].sections.findIndex(
      (s) => s.id === sectionId
    );
    if (sectionIndex === -1) return;

    exerciseIdRef.current += 1;
    const exercise: Exercise = {
      id: `ex-${exerciseIdRef.current}`,
      name,
      sets: count || "1",
      details: info,
    };

    setDays((prev) =>
      prev.map((d, dIdx) =>
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
      )
    );
    setCreatingExerciseFor(null);
  };

  const beginEditExercise = (day: Date, sectionId: string, ex: Exercise) => {
    setEditingExercise({ day, sectionId, exerciseId: ex.id });
    setEditExerciseName(ex.name);
    setEditExerciseSets(ex.sets);
    setEditExerciseDetails(ex.details);
  };

  const cancelEditExercise = () => {
    setEditingExercise(null);
  };

  const saveEditExercise = (
    day: Date,
    sectionId: string,
    exerciseId: string
  ) => {
    const dayIndex = getDayIndexByDate(days, day);
    if (dayIndex === -1) return;
    setDays((prev) =>
      prev.map((d, dIdx) =>
        dIdx !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.map((s) =>
                s.id !== sectionId
                  ? s
                  : {
                      ...s,
                      exercises: s.exercises.map((e) =>
                        e.id !== exerciseId
                          ? e
                          : {
                              ...e,
                              name: editExerciseName,
                              sets: editExerciseSets,
                              details: editExerciseDetails,
                            }
                      ),
                    }
              ),
            }
      )
    );
    cancelEditExercise();
  };

  const deleteExercise = (day: Date, sectionId: string, exerciseId: string) => {
    const dayIndex = getDayIndexByDate(days, day);
    if (dayIndex === -1) return;
    setDays((prev) =>
      prev.map((d, dIdx) =>
        dIdx !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.map((s) =>
                s.id !== sectionId
                  ? s
                  : {
                      ...s,
                      exercises: s.exercises.filter((e) => e.id !== exerciseId),
                    }
              ),
            }
      )
    );
    cancelEditExercise();
  };

  const moveExerciseToSection = (
    source: { dayIndex: number; sectionIndex: number; exerciseIndex: number },
    target: { dayIndex: number; sectionIndex: number }
  ) => {
    if (
      source.dayIndex === target.dayIndex &&
      source.sectionIndex === target.sectionIndex
    ) {
      return;
    }

    setDays((prev) => {
      const { updatedDays, removed } = removeExerciseFrom(
        source.dayIndex,
        source.sectionIndex,
        source.exerciseIndex,
        prev
      );
      const next = appendExerciseToSection(
        target.dayIndex,
        target.sectionIndex,
        removed,
        updatedDays
      );
      return next;
    });
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

    setDays((prev) => {
      const { updatedDays, removed } = removeSectionFrom(
        sourceDayIndex,
        item.sourceSectionIndex,
        prev
      );
      const next = insertSectionAt(
        targetDayIndex,
        targetSectionIndex,
        removed,
        updatedDays
      );
      return next;
    });
  };

  const onSectionDayDrop = (item: SectionDragItem, targetDay: Date) => {
    const sourceDayIndex = getDayIndexByDate(days, item.sourceDay);
    const targetDayIndex = getDayIndexByDate(days, targetDay);
    if (sourceDayIndex === -1 || targetDayIndex === -1) return;
    setDays((prev) => {
      const { updatedDays, removed } = removeSectionFrom(
        sourceDayIndex,
        item.sourceSectionIndex,
        prev
      );
      const next = updatedDays.map((d, idx) =>
        idx !== targetDayIndex
          ? d
          : { ...d, sections: [...d.sections, { ...removed }] }
      );
      return next;
    });
  };

  const handleDrop = (
    item: DragItem,
    targetDay: Date,
    targetSectionId: string
  ) => {
    const source = findExercise(
      days,
      item.sourceDay,
      item.sourceSectionId,
      item.exerciseId
    );
    if (!source) return;

    const targetDayIndex = getDayIndexByDate(days, targetDay);
    if (targetDayIndex === -1) return;

    const targetSectionIndex = days[targetDayIndex].sections.findIndex(
      (s) => s.id === targetSectionId
    );
    if (targetSectionIndex === -1) return;

    moveExerciseToSection(
      {
        dayIndex: source.dayIndex,
        sectionIndex: source.sectionIndex,
        exerciseIndex: source.exerciseIndex,
      },
      { dayIndex: targetDayIndex, sectionIndex: targetSectionIndex }
    );
  };

  const handleDayDrop = (item: DragItem, targetDay: Date) => {
    const targetDayIndex = getDayIndexByDate(days, targetDay);
    if (targetDayIndex === -1) return;

    if (days[targetDayIndex].sections.length === 0) {
      const source = findExercise(
        days,
        item.sourceDay,
        item.sourceSectionId,
        item.exerciseId
      );
      if (!source) return;

      setDays((prev) => {
        const { updatedDays, removed } = removeExerciseFrom(
          source.dayIndex,
          source.sectionIndex,
          source.exerciseIndex,
          prev
        );

        const createdSection: Section = {
          id: `section-${targetDay}-${Date.now()}`,
          title: "NEW SECTION",
          exercises: [{ ...removed }],
        };

        const next = updatedDays.map((day, idx) =>
          idx === targetDayIndex ? { ...day, sections: [createdSection] } : day
        );
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="overflow-x-auto">
        <div className="flex gap-4">
          {DAY_NAMES.map((dayName, dayIndex) => (
            <div key={dayIndex} className="flex-none min-w-60 text-start">
              <span className="text-xs font-medium text-gray-500">
                {dayName}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2">
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
                        className="bg-gray-500 hover:border-none"
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
                    {day.sections.map((section, sectionIndex) => (
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
                                className="text-purple-600 hover:text-purple-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenSectionMenu({
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
                              {openSectionMenu &&
                                isSameDay(openSectionMenu.day, day.date) &&
                                openSectionMenu.sectionId === section.id && (
                                  <div
                                    className="absolute right-0 mt-1 z-10 w-36 rounded-md border border-gray-200 bg-white shadow-md"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50"
                                      onClick={() => {
                                        setSectionTitleInput(section.title);
                                        setSectionModal({
                                          open: true,
                                          day: day.date,
                                          sectionId: section.id,
                                        });
                                        setOpenSectionMenu(null);
                                      }}
                                    >
                                      Edit name
                                    </button>
                                    <button
                                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50"
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
                                        setOpenSectionMenu(null);
                                      }}
                                    >
                                      Create
                                    </button>
                                  </div>
                                )}
                            </div>
                          </div>

                          {editingSection &&
                            isSameDay(editingSection.day, day.date) &&
                            editingSection.sectionId === section.id && (
                              <div className="rounded-md border border-gray-200 bg-white p-2">
                                <div className="flex items-center gap-2 flex-col">
                                  <input
                                    className="w-full flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                                    value={sectionTitleInput}
                                    onChange={(e) =>
                                      setSectionTitleInput(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        saveEditSection(day.date, section.id);
                                      if (e.key === "Escape")
                                        cancelEditSection();
                                    }}
                                  />
                                  <div className="flex items-center gap-1 justify-end w-full">
                                    <Button
                                      variant="icon-small"
                                      className="bg-gray-500 hover:bg-gray-600"
                                      childrenClassName="text-md"
                                      onClick={() =>
                                        saveEditSection(day.date, section.id)
                                      }
                                    >
                                      ✓
                                    </Button>
                                    <Button
                                      className="bg-gray-500 hover:bg-gray-600"
                                      variant="icon-small"
                                      onClick={() =>
                                        deleteSection(day.date, section.id)
                                      }
                                    >
                                      🗑
                                    </Button>
                                    <Button
                                      variant="icon-small"
                                      onClick={cancelEditSection}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

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
                              {section.exercises.map(
                                (exercise, exerciseIndex) =>
                                  editingExercise &&
                                  isSameDay(editingExercise.day, day.date) &&
                                  editingExercise.sectionId === section.id &&
                                  editingExercise.exerciseId === exercise.id ? (
                                    <div
                                      key={exercise.id}
                                      className="rounded-md border border-gray-200 bg-white p-2.5"
                                    >
                                      <div className="flex flex-col gap-2">
                                        <input
                                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                                          value={editExerciseName}
                                          onChange={(e) =>
                                            setEditExerciseName(e.target.value)
                                          }
                                        />
                                        <div className="flex items-center gap-2">
                                          <input
                                            className="w-14 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                                            value={editExerciseSets}
                                            onChange={(e) =>
                                              setEditExerciseSets(
                                                e.target.value
                                              )
                                            }
                                          />
                                          <span className="text-xs text-gray-500">
                                            x
                                          </span>
                                          <input
                                            className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                                            value={editExerciseDetails}
                                            onChange={(e) =>
                                              setEditExerciseDetails(
                                                e.target.value
                                              )
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter")
                                                saveEditExercise(
                                                  day.date,
                                                  section.id,
                                                  exercise.id
                                                );
                                              if (e.key === "Escape")
                                                cancelEditExercise();
                                            }}
                                          />
                                          <Button
                                            variant="icon-small"
                                            onClick={() =>
                                              saveEditExercise(
                                                day.date,
                                                section.id,
                                                exercise.id
                                              )
                                            }
                                          >
                                            ✓
                                          </Button>
                                          <Button
                                            variant="icon-small"
                                            onClick={() =>
                                              deleteExercise(
                                                day.date,
                                                section.id,
                                                exercise.id
                                              )
                                            }
                                          >
                                            🗑
                                          </Button>
                                          <Button
                                            variant="icon-small"
                                            onClick={cancelEditExercise}
                                          >
                                            ✕
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div key={exercise.id} className="relative">
                                      <DraggableExercise
                                        exercise={exercise}
                                        dayDate={day.date}
                                        sectionId={section.id}
                                        exerciseIndex={exerciseIndex}
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
                                  )
                              )}
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
