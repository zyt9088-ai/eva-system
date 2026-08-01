import { Users, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function EvaluatorSelector({
  data,
  evaluatorsList,
  setSelectedEvaluatorIndex,
}: {
  data: any;
  evaluatorsList: any[];
  setSelectedEvaluatorIndex: (idx: number) => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans" dir="rtl">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
            * { font-family: 'Cairo', sans-serif !important; }
            body, main { padding-top: 0 !important; margin-top: 0 !important; background-color: #F8FAFC; }
          `,
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full"
      >
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-[#0D4435]/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-[#0D4435]" />
          </div>
          <h1 className="text-2xl font-black text-[#0D4435]">بوابة التقييم الفني</h1>
          <p className="text-sm font-bold text-gray-500 mt-2">الرجاء اختيار اسمك من قائمة اللجنة للبدء</p>
        </div>
        <div className="space-y-3">
          {evaluatorsList.map((ev, idx) => {
            const isDone = data.itemEvaluations && data.itemEvaluations[idx] !== undefined;
            return (
              <button
                key={idx}
                disabled={isDone}
                onClick={() => setSelectedEvaluatorIndex(idx)}
                className={`w-full p-4 rounded-xl text-sm font-bold text-right border transition-all flex justify-between items-center
                  ${isDone 
                    ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-70" 
                    : "bg-white border-gray-300 text-gray-700 hover:border-[#0D4435] hover:text-[#0D4435] hover:shadow-sm active:scale-[0.98]"}`}
              >
                <span>
                  {ev.name}{" "}
                  {ev.isPM && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded mr-2">
                      مدير المشروع
                    </span>
                  )}
                </span>
                {isDone ? (
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-2.5 py-1 rounded-md flex items-center gap-1">
                    تم التقييم <CheckCircle2 size={12} />
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#0D4435]/10 text-[#0D4435] px-2.5 py-1 rounded-md opacity-0 transition-opacity">
                    اختر
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
