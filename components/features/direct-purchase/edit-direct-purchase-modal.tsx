"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, FileText, User, Building, Paperclip, Send, RotateCcw, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { ModernDropdown } from "@/components/ui/modern-dropdown";
import { REASON_TYPE_OPTIONS, DirectPurchaseRequest } from "@/lib/direct-purchase-types";
import { SaudiRiyalIcon } from "@/components/SaudiRiyalIcon";

interface EditDirectPurchaseModalProps {
  request: DirectPurchaseRequest;
  isOpen: boolean;
  onClose: () => void;
}

export function EditDirectPurchaseModal({ request, isOpen, onClose }: EditDirectPurchaseModalProps) {
  const { updateRequest, isUpdating } = useDirectPurchase();

  const [requestTitle, setRequestTitle] = useState(request.request_title || "");
  const [department, setDepartment] = useState(request.department || "إدارة المشتريات والعقود");
  const [estimatedCost, setEstimatedCost] = useState(request.estimated_cost ? String(request.estimated_cost) : "");
  const [selectedReasons, setSelectedReasons] = useState<string[]>(
    request.reason_type ? request.reason_type.split(",").map((r) => r.trim()).filter(Boolean) : ["service_continuation"]
  );
  const [scopeOfWork, setScopeOfWork] = useState(request.scope_of_work || "");
  const [justificationReason, setJustificationReason] = useState(request.justification_reason || "");
  const [impactIfRejected, setImpactIfRejected] = useState(request.impact_if_rejected || "");

  // Vendor details
  const [vendorName, setVendorName] = useState(request.vendor_name || "");
  const [vendorContactPerson, setVendorContactPerson] = useState(request.vendor_contact_person || "");
  const [vendorContactPhone, setVendorContactPhone] = useState(request.vendor_contact_phone || "");
  const [vendorContactEmail, setVendorContactEmail] = useState(request.vendor_contact_email || "");

  // Department Manager
  const [deptManagerEmail, setDeptManagerEmail] = useState(request.dept_manager_email || "");
  const [deptManagerName, setDeptManagerName] = useState(request.dept_manager_name || "");

  // Attachments
  const [attachments, setAttachments] = useState<Array<{ name: string; size?: number; dataUrl?: string; url?: string }>>(
    request.attachments || []
  );

  // Sync state whenever request changes or modal opens
  useEffect(() => {
    if (request) {
      setRequestTitle(request.request_title || "");
      setDepartment(request.department || "إدارة المشتريات والعقود");
      setEstimatedCost(request.estimated_cost ? String(request.estimated_cost) : "");
      setSelectedReasons(
        request.reason_type ? request.reason_type.split(",").map((r) => r.trim()).filter(Boolean) : ["service_continuation"]
      );
      setScopeOfWork(request.scope_of_work || "");
      setJustificationReason(request.justification_reason || "");
      setImpactIfRejected(request.impact_if_rejected || "");
      setVendorName(request.vendor_name || "");
      setVendorContactPerson(request.vendor_contact_person || "");
      setVendorContactPhone(request.vendor_contact_phone || "");
      setVendorContactEmail(request.vendor_contact_email || "");
      setDeptManagerEmail(request.dept_manager_email || "");
      setDeptManagerName(request.dept_manager_name || "");
      setAttachments(request.attachments || []);
    }
  }, [request, isOpen]);

  // Fetch employees for dept manager selector
  const { data: employees = [] } = useQuery({
    queryKey: ["employee-directory-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_directory")
        .select("id, name, department, email")
        .order("name");
      if (error) return [];
      return data || [];
    },
  });

  const employeeOptions = employees.map((emp: any) => ({
    value: emp.email,
    label: emp.name,
    badge: emp.department || "عام",
    subLabel: emp.email,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
    const newFiles: Array<{ name: string; size?: number; dataUrl?: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast.error(`الملف "${file.name}" غير مدعوم. يُسمح فقط بملفات PDF.`);
        continue;
      }

      if (file.size > MAX_SIZE) {
        toast.error(`الملف "${file.name}" يتجاوز الحد الأقصى المسموح به (20 ميغابايت).`);
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newFiles.push({
          name: file.name,
          size: file.size,
          dataUrl: dataUrl,
        });
      } catch (readErr) {
        console.error("Failed to read file", readErr);
        toast.error(`تعذر قراءة محتوى الملف "${file.name}"`);
      }
    }

    if (newFiles.length > 0) {
      setAttachments((prev) => [...prev, ...newFiles]);
      toast.success("تم إرفاق ملف PDF بنجاح");
    }
    e.target.value = "";
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const toggleReason = (val: string) => {
    if (selectedReasons.includes(val)) {
      if (selectedReasons.length > 1) {
        setSelectedReasons(selectedReasons.filter((r) => r !== val));
      } else {
        toast.info("يجب اختيار سبب واحد على الأقل");
      }
    } else {
      setSelectedReasons([...selectedReasons, val]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deptManagerEmail) {
      toast.error("يرجى اختيار مدير الإدارة المعتمد");
      return;
    }

    if (selectedReasons.length === 0) {
      toast.error("يرجى اختيار سبب واحد على الأقل للشراء المباشر");
      return;
    }

    const normalizedCost = Number(estimatedCost.replace(/,/g, "."));
    if (isNaN(normalizedCost) || normalizedCost <= 0) {
      toast.error("يرجى إدخال مبلغ تقديري صحيح");
      return;
    }

    try {
      await updateRequest({
        id: request.id,
        updates: {
          request_title: requestTitle.trim(),
          department: department.trim(),
          estimated_cost: normalizedCost,
          reason_type: selectedReasons.join(","),
          scope_of_work: scopeOfWork.trim(),
          justification_reason: justificationReason.trim(),
          impact_if_rejected: impactIfRejected.trim(),
          vendor_name: vendorName.trim(),
          vendor_contact_person: vendorContactPerson.trim() || undefined,
          vendor_contact_phone: vendorContactPhone.trim() || undefined,
          vendor_contact_email: vendorContactEmail.trim() || undefined,
          dept_manager_name: deptManagerName || undefined,
          dept_manager_email: deptManagerEmail.trim().toLowerCase(),
          attachments: attachments.length > 0 ? (attachments as any) : [],
          status: "pending_dept_manager",
          dept_manager_approval_status: "pending",
        },
      });

      toast.success("تم تحديث الطلب وإعادة إرساله لمدير الإدارة للاعتماد بنجاح");

      fetch("/api/notify-direct-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, action: "created" }),
      }).catch((err) => console.warn("Email trigger error:", err));

      onClose();
    } catch (err) {
      // handled
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0D4435]/10 rounded-xl flex items-center justify-center text-[#0D4435]">
              <RotateCcw size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0D4435]">تعديل وإعادة إرسال مبرر الشراء المباشر</h2>
              <p className="text-xs font-bold text-gray-500">{request.request_number} — {request.request_title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Manager Return Notes Banner */}
          {request.dept_manager_notes && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3 text-xs">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-amber-900 mb-1">ملاحظات وتوجيهات مدير الإدارة المطلوبة:</p>
                <p className="font-bold text-amber-800 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-amber-200">
                  {request.dept_manager_notes}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 border-b pb-2 border-gray-100">
              <User size={16} className="text-[#C5A059]" /> معلومات صاحب الطلب والإدارة
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">عنوان وموضوع الطلب *</label>
                <input
                  type="text"
                  required
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  placeholder="مثال: تجديد رخص برنامج التصميم السنوية"
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">الإدارة / القسم الطالب *</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="مثال: الإدارة العامة لتقنية المعلومات"
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">التكلفة التقديرية (شاملة الضريبة) *</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={estimatedCost}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === "") {
                        setEstimatedCost(val);
                      }
                    }}
                    placeholder="0.00"
                    className="w-full h-11 pr-4 pl-12 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400">
                    <SaudiRiyalIcon size={16} className="text-[#C5A059]" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">مدير الإدارة المعتمد للموافقة *</label>
                <ModernDropdown
                  value={deptManagerEmail}
                  options={employeeOptions}
                  searchable
                  onChange={(val) => {
                    setDeptManagerEmail(val);
                    const emp = employees.find((e: any) => e.email === val);
                    if (emp) setDeptManagerName(emp.name);
                  }}
                  placeholder="ابحث واختر مدير الإدارة..."
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">
                سبب الشراء المباشر * <span className="text-[10px] text-gray-400 font-normal">(يمكن تحديد أكثر من سبب)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {REASON_TYPE_OPTIONS.map((opt) => {
                  const isChecked = selectedReasons.includes(opt.value);
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleReason(opt.value)}
                      className={`h-11 px-3 rounded-xl border text-xs font-black flex items-center justify-between transition-all cursor-pointer ${
                        isChecked
                          ? "bg-[#0D4435]/10 border-[#0D4435] text-[#0D4435] shadow-2xs"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      <span
                        className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] border shrink-0 mr-1.5 ${
                          isChecked ? "bg-[#0D4435] border-[#0D4435] text-white" : "border-gray-300 bg-white"
                        }`}
                      >
                        {isChecked ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Details & Justifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 border-b pb-2 border-gray-100">
              <FileText size={16} className="text-[#C5A059]" /> بيانات وتفاصيل الطلب
            </h3>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">وصف الطلب ونطاق العمل *</label>
              <textarea
                required
                rows={3}
                value={scopeOfWork}
                onChange={(e) => setScopeOfWork(e.target.value)}
                placeholder="اشرح نطاق العمل والمواصفات المطلوبة بالتفصيل..."
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">سبب اختيار أسلوب الشراء المباشر *</label>
                <textarea
                  required
                  rows={3}
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  placeholder="بيّن الأسباب والمسوغات لاختيار الشراء المباشر..."
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">الأثر في حال عدم الموافقة *</label>
                <textarea
                  required
                  rows={3}
                  value={impactIfRejected}
                  onChange={(e) => setImpactIfRejected(e.target.value)}
                  placeholder="ما هي المخاطر التشغيلية أو المالية أو القانونية في حال الرفض..."
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Vendor Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 border-b pb-2 border-gray-100">
              <Building size={16} className="text-[#C5A059]" /> بيانات المورد المقترح
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">اسم المورد المقترح *</label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="مثال: شركة التميز للحلول التقنية"
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">الشخص المسؤول لدى المورد</label>
                <input
                  type="text"
                  value={vendorContactPerson}
                  onChange={(e) => setVendorContactPerson(e.target.value)}
                  placeholder="اسم مسؤول المبيعات / التواصل"
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">رقم التواصل</label>
                <input
                  type="text"
                  value={vendorContactPhone}
                  onChange={(e) => setVendorContactPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">البريد الإلكتروني للمورد</label>
                <input
                  type="email"
                  value={vendorContactEmail}
                  onChange={(e) => setVendorContactEmail(e.target.value)}
                  placeholder="sales@vendor.com"
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Attachments */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 border-b pb-2 border-gray-100">
              <Paperclip size={16} className="text-[#C5A059]" /> المرفقات الداعمة (PDF فقط — حتى 20 ميغابايت)
            </h3>

            <div className="border-2 border-dashed border-gray-200 hover:border-[#0D4435] rounded-2xl p-6 text-center transition-colors bg-gray-50/50">
              <input
                type="file"
                multiple
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                id="edit-file-upload"
                className="hidden"
              />
              <label htmlFor="edit-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#0D4435]/10 flex items-center justify-center text-[#0D4435]">
                  <Paperclip size={20} />
                </div>
                <span className="text-xs font-black text-[#0D4435]">اضغط لرفع ملفات PDF جديدة</span>
                <span className="text-[11px] font-bold text-gray-400">عروض الأسعار، مبررات الاحتكار، خطابات التوريد (بصيغة PDF حتى 20MB)</span>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-600">المرفقات الحالية:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800">
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={15} className="text-[#C5A059] shrink-0" />
                        <span className="truncate">{file.name}</span>
                        {file.size && (
                          <span className="text-[10px] text-gray-400 font-normal">
                            ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                        title="حذف المرفق"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <Send size={15} />
              {isUpdating ? "جارِ الحفظ والإرسال..." : "تأكيد التعديل وإعادة الإرسال للمدير"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
