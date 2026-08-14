import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "instructor" | "parent";

export interface Profile {
  id: string;
  role: AppRole;
  full_name: string | null;
  phone: string | null;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
    staleTime: 60_000,
  });
}

export function homePathForRole(role: AppRole | undefined | null) {
  if (role === "admin" || role === "instructor") return "/admin/dashboard";
  if (role === "parent") return "/parent/today";
  return "/auth";
}