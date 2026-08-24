"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, FileText, User, Building, DollarSign, ListFilter, HelpCircle, Paperclip, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { ModernDropdown } from "@/components/ui/modern-dropdown";
import { REASON_TYPE_OPTIONS } from "@/lib/direct-purchase-types";
import { SaudiRiyalIcon } from "@/components/SaudiRiyalIcon";

interface CreateDirectPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateDirectPurchaseModal({ isOpen, onClose }: CreateDirectPurchaseModalProps) {
  const { profile } = useCurrentProfile();
  const { createRequest, isCreating } = useDirectPurchase();

  const [requestTitle, setRequestTitle] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [department, setDepartment] = useState("إدارة المشتريات والعقود");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [selectedReasons, setSelectedReasons] = useState<string[]>(["service_continuation"]);
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [justificationReason, setJustificationReason] = useState("");
  const [impactIfRejected, setImpactIfRejected] = useState("");

  // Vendor details
  const [vendorName, setVendorName] = useState("");
  const [vendorContactPerson, setVendorContactPerson] = useState("");
  const [vendorContactPhone, setVendorContactPhone] = useState("");
  const [vendorContactEmail, setVendorContactEmail] = useState("");

  // Department Manager
  const [deptManagerEmail, setDeptManagerEmail] = useState("");
  const [deptManagerName, setDeptManagerName] = useState("");

  // Attachments
  const [attachments, setAttachments] = useState<Array<{ name: string; size?: number }>>([]);

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

