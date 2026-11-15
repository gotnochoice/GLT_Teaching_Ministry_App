import {
  LayoutDashboard, BookOpen, ClipboardList, Calendar, Users, GraduationCap,
  HandHeart, Megaphone, Settings, Layers, CheckSquare, UserCircle, Briefcase, Heart, Inbox, History, type LucideIcon,
} from "lucide-react";
import type { Role } from "./utils";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/dashboard/student", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/student/classes", label: "My Classes", icon: BookOpen },
    { href: "/dashboard/student/requirements", label: "Prayer & Evangelism", icon: HandHeart },
    { href: "/dashboard/student/internship", label: "Internship", icon: Briefcase },
    { href: "/dashboard/student/results", label: "Results", icon: ClipboardList },
    { href: "/dashboard/student/schedule", label: "Schedule & Attendance", icon: Calendar },
    { href: "/dashboard/student/care", label: "Pastoral Care", icon: Heart },
  ],
  TEACHER: [
    { href: "/dashboard/teacher", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/teacher/students", label: "Students", icon: Users },
    { href: "/dashboard/teacher/sessions", label: "Sessions & Attendance", icon: Calendar },
    { href: "/dashboard/teacher/grading", label: "Grading", icon: CheckSquare },
    { href: "/dashboard/teacher/requirements", label: "Verify Requirements", icon: HandHeart },
    { href: "/dashboard/teacher/internships", label: "Internships", icon: Briefcase },
  ],
  ADMIN: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/applications", label: "Join Requests", icon: Inbox },
    { href: "/dashboard/admin/students", label: "Students", icon: Users },
    { href: "/dashboard/admin/people", label: "Teachers & Admins", icon: UserCircle },
    { href: "/dashboard/admin/cohorts", label: "Cohorts", icon: Layers },
    { href: "/dashboard/admin/sessions", label: "Sessions & Attendance", icon: Calendar },
    { href: "/dashboard/admin/grading", label: "Grading", icon: CheckSquare },
    { href: "/dashboard/admin/requirements", label: "Verify Requirements", icon: HandHeart },
    { href: "/dashboard/admin/internships", label: "Internships", icon: Briefcase },
    { href: "/dashboard/admin/curriculum", label: "Curriculum & Tests", icon: BookOpen },
    { href: "/dashboard/admin/graduation", label: "Graduation", icon: GraduationCap },
    { href: "/dashboard/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/dashboard/admin/audit", label: "Audit Log", icon: History },
    { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
  ],
};

/** Shown to staff flagged as pastors (private pastoral-care requests). */
export const PASTOR_NAV: NavItem = { href: "/dashboard/care", label: "Pastoral Care Inbox", icon: Heart };
