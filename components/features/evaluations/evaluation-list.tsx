import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertCircle, Users, CheckCircle2, History, Eye, Pencil, Link as LinkIcon, Trash2, Briefcase, Search, Bell, User } from "lucide-react";
import { getHighestScore } from "@/lib/evaluation-utils";

interface EvaluationListProps {
  paginatedData: any[];
  viewMode: string;
  updateStatus: (id: string, status: string) => void;
  openHistoryModal: (ev: any) => void;
  openViewingModal: (ev: any) => void;
  handleEdit: (ev: any) => void;
  handleDelete: (id: string) => void;
  copyEvalLink: (id: string) => void;
  onRemind: (id: string) => void;
  isAdmin?: boolean;
  creatorsById?: Record<string, string>;
}

export const EvaluationList = ({
  paginatedData,
  viewMode,
  updateStatus,
  openHistoryModal,
  openViewingModal,
  handleEdit,
  handleDelete,
  copyEvalLink,
  onRemind,
  isAdmin,
  creatorsById,
}: EvaluationListProps) => {
  return (
    <AnimatePresence mode="wait">
      {paginatedData.length > 0 ? (
        viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6"
          >
            <AnimatePresence>
              {paginatedData.map((ev) => {
                const isMultiVendor = ev.vendors && ev.vendors.length > 1;
                const displayVendorName = isMultiVendor
                  ? `مقارنة عروض (${ev.vendors.length} موردين)`
                  : ev.vendors?.[0]?.name || ev.vendorName;
                const highestScore = getHighestScore(ev);

                let statusStyle = "text-orange-700 bg-orange-100 border-orange-200";
                let statusText = "بانتظار التقييم";
                let StatusIcon = Clock;

                if (ev.status === "EVALUATED") {
                  if (ev.type === "VENDOR_PERFORMANCE") {
                    statusStyle = "text-green-800 bg-green-100 border-green-200";
                    statusText = "تم التقييم";
                    StatusIcon = CheckCircle2;
                  } else {
                    statusStyle = "text-blue-800 bg-blue-100 border-blue-200";
                    statusText = "بانتظار مراجعة المشتريات";
                    StatusIcon = AlertCircle;
                  }
                } else if (ev.status === "AWAITING_JUSTIFICATION") {
                  statusStyle = "text-purple-800 bg-purple-100 border-purple-200";
                  statusText = "بانتظار تبرير P.M";
                  StatusIcon = Users;
                } else if (ev.status === "APPROVED") {
                  statusStyle = "text-green-800 bg-green-100 border-green-200";
                  statusText = "مكتمل ومعتمد";
                  StatusIcon = CheckCircle2;
                }

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={ev.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col group relative overflow-hidden transition-all hover:shadow-md hover:border-gray-300"
                  >
                    <div className={`h-1.5 w-full rounded-t-xl ${ev.type === "EVF" ? "bg-[#C5A059]" : "bg-[#0D4435]"}`}></div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${ev.type === "EVF" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-blue-50 text-blue-700 border-blue-100"}`}>
                            {ev.type === "EVF" ? "تقييم EVF" : "مطابقة عامة"}
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {ev.prNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openHistoryModal(ev)} className="text-gray-400 hover:text-purple-600 transition-colors" title="سجل الطلب والتواريخ">
                            <History size={16} />
                          </button>
                          <button onClick={() => openViewingModal(ev)} className="text-gray-400 hover:text-[#0D4435] transition-colors" title="إطلاع التفاصيل">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => handleEdit(ev)} className="text-gray-400 hover:text-[#C5A059] transition-colors" title="تعديل">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => copyEvalLink(ev.id)} className="text-gray-400 hover:text-blue-600 transition-colors" title="نسخ الرابط">
                            <LinkIcon size={16} />
                          </button>
                          <button onClick={() => onRemind(ev.id)} className="text-gray-400 hover:text-amber-600 transition-colors" title="تذكير">
                            <Bell size={16} />
                          </button>
                          {isAdmin && (
                            <button onClick={() => handleDelete(ev.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="حذف">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-[#222222] text-lg leading-snug line-clamp-2 mb-3" title={ev.projectName}>
                        {ev.projectName}
                      </h3>
                      {isAdmin && creatorsById?.[ev.createdBy] && (
                        <div className="mb-3 text-[11px] font-bold text-gray-500 flex items-center gap-1">
                          <User size={12} /> بواسطة: <span className="text-gray-700">{creatorsById[ev.createdBy]}</span>
                        </div>
                      )}
                      {ev.deadline && (
                        <div className="mb-3 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded inline-flex items-center gap-1 w-fit border border-red-100">
                          <Clock size={12} /> ينتهي في: {ev.deadline.split('T')[0]}
                        </div>
                      )}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                          <span className="font-bold truncate text-xs" title={displayVendorName}>
                            {displayVendorName}
                          </span>
                          <Briefcase size={16} className="text-gray-400 shrink-0" />
                        </div>

                        <div className="flex items-end justify-between pt-4 border-t border-gray-100 mt-auto">
                          <div className="flex flex-col items-start gap-2">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border ${statusStyle}`}>
                              <span>{statusText}</span>
                              <StatusIcon size={12} />
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {ev.type === "EVF" && (ev.status === "APPROVED" || ev.status === "EVALUATED" || ev.status === "AWAITING_JUSTIFICATION") && (
                              <div className="font-black text-xs text-[#222222] mt-1 bg-gray-100 px-2 rounded">
                                أعلى نتيجة: <span className="text-[#0D4435]">{highestScore}%</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {ev.status === "EVALUATED" && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 w-full no-print">
                            <button onClick={() => updateStatus(ev.id, 'APPROVED')} className="w-full bg-green-50 text-green-700 hover:bg-green-100 py-1.5 rounded-lg text-[11px] font-bold border border-green-100 transition-colors">
                              اعتماد نهائي
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden pb-6"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">الطلب والمشروع</th>
                    <th className="px-6 py-4">المورد</th>
                    {isAdmin && <th className="px-6 py-4">أنشأه</th>}
                    <th className="px-6 py-4 text-center">حالة التقييم</th>
                    <th className="px-6 py-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {paginatedData.map((ev) => {
                      const isMultiVendor = ev.vendors && ev.vendors.length > 1;
                      const displayVendorName = isMultiVendor ? `عروض متعددة (${ev.vendors.length} موردين)` : ev.vendors?.[0]?.name || ev.vendorName;
                      const highestScore = getHighestScore(ev);

                      let statusStyle = "text-orange-700 bg-orange-100 border-orange-200";
                      let statusText = "بانتظار التقييم";

                      if (ev.status === "EVALUATED") {
                        if (ev.type === "VENDOR_PERFORMANCE") {
                          statusStyle = "text-green-800 bg-green-100 border-green-200";
                          statusText = "تم التقييم";
                        } else {
                          statusStyle = "text-blue-800 bg-blue-100 border-blue-200";
                          statusText = "بانتظار مراجعة المشتريات";
                        }
                      } else if (ev.status === "AWAITING_JUSTIFICATION") {
                        statusStyle = "text-purple-800 bg-purple-100 border-purple-200";
                        statusText = "بانتظار تبرير P.M";
                      } else if (ev.status === "APPROVED") {
                        statusStyle = "text-green-800 bg-green-100 border-green-200";
                        statusText = "مكتمل ومعتمد";
                      }

                      return (
                        <motion.tr key={ev.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} layout className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#222222] mb-1">{ev.projectName}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">{ev.prNumber}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${ev.type === "EVF" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
                                {ev.type === "EVF" ? "EVF" : "مطابقة"}
                              </span>
                              {ev.deadline && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                                  <Clock size={10} /> {ev.deadline.split('T')[0]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-700 mb-1" title={displayVendorName}>{displayVendorName}</div>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-gray-600">{creatorsById?.[ev.createdBy] || "—"}</span>
                            </td>
                          )}
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-colors ${statusStyle}`}>{statusText}</span>
                            {ev.type === "EVF" && (ev.status === "APPROVED" || ev.status === "EVALUATED" || ev.status === "AWAITING_JUSTIFICATION") && (
                              <div className="mt-2 text-xs font-bold text-gray-600">
                                أعلى نتيجة: <span className="font-black text-[#0D4435] text-sm">{highestScore}%</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              {ev.status === "EVALUATED" && (
                                <button onClick={() => updateStatus(ev.id, 'APPROVED')} className="text-green-600 hover:text-green-800 transition-colors" title="اعتماد نهائي">
                                  <CheckCircle2 size={18} />
                                </button>
                              )}
                              <button onClick={() => openHistoryModal(ev)} className="text-gray-400 hover:text-purple-600 transition-colors" title="سجل الطلب"><History size={18} /></button>
                              <button onClick={() => copyEvalLink(ev.id)} className="text-gray-400 hover:text-blue-600 transition-colors" title="نسخ الرابط"><LinkIcon size={18} /></button>
                              <button onClick={() => onRemind(ev.id)} className="text-gray-400 hover:text-amber-600 transition-colors" title="تذكير"><Bell size={18} /></button>
                              <button onClick={() => openViewingModal(ev)} className="text-gray-400 hover:text-[#0D4435] transition-colors" title="إطلاع"><Eye size={18} /></button>
                              <button onClick={() => handleEdit(ev)} className="text-gray-400 hover:text-[#C5A059] transition-colors" title="تعديل"><Pencil size={18} /></button>
                              {isAdmin && (
                                <button onClick={() => handleDelete(ev.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="حذف"><Trash2 size={18} /></button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        )
      ) : (
        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-xl border border-gray-200 p-20 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <Search size={28} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-1">لا توجد نتائج مطابقة</h3>
          <p className="text-sm text-gray-500">جرب البحث بكلمات أخرى أو تغيير الفلاتر المحددة.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
