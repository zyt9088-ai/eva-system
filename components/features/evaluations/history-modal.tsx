"use client";

import { X, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDateTime } from "@/lib/formatters";

interface HistoryEvent {
  date: string;
  action: string;
  user: string;
  isEval?: boolean;
}

interface Evaluation {
  id: string;
  prNumber: string;
  projectName: string;
  history?: HistoryEvent[];
  itemEvaluations?: Record<string, { timestamp: string; evaluatorName: string }>;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyEval: Evaluation | null;
}

export const HistoryModal = ({ isOpen, onClose, historyEval }: HistoryModalProps) => {
  if (!historyEval) return null;

  const generateTimeline = (ev: Evaluation) => {
    let events: HistoryEvent[] = [];
    if (ev.history) events.push(...ev.history);
    else
      events.push({
        date: new Date().toISOString(),
        action: "تم إنشاء الطلب",
        user: "غير معروف",
      });

    if (ev.itemEvaluations) {
      Object.keys(ev.itemEvaluations).forEach((evalIdx) => {
        const timestamp = ev.itemEvaluations![evalIdx]?.timestamp;
        if (timestamp) {
          events.push({
            date: timestamp,
            action: "إضافة تقييم جديد من قبل عضو اللجنة",
            user: ev.itemEvaluations![evalIdx]?.evaluatorName || `مقيم ${parseInt(evalIdx) + 1}`,
            isEval: true,
          });
        }
      });
    }
    return events.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
              <h3 className="text-lg font-black text-[#0D4435] flex items-center gap-2.5">
                <div className="p-2 bg-[#C5A059]/10 rounded-lg text-[#C5A059]">
                  <History size={18} />
                </div>
                سجل مسار الطلب
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 bg-gray-50/50 flex-1 custom-scrollbar">
              <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-right">
                <p className="text-[11px] font-bold text-gray-400 mb-1">
                  المشروع ورقم الطلب
                </p>
                <p className="text-sm font-black text-[#222222]">
                  {historyEval.prNumber} - {historyEval.projectName}
                </p>
              </div>
              <div className="relative border-r-2 border-[#0D4435]/20 pr-6 mr-3 space-y-6 mt-6">
                {generateTimeline(historyEval).map((evt, idx) => (
                  <div key={idx} className="relative">
                    <span
                      className={`absolute -right-7.75 w-4 h-4 rounded-full border-2 border-white shadow-sm ${evt.isEval ? "bg-[#C5A059]" : "bg-[#0D4435]"}`}
                    ></span>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-black text-gray-800">
                          {evt.action}
                        </h4>
                        <span
                          className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100"
                          dir="ltr"
                        >
                          {formatDateTime(evt.date)}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-gray-500">
                        بواسطة:{" "}
                        <span
                          className={
                            evt.isEval
                              ? "text-[#C5A059] font-black"
                              : "text-[#0D4435] font-black"
                          }
                        >
                          {evt.user}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
