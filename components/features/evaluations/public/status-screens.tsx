import { CheckCircle2, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";

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
