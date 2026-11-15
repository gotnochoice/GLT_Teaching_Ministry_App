import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "GLT Teaching Ministry";

export const ROLES = ["STUDENT", "TEACHER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const TOTAL_CLASSES = 9;

export function dashboardPath(role?: string) {
  return role ? `/dashboard/${role.toLowerCase()}` : "/";
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export const ASSESSMENT_LABEL: Record<string, string> = {
  TEST: "Test",
  ASSIGNMENT: "Assignment",
  EXAM: "Final Exam",
  INTERNSHIP: "Internship",
};

export const REQUIREMENT_LABEL: Record<string, string> = {
  PRAYER: "Prayer",
  EVANGELISM: "Evangelism",
};
