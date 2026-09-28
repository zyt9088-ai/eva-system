"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface CurrentProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "specialist" | "employee" | "executive";
}

export function useCurrentProfile() {
  const { data, isLoading } = useQuery({
    queryKey: ["current-profile"],
    queryFn: async (): Promise<CurrentProfile | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", user.id)
        .single();

      if (error || !profile) return null;

      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
      };
    },
  });

  return {
    profile: data ?? null,
    isLoading,
    isAdmin: data?.role === "admin",
    // Holds the executive-director role. Whether this particular person is the
    // one who signs right now is a separate question — the standing approver is
    // the active row in direct_purchase_executives (see useDirectPurchase).
    isExecutive: data?.role === "executive",
  };
}