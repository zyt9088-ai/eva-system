import { CheckCircle2, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export function SuccessScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-sm w-full"
      >
        <CheckCircle2 size={48} className="mx-auto text-green-600 mb-5" />
        <h1 className="text-xl font-black text-[#0D4435] mb-2">تم إرسال التقييم بنجاح</h1>
        <p className="text-sm font-bold text-gray-500">شكراً لك، تم تسجيل بياناتك واعتمادها في النظام.</p>
      </motion.div>
    </div>
  );
}

export function ApprovedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-sm w-full">
        <CheckCircle2 size={48} className="mx-auto text-green-600 mb-5" />
        <h1 className="text-xl font-black text-[#0D4435] mb-2">اكتمل الطلب وتم اعتماده</h1>
        <p className="text-sm font-bold text-gray-500">تم الانتهاء من التقييم واعتماده بشكل نهائي في النظام.</p>
      </div>
    </div>
  );
}

export function AlreadySubmittedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-sm w-full">
        <ClipboardList size={48} className="mx-auto text-blue-600 mb-5" />
        <h1 className="text-xl font-black text-[#0D4435] mb-2">بانتظار الاعتماد</h1>
        <p className="text-sm font-bold text-gray-500 mb-6">
          سبق أن أرسلت تقييمك لهذا الطلب. بانتظار اعتماده من إدارة المشتريات.
        </p>
        <Link
          href="/my-tasks"
          className="inline-flex items-center justify-center h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-lg font-black text-sm transition-all active:scale-95"
        >
          رجوع لطلباتي
        </Link>
      </div>
    </div>
  );
}

export function PendingReviewScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-sm w-full">
        <ClipboardList size={48} className="mx-auto text-blue-600 mb-5" />
        <h1 className="text-xl font-black text-[#0D4435] mb-2">قيد المراجعة</h1>
        <p className="text-sm font-bold text-gray-500">اكتمل تقييم جميع الأعضاء والطلب الآن قيد المراجعة من قبل إدارة المشتريات.</p>
      </div>
    </div>
  );
}
