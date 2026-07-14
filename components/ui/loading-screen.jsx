"use client";

import { motion } from "framer-motion";
import { ClipboardCheck } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gray-50/90 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center min-h-screen" dir="rtl">
      <div className="relative flex items-center justify-center">
        {/* Outer Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute w-32 h-32 rounded-full border-t-2 border-r-2 border-[#0D4435] opacity-20"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute w-24 h-24 rounded-full border-b-2 border-l-2 border-[#C5A059] opacity-40"
        />
        
        {/* Central Icon */}
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="bg-gradient-to-tr from-[#0D4435] to-[#125946] w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center relative overflow-hidden border border-[#1a6652]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <ClipboardCheck size={32} className="text-white" />
          </motion.div>
          {/* Shimmer effect */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.5 }}
            className="absolute top-0 left-0 w-1/2 h-full bg-white/20 -skew-x-12"
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 flex flex-col items-center"
      >
        <h2 className="text-xl font-black text-[#0D4435] mb-2 tracking-tight">جاري تهيئة مساحة العمل</h2>
        <div className="flex gap-1 items-center">
          <p className="text-sm font-bold text-gray-500">لحظات ونبدأ التقييم</p>
          <div className="flex gap-1 mr-2 mt-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 bg-[#C5A059] rounded-full"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
