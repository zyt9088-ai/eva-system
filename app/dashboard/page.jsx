"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ClipboardCheck,
  Users,
  ArrowLeft,
  LogOut,
  ChevronDown,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardHome() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    router.push("/");
  };

  const handleCardClick = () => {
    router.push("/tech-eval");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col" dir="rtl">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Cairo', sans-serif !important; }
      `,
        }}
      />

      <header className="bg-white border-b border-gray-200 px-6 lg:px-10 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="شعار النظام"
            className="h-10 w-auto object-contain"
          />
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
                  <p
                    className="text-sm font-black text-gray-800 truncate"
                    dir="ltr"
                  >
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

      <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-[#0D4435]">نظام قيّم</h1>
          <p className="text-gray-500 font-bold mt-2">
            نظام قيّم لإدارة التقييمات الفنية والموردين
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            onClick={handleCardClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-2 h-full bg-[#C5A059] transition-all group-hover:w-full group-hover:opacity-5"></div>
            <div className="w-14 h-14 bg-yellow-50 rounded-xl flex items-center justify-center mb-6 border border-yellow-100 transition-transform group-hover:scale-110">
              <ClipboardCheck size={28} className="text-[#C5A059]" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">
              إدارة التقييم الفني
            </h3>
            <p className="text-sm font-bold text-gray-500 mb-6 leading-relaxed">
              إدارة طلبات التقييم الموزون (EVF) والمطابقة، وإصدار الروابط للجان
              التقييم واعتمادها.
            </p>
            <div className="inline-flex items-center gap-2 text-sm font-black text-[#0D4435] group-hover:text-[#C5A059] transition-colors">
              الدخول للنظام <ArrowLeft size={16} />
            </div>
          </motion.div>
          <motion.div
            onClick={() => {}}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-white/80 rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group cursor-not-allowed opacity-90"
          >
            <span className="absolute top-6 left-6 bg-gray-100 text-gray-500 text-xs font-black px-3 py-1 rounded-full border border-gray-200 z-10">
              قريباً
            </span>
            <div className="absolute top-0 right-0 w-2 h-full bg-gray-400 transition-all group-hover:w-full group-hover:opacity-5"></div>
            <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center mb-6 border border-gray-100 transition-transform group-hover:scale-110">
              <Users size={28} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-black text-gray-700 mb-2">
              إدارة تقييم الموردين
            </h3>
            <p className="text-sm font-bold text-gray-400 mb-6 leading-relaxed">
              إدارة تقييمات أداء الموردين بناءً على معايير الجودة والتسليم وسرعة التجاوب.
            </p>
            <div className="inline-flex items-center gap-2 text-sm font-black text-gray-400">
              النظام قيد التجهيز
            </div>
          </motion.div>
          
          <motion.div
            onClick={() => {}}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -5 }}
            className="bg-white/80 rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group cursor-not-allowed opacity-90"
          >
            <span className="absolute top-6 left-6 bg-gray-100 text-gray-500 text-xs font-black px-3 py-1 rounded-full border border-gray-200 z-10">
              قريباً
            </span>
            <div className="absolute top-0 right-0 w-2 h-full bg-gray-400 transition-all group-hover:w-full group-hover:opacity-5"></div>
            <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center mb-6 border border-gray-100 transition-transform group-hover:scale-110">
              <Wallet size={28} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-black text-gray-700 mb-2">
              التقييم المالي
            </h3>
            <p className="text-sm font-bold text-gray-400 mb-6 leading-relaxed">
              إدارة التقييم المالي للعروض وتحليل التكاليف ومقارنة الأسعار بشكل آلي.
            </p>
            <div className="inline-flex items-center gap-2 text-sm font-black text-gray-400">
              النظام قيد التجهيز
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="py-6 border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm font-black text-[#0D4435] text-center md:text-right">
            برنامج تطوير وزارة الحرس الوطني
          </p>
          <p
            className="text-sm font-black text-gray-400 w-full md:w-auto text-left"
            dir="ltr"
          >
            Powered by Eng. Yazeed Alonazi
          </p>
        </div>
      </footer>
    </div>
  );
}
