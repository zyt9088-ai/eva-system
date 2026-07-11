"use client";

import { useState, useRef, useEffect } from "react";
import { Users, ChevronDown, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export function AppHeader() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 lg:px-10 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm print:hidden">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="شعار النظام" className="h-8 w-auto" />
        <h2 className="text-2xl font-black text-[#0D4435]">نظام قيّم</h2>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors px-4 py-2 rounded-xl border border-gray-200"
        >
          <div className="w-9 h-9 bg-[#0D4435]/10 rounded-lg flex items-center justify-center">
            <Users size={18} className="text-[#0D4435]" />
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-gray-500 font-bold">مرحباً بك</p>
            <p className="text-xs font-black text-[#0D4435]">مدير النظام</p>
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                <p className="text-xs font-bold text-gray-500 mb-1">
                  مسجل الدخول بحساب
                </p>
                <p className="text-sm font-black text-gray-800 truncate" dir="ltr">
                  admin@ladun.com
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-between p-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors w-full text-right"
              >
                تسجيل الخروج
                <LogOut size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
