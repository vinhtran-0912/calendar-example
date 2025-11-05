import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vim Calendar - Calendar",
  description:
    "Plan and manage your weekly workouts with a clean, simple calendar.",
};

const CalendarLayout = ({ children }: { children: React.ReactNode }) => {
  return children;
};

export default CalendarLayout;
