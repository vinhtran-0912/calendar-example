"use client";

import { useDrop } from "react-dnd";
import type { RefObject } from "react";
import type { Day, DragItem, SectionDragItem } from "../../lib/types/calendar";
import { ITEM_TYPES } from "../../lib/constants/calendar";

export default function DroppableDay({
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
    drop: (item, monitor) => {
      if (monitor.didDrop()) return undefined;
      if ("exerciseId" in item) {
        onDrop(item as DragItem, day.date);
      } else {
        onSectionDayDrop(item as SectionDragItem, day.date);
      }
      return { handled: true };
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }));

  return (
    <div
      ref={drop as unknown as RefObject<HTMLDivElement>}
      className={`flex flex-col bg-calendar-bg rounded-lg p-3 min-h-[600px] ${
        isOver ? "ring-2 ring-blue-400" : ""
      }`}
    >
      {children}
    </div>
  );
}
