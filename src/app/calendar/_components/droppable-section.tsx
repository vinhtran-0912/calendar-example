"use client";

import { useDrop } from "react-dnd";
import type { RefObject } from "react";
import Button from "../../components/button";
import type {
  DragItem,
  SectionDragItem,
  Section,
} from "../../lib/types/calendar";
import { ITEM_TYPES } from "../../lib/constants/calendar";

export default function DroppableSection({
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
    drop: (item) => {
      if ("exerciseId" in item) onDrop(item as DragItem, dayDate, section.id);
      else onSectionDrop(item as SectionDragItem, dayDate, section.id);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
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
