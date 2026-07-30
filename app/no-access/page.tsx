"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldOff, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function NoAccessPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4" dir="rtl">
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
        className="w-full max-w-md bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden text-center"
      >
        <div className="bg-[#0D4435] p-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-sm mx-auto flex items-center justify-center mb-4 border border-white/20">
            <ShieldOff size={32} className="text-[#C5A059]" />
          </div>
          <h1 className="text-xl font-black text-white">لا تملك صلاحية الدخول بعد</h1>
        </div>

        <div className="p-8">
          <p className="text-sm font-bold text-gray-500 leading-relaxed mb-6">
            حسابك مسجّل دخول بنجاح، لكن ما تم إضافتك بعد كمستخدم في نظام قيّم. تواصل مع مدير المشتريات
            لإضافة حسابك من صفحة &quot;إدارة المستخدمين&quot;، ثم سجّل الدخول من جديد.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-12 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            تسجيل الخروج <LogOut size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
