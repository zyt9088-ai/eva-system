"use client";

import { useState, useRef, useEffect } from "react";
import { Users, ChevronDown, LogOut, LayoutDashboard, ShieldCheck, ClipboardList, Contact, FileCheck, BadgeCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير مشتريات",
  specialist: "أخصائي مشتريات",
  employee: "موظف",
  executive: "معتمد تنفيذي",
};

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { profile, isAdmin } = useCurrentProfile();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const isLinkActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-white border-b border-gray-200/80 px-6 lg:px-10 py-3 flex justify-between items-center sticky top-0 z-50 shadow-xs backdrop-blur-md bg-white/95 print:hidden">
      {/* Brand Logo */}
      <Link href={profile?.role === "employee" ? "/my-tasks" : "/dashboard"} className="flex items-center gap-3 shrink-0">
        <img src="/logo.png" alt="شعار النظام" className="h-9 w-auto" />
        <h2 className="text-xl font-black text-[#0D4435] hidden sm:block">نظام قيّم</h2>
      </Link>

      {/* Navigation Bar - Modern Segmented Capsule */}
      <div className="flex items-center gap-4">
        <nav className="hidden md:flex items-center gap-1.5 bg-gray-50/90 p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs">
          {profile?.role === "employee" ? (
            <>
              <Link
                href="/my-tasks"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all ${
                  isLinkActive("/my-tasks")
                    ? "bg-[#0D4435] text-white shadow-xs font-black"
                    : "text-gray-600 hover:text-[#0D4435] hover:bg-white font-bold"
                }`}
              >
                <ClipboardList size={16} />
                <span>طلباتي</span>
              </Link>
              <Link
                href="/direct-purchase"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all ${
                  isLinkActive("/direct-purchase")
                    ? "bg-[#0D4435] text-white shadow-xs font-black"
                    : "text-gray-600 hover:text-[#0D4435] hover:bg-white font-bold"
                }`}
              >
                <FileCheck size={16} />
                <span>الشراء المباشر</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all ${
                  isLinkActive("/dashboard") && pathname === "/dashboard"
                    ? "bg-[#0D4435] text-white shadow-xs font-black"
                    : "text-gray-600 hover:text-[#0D4435] hover:bg-white font-bold"
                }`}
              >
                <LayoutDashboard size={16} />
                <span>لوحة التحكم</span>
              </Link>
              <Link
                href="/direct-purchase"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all ${
                  isLinkActive("/direct-purchase")
                    ? "bg-[#0D4435] text-white shadow-xs font-black"
                    : "text-gray-600 hover:text-[#0D4435] hover:bg-white font-bold"
                }`}
              >
                <FileCheck size={16} />
                <span>الشراء المباشر</span>
              </Link>
              <Link
                href="/my-tasks"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all ${
                  isLinkActive("/my-tasks")
                    ? "bg-[#0D4435] text-white shadow-xs font-black"
                    : "text-gray-600 hover:text-[#0D4435] hover:bg-white font-bold"
                }`}
              >
                <ClipboardList size={16} />
                <span>طلباتي</span>
              </Link>
            </>
          )}
        </nav>

        {/* Profile Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-all px-3.5 py-2 rounded-2xl border border-gray-200/80 shadow-2xs cursor-pointer"
          >
            <div className="w-8 h-8 bg-[#0D4435]/10 rounded-xl flex items-center justify-center text-[#0D4435]">
              <Users size={16} />
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-gray-400 font-bold leading-tight">مرحباً بك</p>
              <p className="text-xs font-black text-[#0D4435] leading-tight">
                {profile ? ROLE_LABELS[profile.role] : "..."}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden flex flex-col z-50 divide-y divide-gray-100"
              >
                {/* User Info */}
                <div className="p-4 bg-gray-50/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0D4435]/10 rounded-xl flex items-center justify-center text-[#0D4435]">
                      <Users size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 truncate">
                        {profile?.fullName || "المستخدم"}
                      </p>
                      <p className="text-[11px] font-bold text-gray-400 truncate" dir="ltr">
                        {profile?.email}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-[#0D4435]/10 text-[#0D4435] text-[10px] font-black rounded-md">
                        {profile ? ROLE_LABELS[profile.role] : "..."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Management Links */}
                {isAdmin && (
                  <div className="p-2 space-y-1">
                    <p className="px-3 pt-1 pb-1 text-[10px] font-black text-gray-400">إدارة النظام</p>
                    <Link
                      href="/dashboard/direct-purchase-committee"
                      onClick={() => setIsDropdownOpen(false)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                        isLinkActive("/dashboard/direct-purchase-committee")
                          ? "bg-[#0D4435]/10 text-[#0D4435] font-black"
                          : "text-gray-700 hover:bg-gray-50 hover:text-[#0D4435]"
                      }`}
                    >
                      <Users size={15} className="text-[#C5A059]" />
                      <span>لجنة الشراء المباشر</span>
                    </Link>

                    <Link
                      href="/dashboard/executive-approvers"
                      onClick={() => setIsDropdownOpen(false)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                        isLinkActive("/dashboard/executive-approvers")
                          ? "bg-[#0D4435]/10 text-[#0D4435] font-black"
                          : "text-gray-700 hover:bg-gray-50 hover:text-[#0D4435]"
                      }`}
                    >
                      <BadgeCheck size={15} className="text-[#C5A059]" />
                      <span>المعتمدون التنفيذيون</span>
                    </Link>

                    <Link
                      href="/dashboard/users"
                      onClick={() => setIsDropdownOpen(false)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                        isLinkActive("/dashboard/users")
                          ? "bg-[#0D4435]/10 text-[#0D4435] font-black"
                          : "text-gray-700 hover:bg-gray-50 hover:text-[#0D4435]"
                      }`}
                    >
                      <ShieldCheck size={15} className="text-[#C5A059]" />
                      <span>إدارة المستخدمين</span>
                    </Link>

                    <Link
                      href="/dashboard/employees"
                      onClick={() => setIsDropdownOpen(false)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                        isLinkActive("/dashboard/employees")
                          ? "bg-[#0D4435]/10 text-[#0D4435] font-black"
                          : "text-gray-700 hover:bg-gray-50 hover:text-[#0D4435]"
                      }`}
                    >
                      <Contact size={15} className="text-[#C5A059]" />
                      <span>دليل الموظفين</span>
                    </Link>
                  </div>
                )}

                {/* Logout Button */}
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut size={15} />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
