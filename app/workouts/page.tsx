import type { Metadata } from "next";
import WorkoutsView from "./WorkoutsView";

export const metadata: Metadata = {
  title: "Workouts — Bikash Sahu",
};

export default function WorkoutsPage() {
  return <WorkoutsView />;
}
