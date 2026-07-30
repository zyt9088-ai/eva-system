"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "email openid profile",
      },
    });
  };

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4"
      dir="rtl"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Cairo', sans-serif !important; }
      `,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden"
      >
        <div className="bg-[#0D4435] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#C5A059]/20 rounded-full blur-2xl -ml-5 -mb-5"></div>

          <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-sm mx-auto flex items-center justify-center mb-4 border border-white/20 relative z-10">
            <ShieldCheck size={32} className="text-[#C5A059]" />
          </div>
          <h1 className="text-2xl font-black text-white relative z-10">
            نظام قيّم
          </h1>
          <p className="text-[#C5A059] text-sm font-bold mt-2 relative z-10">
            Qayyem Portal
          </p>
        </div>

        <div className="p-8">
          <p className="text-sm font-bold text-gray-500 text-center mb-6">
            الرجاء تسجيل الدخول بحساب Microsoft 365 الخاص بالجهة
          </p>

          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
            className="w-full h-12 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "جارِ التحويل..." : "الدخول عبر Microsoft"}
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0H0V10H10V0Z" fill="#f25022"/>
              <path d="M21 0H11V10H21V0Z" fill="#7fba00"/>
              <path d="M10 11H0V21H10V11Z" fill="#00a4ef"/>
              <path d="M21 11H11V21H21V11Z" fill="#ffb900"/>
            </svg>
          </button>
        </div>
      </motion.div>
    </div>
  );
}