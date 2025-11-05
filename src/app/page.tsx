"use client";

import { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import type { RefObject } from "react";

interface Exercise {
  id: string;
  name: string;
  sets: string;
  details: string;
}

interface Section {
  id: string;
  title: string;
  exercises: Exercise[];
}

interface Day {
  date: Date;
  sections: Section[];
}

interface DragItem {
  exerciseId: string;
  sourceDay: Date;
  sourceSectionId: string;
  sourceExerciseIndex: number;
}

const ITEM_TYPE = "exercise";

function DraggableExercise({
  exercise,
  dayDate,
  sectionId,
  exerciseIndex,
}: {
  exercise: Exercise;
  dayDate: Date;
  sectionId: string;
  exerciseIndex: number;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
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
    <div
      ref={drag as unknown as RefObject<HTMLDivElement>}
      className={`rounded-md border border-gray-200 bg-gray-50 p-2.5 ${
        isDragging ? "opacity-50" : "cursor-move"
      }`}
    >
      <div className="mb-1 text-xs font-medium leading-tight text-gray-900">
        {exercise.name}
      </div>
      <div className="flex items-baseline gap-1 text-[11px] leading-tight text-gray-600">
        <span className="text-gray-500">{exercise.sets}x</span>
        <span>{exercise.details}</span>
      </div>
    </div>
  );
}

function DroppableSection({
  section,
  dayDate,
  onDrop,
  children,
}: {
  section: Section;
  dayDate: Date;
  onDrop: (item: DragItem, targetDay: Date, targetSectionId: string) => void;
  children: React.ReactNode;
}) {
  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>(
    () => ({
      accept: ITEM_TYPE,
      drop: (item: DragItem) => {
        onDrop(item, dayDate, section.id);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    })
  );

  return (
    <div
      ref={drop as unknown as RefObject<HTMLDivElement>}
      className={`flex flex-col gap-2 ${
        isOver ? "bg-blue-50 rounded-md p-1" : ""
      }`}
    >
      {children}
    </div>
  );
}

function DroppableDay({
  day,
  onDrop,
  children,
}: {
  day: Day;
  onDrop: (item: DragItem, targetDay: Date) => void;
  children: React.ReactNode;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item: DragItem) => {
      onDrop(item, day.date);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop as unknown as RefObject<HTMLDivElement>}
      className={`flex flex-col ${isOver ? "bg-blue-50 rounded-md p-2" : ""}`}
    >
      {children}
    </div>
  );
}

const getCurrentWeek = (): Date[] => {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    week.push(date);
  }
  return week;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export default function Home() {
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
              title: "CHEST DAY - WITH ARM...",
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

  const findExercise = (
    dayDate: Date,
    sectionId: string,
    exerciseId: string
  ): {
    exercise: Exercise;
    dayIndex: number;
    sectionIndex: number;
    exerciseIndex: number;
  } | null => {
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

  const handleDrop = (
    item: DragItem,
    targetDay: Date,
    targetSectionId: string
  ) => {
    const source = findExercise(
      item.sourceDay,
      item.sourceSectionId,
      item.exerciseId
    );
    if (!source) return;

    const targetDayIndex = days.findIndex((d) => isSameDay(d.date, targetDay));
    if (targetDayIndex === -1) return;

    const targetSectionIndex = days[targetDayIndex].sections.findIndex(
      (s) => s.id === targetSectionId
    );
    if (targetSectionIndex === -1) return;

    if (
      source.dayIndex === targetDayIndex &&
      source.sectionIndex === targetSectionIndex
    ) {
      return;
    }

    setDays((prevDays) => {
      const newDays = [...prevDays];
      const exercise = { ...source.exercise };

      newDays[source.dayIndex] = {
        ...newDays[source.dayIndex],
        sections: newDays[source.dayIndex].sections.map((section, idx) => {
          if (idx === source.sectionIndex) {
            return {
              ...section,
              exercises: section.exercises.filter(
                (_, exIdx) => exIdx !== source.exerciseIndex
              ),
            };
          }
          return section;
        }),
      };

      newDays[targetDayIndex] = {
        ...newDays[targetDayIndex],
        sections: newDays[targetDayIndex].sections.map((section, idx) => {
          if (idx === targetSectionIndex) {
            return {
              ...section,
              exercises: [...section.exercises, exercise],
            };
          }
          return section;
        }),
      };

      return newDays;
    });
  };

  const handleDayDrop = (item: DragItem, targetDay: Date) => {
    const targetDayIndex = days.findIndex((d) => isSameDay(d.date, targetDay));
    if (targetDayIndex === -1) return;

    if (days[targetDayIndex].sections.length === 0) {
      const source = findExercise(
        item.sourceDay,
        item.sourceSectionId,
        item.exerciseId
      );
      if (!source) return;

      setDays((prevDays) => {
        const newDays = [...prevDays];
        const exercise = { ...source.exercise };

        newDays[source.dayIndex] = {
          ...newDays[source.dayIndex],
          sections: newDays[source.dayIndex].sections.map((section, idx) => {
            if (idx === source.sectionIndex) {
              return {
                ...section,
                exercises: section.exercises.filter(
                  (_, exIdx) => exIdx !== source.exerciseIndex
                ),
              };
            }
            return section;
          }),
        };

        newDays[targetDayIndex] = {
          ...newDays[targetDayIndex],
          sections: [
            {
              id: `section-${targetDay}-${Date.now()}`,
              title: "NEW SECTION",
              exercises: [exercise],
            },
          ],
        };

        return newDays;
      });
    }
  };

  const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <div className="min-h-screen p-6 bg-calendar-bg">
      <div className="grid grid-cols-7 gap-4">
        {days.map((day, dayIndex) => {
          const isToday = isSameDay(day.date, today);
          const dateString = String(day.date.getDate()).padStart(2, "0");

          return (
            <DroppableDay
              key={day.date.getTime()}
              day={day}
              onDrop={handleDayDrop}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-gray-500">
                    {dayNames[dayIndex]}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      isToday ? "font-bold text-purple-600" : "text-gray-500"
                    }`}
                  >
                    {dateString}
                  </span>
                </div>
                {day.sections.length === 0 && (
                  <button className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400">
                    <span className="text-sm leading-none">+</span>
                  </button>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-4">
                {day.sections.map((section) => (
                  <div key={section.id} className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold leading-tight text-gray-900">
                        {section.title}
                      </h3>
                      <div className="flex items-center gap-1">
                        <button className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400">
                          <span className="text-[10px] leading-none">⋯</span>
                        </button>
                        <button className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400">
                          <span className="text-[10px] leading-none">+</span>
                        </button>
                      </div>
                    </div>

                    <DroppableSection
                      section={section}
                      dayDate={day.date}
                      onDrop={handleDrop}
                    >
                      <div className="flex flex-col gap-2">
                        {section.exercises.map((exercise, exerciseIndex) => (
                          <DraggableExercise
                            key={exercise.id}
                            exercise={exercise}
                            dayDate={day.date}
                            sectionId={section.id}
                            exerciseIndex={exerciseIndex}
                          />
                        ))}
                      </div>
                    </DroppableSection>
                  </div>
                ))}

                {day.sections.length > 0 && (
                  <button className="mt-auto flex h-8 w-8 items-center justify-center self-start rounded-full border border-gray-300 bg-white text-gray-400">
                    <span className="text-base leading-none">+</span>
                  </button>
                )}
              </div>
            </DroppableDay>
          );
        })}
      </div>
    </div>
  );
}