      // Validate PDF format
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast.error(`الملف "${file.name}" غير مدعوم. يُسمح فقط بملفات PDF.`);
        continue;
      }

      // Validate max 20MB size
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
    // Reset file input value so user can re-upload if needed
    e.target.value = "";
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

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestTitle.trim()) {
      toast.error("يرجى كتابة وصف أو عنوان الطلب");
      return;
    }

    const cleanCost = estimatedCost.toString().replace(/,/g, ".").replace(/[^0-9.]/g, "");
    const costNum = parseFloat(cleanCost);
    if (isNaN(costNum) || costNum <= 0) {
      toast.error("يرجى إدخال تكلفة تقديرية صحيحة");
      return;
    }

    if (!deptManagerEmail) {
      toast.error("يرجى اختيار مدير الإدارة الطالبة للاعتماد");
      return;
    }

    if (!vendorName.trim()) {
      toast.error("يرجى كتابة اسم المورد المقترح");
      return;
    }

    try {
      if (selectedReasons.length === 0) {
        toast.error("يرجى اختيار سبب واحد على الأقل للشراء المباشر");
        return;
      }

      await createRequest({
        request_title: requestTitle.trim(),
        pr_number: prNumber.trim() || undefined,
        department: department.trim(),
        estimated_cost: costNum,
        reason_type: selectedReasons.join(","),
        scope_of_work: scopeOfWork.trim(),
        justification_reason: justificationReason.trim(),
        impact_if_rejected: impactIfRejected.trim(),
        vendor_name: vendorName.trim(),
        vendor_contact_person: vendorContactPerson.trim(),
        vendor_contact_phone: vendorContactPhone.trim(),
        vendor_contact_email: vendorContactEmail.trim(),
        dept_manager_name: deptManagerName || employees.find((e: any) => e.email === deptManagerEmail)?.name || deptManagerEmail,
        dept_manager_email: deptManagerEmail,
        attachments: attachments,
      });

      onClose();
    } catch (err) {
      // Error handled in hook toast
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0D4435]/10 rounded-xl flex items-center justify-center text-[#0D4435]">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#0D4435]">إنشاء مبرر شراء مباشر</h2>
              <p className="text-xs font-bold text-gray-500 mt-0.5">تعبئة نموذج مبررات الشراء المباشر وإرساله للاعتماد</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* Section 1: Basic Info */}
          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <User size={16} className="text-[#C5A059]" /> معلومات صاحب الطلب والتاريخ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">التاريخ</label>
                <input
                  type="text"
                  disabled
                  value={new Date().toLocaleDateString("ar-SA")}
                  className="w-full h-11 px-4 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">صاحب الطلب (SSO)</label>
                <input
                  type="text"
                  disabled
                  value={profile?.fullName || profile?.email || "الموظف الحالي"}
                  className="w-full h-11 px-4 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">الإدارة / القسم *</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="مثال: إدارة تقنية المعلومات"
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Request Scope and Reason */}
          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <ListFilter size={16} className="text-[#C5A059]" /> بيانات وتفاصيل الطلب
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">وصف / عنوان الطلب *</label>
                  <input
                    type="text"
                    required
                    value={requestTitle}
                    onChange={(e) => setRequestTitle(e.target.value)}
                    placeholder="مثال: تجديد رخص برنامج الحماية السنوي"
                    className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center justify-between">
                    <span>رقم الطلب (PR)</span>
                    <span className="text-[10px] font-normal text-gray-400 font-mono">PR-XXXXXX</span>
                  </label>
                  <input
                    type="text"
                    value={prNumber}
                    onChange={(e) => setPrNumber(e.target.value)}
                    placeholder="مثال: PR-1002345"
                    className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-700 block">سبب الشراء المباشر *</label>
                  <span className="text-[11px] font-bold text-gray-400">يمكنك اختيار أكثر من سبب</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {REASON_TYPE_OPTIONS.map((opt) => {
                    const isSelected = selectedReasons.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleReason(opt.value)}
                        className={`h-11 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border select-none ${
                          isSelected
                            ? "bg-[#0D4435] text-white border-[#0D4435] shadow-sm active:scale-95"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black transition-colors ${
                          isSelected ? "bg-white/20 text-white" : "border border-gray-300 text-transparent"
                        }`}>
                          ✓
                        </div>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">التكلفة التقديرية (شاملة ضريبة القيمة المضافة) *</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="مثال: 50000 أو 63155,32"
                  className="w-full h-11 pr-4 pl-16 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute left-2.5 top-2 px-2.5 py-1 bg-[#C5A059]/10 border border-[#C5A059]/25 rounded-lg flex items-center justify-center pointer-events-none select-none">
                  <SaudiRiyalIcon size={18} className="text-[#C5A059]" />
                </div>
              </div>
              {parseFloat(estimatedCost.toString().replace(/,/g, ".")) > 50000 && (
                <p className="text-[11px] font-bold text-amber-700 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={12} /> نظراً لأن المبلغ يتجاوز 50,000 ريال، سيتم تحويل الطلب تلقائياً إلى لجنة الشراء المباشر بعد مراجعة الأخصائي.
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700">وصف الطلب ونطاق العمل *</label>
                <span className="text-[11px] font-bold text-gray-400">{scopeOfWork.length} / 2000 حرف</span>
              </div>
              <textarea
                required
                maxLength={2000}
                rows={3}
                value={scopeOfWork}
                onChange={(e) => setScopeOfWork(e.target.value)}
                placeholder="تفاصيل نطاق العمل المطلوب والخدمات أو الأصناف المشمولة..."
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all resize-none"
              />
            </div>
          </div>

          {/* Section 3: Justifications */}
          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <HelpCircle size={16} className="text-[#C5A059]" /> مبررات الشراء المباشر والأثر
            </h3>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700">1/ سبب اختيار أسلوب الشراء المباشر *</label>
                <span className="text-[11px] font-bold text-gray-400">{justificationReason.length} / 2000 حرف</span>
              </div>
              <textarea
                required
                maxLength={2000}
                rows={3}
                value={justificationReason}
                onChange={(e) => setJustificationReason(e.target.value)}
                placeholder="اذكر المسوغات الفنية أو التشغيلية لاختيار هذا الأسلوب بالتحديد..."
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all resize-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700">2/ الأثر في حال عدم الموافقة *</label>
                <span className="text-[11px] font-bold text-gray-400">{impactIfRejected.length} / 2000 حرف</span>
              </div>
              <textarea
                required
                maxLength={2000}
                rows={3}
                value={impactIfRejected}
                onChange={(e) => setImpactIfRejected(e.target.value)}
                placeholder="توضيح الآثار التشغيلية أو المالية أو الزمنية على المشروع في حال عدم الترسية المباشرة..."
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all resize-none"
              />
            </div>
          </div>

          {/* Section 4: Vendor Details */}
          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Building size={16} className="text-[#C5A059]" /> تفاصيل المورد المقترح
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">اسم المورد *</label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="الاسم التجاري للمورد"
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">الشخص المسؤول لدى المورد</label>
                <input
                  type="text"
                  value={vendorContactPerson}
                  onChange={(e) => setVendorContactPerson(e.target.value)}
                  placeholder="اسم مسؤول المبيعات / التواصل"
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">رقم التواصل</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={vendorContactPhone}
                  onChange={(e) => setVendorContactPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all text-right"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">البريد الإلكتروني للمورد</label>
                <input
                  type="email"
                  dir="ltr"
                  value={vendorContactEmail}
                  onChange={(e) => setVendorContactEmail(e.target.value)}
                  placeholder="vendor@company.com"
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all text-right"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Department Manager Selection & Attachments */}
          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <User size={16} className="text-[#C5A059]" /> موافقة مدير الإدارة والمرفقات
            </h3>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">مدير الإدارة الطالبة (المعتمد) *</label>
              <ModernDropdown
                value={deptManagerEmail}
                options={employeeOptions}
                searchable
                onChange={(email) => {
                  setDeptManagerEmail(email);
                  const selectedEmp = employees.find((e: any) => e.email === email);
                  if (selectedEmp) setDeptManagerName(selectedEmp.name);
                }}
                placeholder="ابحث واختر مدير الإدارة من دليل الموظفين..."
                className="w-full"
              />
              <p className="text-[11px] font-bold text-gray-400 mt-1">
                سيصل إشعار إلى بريد المدير المختار للدخول والإقرار بالموافقة على الطلب.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                المرفقات الداعمة (ملفات PDF فقط — الحد الأقصى 20 ميغابايت) - اختياري
              </label>
              <div className="flex items-center gap-3">
                <label className="h-11 px-5 bg-white border border-gray-200 hover:border-[#0D4435] text-gray-700 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm">
                  <Paperclip size={16} /> رفع ملف PDF
                  <input type="file" accept=".pdf,application/pdf" multiple onChange={handleFileUpload} className="hidden" />
                </label>
                <span className="text-xs text-gray-400 font-bold">
                  {attachments.length === 0 ? "لم يتم إرفاق ملفات بعد" : `${attachments.length} ملفات مرفقة`}
                </span>
              </div>

              {attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700">
                      <Paperclip size={12} className="text-[#C5A059]" />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <button type="button" onClick={() => removeAttachment(idx)} className="text-gray-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="h-11 px-8 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Send size={16} /> {isCreating ? "جارِ الإرسال..." : "إرسال الطلب للاعتماد"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
