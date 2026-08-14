import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Users, GraduationCap, BookOpen, CalendarDays, BarChart3, LogOut } from "lucide-react";
import { supabase } from "@/definitions-unused";

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => <Outlet />,
});