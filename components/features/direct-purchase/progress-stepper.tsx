"use client";

import { CheckCircle2, Clock, XCircle, AlertCircle, Users, FileCheck, ShieldAlert } from "lucide-react";
import { STATUS_CONFIG, DirectPurchaseRequest } from "@/lib/direct-purchase-types";

interface ProgressStepperProps {
  request: DirectPurchaseRequest;
}

export function ProgressStepper({ request }: ProgressStepperProps) {
  const isRejected = request.status === "rejected" || request.status === "dept_manager_rejected" || request.status === "closed_by_specialist";
  const isReturned = request.status === "returned_to_requester";
  const isApproved = request.status === "approved";
  const isHighValue = Number(request.estimated_cost) > 50000;

  const steps = [
    {
      title: "صاحب الطلب",
      desc: request.dept_manager_approval_status === "approved" ? "تم اعتماد مدير الإدارة" : "بانتظار اعتماد مدير الإدارة",
      isDone: request.dept_manager_approval_status === "approved",
      isCurrent: request.status === "pending_dept_manager" || isReturned,
    },
    {
      title: "أخصائي المشتريات",
      desc: request.assigned_specialist_name ? `المكلف: ${request.assigned_specialist_name}` : "بانتظار التعيين",
      isDone: !!request.specialist_action && request.specialist_action !== "returned",
      isCurrent: request.status === "pending_procurement_assign" || request.status === "pending_specialist_review",
    },
    {
      title: isHighValue ? "لجنة الشراء المباشر" : "مدير المشتريات",
      desc: isHighValue ? "دراسة ومحضر اللجنة" : "الاعتماد المباشر",
      isDone: isApproved,
      isCurrent: request.status === "pending_committee_secretary" || request.status === "pending_committee_approval" || request.status === "pending_admin_approval",
    },
    {
      title: "الاعتماد النهائي",
      desc: isApproved ? "مكتمل ومعتمد" : isRejected ? "مرفوض" : "بانتظار استكمال الإجراءات",
      isDone: isApproved,
      isCurrent: isApproved || isRejected,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
          <Clock size={16} className="text-[#0D4435]" /> مسار وتتبع الطلب
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-black border ${STATUS_CONFIG[request.status]?.bg || 'bg-gray-50'} ${STATUS_CONFIG[request.status]?.text || 'text-gray-700'} ${STATUS_CONFIG[request.status]?.border || 'border-gray-200'}`}>
          {STATUS_CONFIG[request.status]?.label || request.status}
        </div>
      </div>

      <div className="relative flex flex-col md:flex-row justify-between gap-4">
        {steps.map((step, index) => {
          let stepBg = "bg-gray-100 text-gray-400 border-gray-200";
          let icon = <span className="text-xs font-black">{index + 1}</span>;

          if (step.isDone) {
            stepBg = "bg-emerald-500 text-white border-emerald-600 shadow-sm";
            icon = <CheckCircle2 size={16} />;
          } else if (step.isCurrent) {
            if (isRejected) {
              stepBg = "bg-red-500 text-white border-red-600 shadow-sm";
              icon = <XCircle size={16} />;
            } else if (isReturned) {
              stepBg = "bg-orange-500 text-white border-orange-600 shadow-sm";
              icon = <AlertCircle size={16} />;
            } else {
              stepBg = "bg-[#0D4435] text-white border-[#0D4435] shadow-sm animate-pulse";
              icon = <Clock size={16} />;
            }
          }

          return (
            <div key={index} className="flex-1 flex md:flex-col items-center md:text-center gap-3 relative z-10">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border font-black shrink-0 transition-all ${stepBg}`}>
                {icon}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-gray-900">{step.title}</p>
                <p className="text-[11px] font-bold text-gray-500 mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
