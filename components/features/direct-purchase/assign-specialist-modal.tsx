"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, UserCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { DirectPurchaseRequest } from "@/lib/direct-purchase-types";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { ModernDropdown } from "@/components/ui/modern-dropdown";
import { SaudiRiyalIcon } from "@/components/SaudiRiyalIcon";

interface AssignSpecialistModalProps {
  request: DirectPurchaseRequest;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignSpecialistModal({ request, isOpen, onClose }: AssignSpecialistModalProps) {
  const { updateRequest, isUpdating } = useDirectPurchase();
  const [selectedSpecialistId, setSelectedSpecialistId] = useState("");

  const { data: specialists = [] } = useQuery({
    queryKey: ["procurement-specialists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .in("role", ["admin", "specialist"])
        .order("full_name");
      if (error) return [];
      return data || [];
    },
  });

  const specialistOptions = specialists.map((spec: any) => ({
    value: spec.id,
    label: spec.full_name || spec.email.split("@")[0],
    badge: spec.role === "admin" ? "مدير مشتريات" : "أخصائي مشتريات",
    subLabel: spec.email,
  }));

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSpecialistId) {
      toast.error("يرجى اختيار أخصائي المشتريات");
      return;
    }

    const specialist = specialists.find((s: any) => s.id === selectedSpecialistId);

    try {
      await updateRequest({
        id: request.id,
        updates: {
          assigned_specialist_id: selectedSpecialistId,
          assigned_specialist_name: specialist?.full_name || specialist?.email,
          assigned_specialist_email: specialist?.email,
          status: "pending_specialist_review",
        },
      });

      toast.success("تم إسناد الطلب للأخصائي بنجاح");
      onClose();
    } catch (err) {
      // handled
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-md w-full flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0D4435]/10 rounded-xl flex items-center justify-center text-[#0D4435]">
              <UserCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0D4435]">إسناد الطلب لأخصائي المشتريات</h2>
              <p className="text-xs font-bold text-gray-500">{request.request_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1.5 text-xs">
            <p className="font-bold text-gray-500">عنوان الطلب: <span className="font-black text-gray-800">{request.request_title}</span></p>
            {request.pr_number && (
              <p className="font-bold text-gray-500">رقم طلب الشراء (PR): <span className="font-black text-[#0D4435] font-mono" dir="ltr">{request.pr_number}</span></p>
            )}
            <p className="font-bold text-gray-500">الإدارة الطالبة: <span className="font-black text-gray-800">{request.department}</span></p>
            <p className="font-bold text-gray-500 flex items-center gap-1">التكلفة التقديرية: <span className="font-black text-[#0D4435]">{Number(request.estimated_cost).toLocaleString()}</span> <SaudiRiyalIcon size={14} className="text-[#C5A059]" /></p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">أخصائي المشتريات المكلف *</label>
            <ModernDropdown
              value={selectedSpecialistId}
              options={specialistOptions}
              searchable
              searchPlaceholder="ابحث باسم الأخصائي أو البريد..."
              onChange={(val) => setSelectedSpecialistId(val)}
              placeholder="اختر أخصائي المشتريات..."
              className="w-full"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="h-10 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="h-10 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Send size={14} /> {isUpdating ? "جارِ الإسناد..." : "تأكيد الإسناد"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
