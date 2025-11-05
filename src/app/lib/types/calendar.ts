export interface Exercise {
  id: string;
  name: string;
  sets: string;
  details: string;
}

export interface Section {
  id: string;
  title: string;
  exercises: Exercise[];
}

export interface Day {
  date: Date;
  sections: Section[];
}

export interface DragItem {
  exerciseId: string;
  sourceDay: Date;
  sourceSectionId: string;
  sourceExerciseIndex: number;
}

export type SectionDragItem = {
  sectionId: string;
  sourceDay: Date;
  sourceSectionIndex: number;
};


