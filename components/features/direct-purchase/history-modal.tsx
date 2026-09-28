"use client";

import { X, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDateTime } from "@/lib/formatters";
import { DirectPurchaseRequest, STATUS_CONFIG } from "@/lib/direct-purchase-types";

interface DirectPurchaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: DirectPurchaseRequest | null;
}

type TimelineEvent = {
  date: string;
  action: string;
  user: string;
  /** Colours the dot: gold for decisions, green for the normal path. */
  isDecision?: boolean;
};

// The request row carries a timestamp per stage rather than an event log, so
// the timeline is derived from whichever of those stamps are filled in.
const buildTimeline = (req: DirectPurchaseRequest): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  if (req.created_at) {
    events.push({
      date: req.created_at,
      action: "تم إنشاء مبرر الشراء المباشر",
      user: req.requester_name || "غير معروف",
    });
  }

  if (req.dept_manager_approval_date) {
    const status = req.dept_manager_approval_status;
    events.push({
      date: req.dept_manager_approval_date,
      action:
        status === "approved"
          ? "اعتماد مدير الإدارة الطالبة"
          : status === "rejected"
            ? "رفض مدير الإدارة الطالبة"
            : status === "returned"
              ? "إرجاع الطلب للموظف للتعديل"
              : "إجراء من مدير الإدارة الطالبة",
      user: req.dept_manager_name || req.dept_manager_email || "مدير الإدارة",
      isDecision: true,
    });
  }

  if (req.assigned_specialist_name || req.assigned_specialist_email) {
    events.push({
      date: req.specialist_review_date || req.updated_at || req.created_at,
      action: "تعيين أخصائي المشتريات المكلّف",
      user: req.assigned_specialist_name || req.assigned_specialist_email || "أخصائي المشتريات",
    });
  }

  if (req.specialist_review_date) {
    events.push({
      date: req.specialist_review_date,
      action:
        req.specialist_action === "closed"
          ? "إغلاق الطلب من أخصائي المشتريات"
          : "إتمام دراسة ومطابقة أخصائي المشتريات",
      user: req.assigned_specialist_name || "أخصائي المشتريات",
      isDecision: true,
    });
  }

  if (req.committee_submitted_at) {
    events.push({
      date: req.committee_submitted_at,
      action: "رفع محضر لجنة الشراء المباشر",
      user: "أمين سر اللجنة",
    });
  }

  if (req.committee_completed_at) {
    events.push({
      date: req.committee_completed_at,
      action: "اكتمال توصية اللجنة",
      user: "لجنة الشراء المباشر",
      isDecision: true,
    });
  }

  if (req.executive_approval_date) {
    events.push({
      date: req.executive_approval_date,
      action:
        req.executive_decision === "rejected"
          ? "عدم اعتماد المدير العام التنفيذي"
          : "اعتماد المدير العام التنفيذي",
      user: req.executive_approver_name || "المدير العام التنفيذي",
      isDecision: true,
    });
  }

  if (req.closure_date) {
    events.push({
      date: req.closure_date,
      action: "إقفال الطلب واكتمال الدورة المستندية",
      user: req.closed_by_name || "مدير المشتريات والعقود",
      isDecision: true,
    });
  }

  // Requests approved before the executive stage existed only carry this date.
  if (req.admin_approval_date && !req.executive_approval_date && !req.closure_date) {
    events.push({
      date: req.admin_approval_date,
      action: "الاعتماد النهائي من مدير المشتريات",
      user: "مدير المشتريات والعقود",
      isDecision: true,
    });
  }

  return events
    .filter((e) => Boolean(e.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const DirectPurchaseHistoryModal = ({
  isOpen,
  onClose,
  request,
}: DirectPurchaseHistoryModalProps) => {
  if (!request) return null;

  const statusCfg = STATUS_CONFIG[request.status];
  const timeline = buildTimeline(request);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" dir="rtl">
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
                سجل الطلب والتواريخ
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 p-2 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 bg-gray-50/50 flex-1 custom-scrollbar">
              <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-right">
                <p className="text-[11px] font-bold text-gray-400 mb-1">رقم الطلب وعنوانه</p>
                <p className="text-sm font-black text-[#222222]">
                  <span className="font-mono" dir="ltr">
                    {request.request_number}
                  </span>
                  {request.pr_number && (
                    <span className="font-mono text-[#856525]" dir="ltr">
                      {" "}
                      · {request.pr_number}
                    </span>
                  )}
                </p>
                <p className="text-sm font-black text-[#222222] mt-1">{request.request_title}</p>
                {statusCfg && (
                  <span
                    className={`inline-block mt-2.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                  >
                    {statusCfg.label}
                  </span>
                )}
              </div>

              <div className="relative border-r-2 border-[#0D4435]/20 pr-6 mr-3 space-y-6 mt-6">
                {timeline.map((evt, idx) => (
                  <div key={idx} className="relative">
                    <span
                      className={`absolute -right-7.75 w-4 h-4 rounded-full border-2 border-white shadow-sm ${evt.isDecision ? "bg-[#C5A059]" : "bg-[#0D4435]"}`}
                    ></span>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="text-sm font-black text-gray-800">{evt.action}</h4>
                        <span
                          className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 shrink-0"
                          dir="ltr"
                        >
                          {formatDateTime(evt.date)}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-gray-500">
                        بواسطة:{" "}
                        <span className={evt.isDecision ? "text-[#C5A059] font-black" : "text-[#0D4435] font-black"}>
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
