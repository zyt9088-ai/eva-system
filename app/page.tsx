"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // @ts-ignore
  const handleLogin = (e) => {
    e.preventDefault();
    router.push("/dashboard");
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
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl pr-11 pl-4 text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
                  placeholder="admin@ladun.com"
                  dir="ltr"
                />
                <Mail
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl pr-11 pl-4 text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
                  placeholder="••••••••"
                  dir="ltr"
                />
                <Lock
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
            >
              تسجيل الدخول <ArrowRight size={18} />
            </button>

            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 font-bold">أو الدخول عبر</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert('سيتم تفعيل الدخول عبر حسابات مايكروسوفت قريباً')}
              className="w-full h-12 mt-6 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm"
            >
              Microsoft
              <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0H0V10H10V0Z" fill="#f25022"/>
                <path d="M21 0H11V10H21V0Z" fill="#7fba00"/>
                <path d="M10 11H0V21H10V11Z" fill="#00a4ef"/>
                <path d="M21 11H11V21H21V11Z" fill="#ffb900"/>
              </svg>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
