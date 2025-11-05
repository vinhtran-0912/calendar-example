export interface Exercise {
  id: string;
  name: string;
  setsInfo: string;
  setsCount: number;
}

export interface Workout {
  id: string;
  name: string;
  exerciseIds: string[];
}

export interface Day {
  id: string;
  date: string;
  workoutIds: string[];
}

export interface WorkoutExpanded extends Omit<Workout, "exerciseIds"> {
  exercises: Exercise[];
}

export interface DayExpanded extends Omit<Day, "workoutIds"> {
  workouts: WorkoutExpanded[];
}


