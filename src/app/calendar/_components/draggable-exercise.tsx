"use client";

import { useDrag } from "react-dnd";
import type { RefObject } from "react";
import Card from "../../components/card";
import type { Exercise } from "../../lib/types/calendar";
import { ITEM_TYPES } from "../../lib/constants/calendar";

export default function DraggableExercise({
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
      className="cursor-move"
    >
      <div className="mb-1 text-xs font-medium leading-tight text-gray-900">
        {exercise.name}
      </div>
      <div className="flex items-baseline gap-1 text-[11px] leading-tight text-gray-600">
        <span className="text-gray-500">{exercise.sets}x</span>
        <span>{exercise.details}</span>
      </div>
    </Card>
  );
}


