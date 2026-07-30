import { ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardsProps {
  statsTotalCount: number;
  statsEvfCount: number;
  statsGeneralCount: number;
  statsApprovedCount: number;
  statsPendingCount: number;
  progressPercentage: number;
}

export const StatsCards = ({
  statsTotalCount,
  statsEvfCount,
  statsGeneralCount,
  statsApprovedCount,
  statsPendingCount,
  progressPercentage,
}: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 no-print">
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[11px] font-bold text-gray-500 mb-1">إجمالي الطلبات</p>
            <h4 className="text-2xl font-black text-[#0D4435]">{statsTotalCount}</h4>
          </div>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <ClipboardList size={20} />
          </div>
        </div>
        <div className="mt-auto pt-3 border-t border-gray-100 flex gap-3 text-[10px] font-bold text-gray-500">
          <span>
            موزونة (EVF): <span className="text-[#C5A059]">{statsEvfCount}</span>
          </span>
          <span>
            مطابقة: <span className="text-blue-600">{statsGeneralCount}</span>
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[11px] font-bold text-gray-500 mb-1">الطلبات المكتملة والمعتمدة</p>
            <h4 className="text-2xl font-black text-green-600">{statsApprovedCount}</h4>
          </div>
          <div className="p-2 bg-green-50 text-green-600 rounded-lg">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[11px] font-bold text-gray-500 mb-1">قيد التقييم والاعتماد</p>
            <h4 className="text-2xl font-black text-orange-500">{statsPendingCount}</h4>
          </div>
          <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
            <Clock size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col relative overflow-hidden justify-between transition-all hover:shadow-md">
        <div className="flex justify-between items-end mb-2">
          <p className="text-[11px] font-bold text-gray-500">مؤشر الإنجاز</p>
          <h4 className="text-xl font-black text-[#0D4435]">{progressPercentage}%</h4>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-linear-to-l from-[#C5A059] to-[#0D4435] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
