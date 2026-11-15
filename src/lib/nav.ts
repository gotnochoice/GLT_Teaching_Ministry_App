import {
  LayoutDashboard, BookOpen, ClipboardList, Calendar, Users, GraduationCap,
  HandHeart, Megaphone, Settings, Layers, CheckSquare, UserCircle, type LucideIcon,
} from "lucide-react";
import type { Role } from "./utils";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/dashboard/student", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/student/classes", label: "My Classes", icon: BookOpen },
    { href: "/dashboard/student/requirements", label: "Prayer & Evangelism", icon: HandHeart },
    { href: "/dashboard/student/results", label: "Results", icon: ClipboardList },
    { href: "/dashboard/student/schedule", label: "Schedule", icon: Calendar },
  ],
  TEACHER: [
    { href: "/dashboard/teacher", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/teacher/students", label: "Students", icon: Users },
    { href: "/dashboard/teacher/sessions", label: "Sessions & Attendance", icon: Calendar },
    { href: "/dashboard/teacher/grading", label: "Grading", icon: CheckSquare },
    { href: "/dashboard/teacher/requirements", label: "Verify Requirements", icon: HandHeart },
  ],
  ADMIN: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/students", label: "Students", icon: Users },
    { href: "/dashboard/admin/people", label: "Teachers & Admins", icon: UserCircle },
    { href: "/dashboard/admin/cohorts", label: "Cohorts", icon: Layers },
    { href: "/dashboard/admin/sessions", label: "Sessions & Attendance", icon: Calendar },
    { href: "/dashboard/admin/grading", label: "Grading", icon: CheckSquare },
    { href: "/dashboard/admin/requirements", label: "Verify Requirements", icon: HandHeart },
    { href: "/dashboard/admin/curriculum", label: "Curriculum & Tests", icon: BookOpen },
    { href: "/dashboard/admin/graduation", label: "Graduation", icon: GraduationCap },
    { href: "/dashboard/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
  ],
};
