"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, UserPlus, Trash2, UserCheck, BadgeCheck, Circle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { AppHeader } from "@/components/layout/app-header";
import { Tooltip } from "@/components/ui/tooltip";
import { ModernDropdown } from "@/components/ui/modern-dropdown";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { EXECUTIVE_ROLE_OPTIONS } from "@/lib/direct-purchase-types";

interface DirectoryEntry {
  id: string;
  name: string;
  department: string | null;
  email: string;
}

export default function ExecutiveApproversPage() {
  const router = useRouter();
  const { profile, isAdmin, isLoading: profileLoading } = useCurrentProfile();
  const confirm = useConfirm();
  const { executives, addExecutive, updateExecutive, deleteExecutive } = useDirectPurchase();

  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("executive");

  useEffect(() => {
    if (!profileLoading && profile && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [profileLoading, profile, isAdmin, router]);

  const { data: employees = [] } = useQuery<DirectoryEntry[]>({
    queryKey: ["employee-directory-for-executives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_directory")
        .select("id, name, department, email")
        .order("name");
      if (error) return [];
      return data || [];
    },
    enabled: !!isAdmin,
  });

  const employeeOptions = employees.map((emp: DirectoryEntry) => ({
    value: emp.email,
    label: emp.name,
    badge: emp.department || "عام",
    subLabel: emp.email,
  }));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployeeEmail) {
      toast.error("يرجى اختيار الموظف من القائمة");
      return;
    }

    const employee = employees.find((emp: DirectoryEntry) => emp.email === selectedEmployeeEmail);
    const name = employee ? employee.name : selectedEmployeeEmail.split("@")[0];

    try {
      await addExecutive({
        name,
        email: selectedEmployeeEmail.trim().toLowerCase(),
        role: selectedRole,
      });
      setSelectedEmployeeEmail("");
      setSelectedRole("executive");
    } catch {
      // surfaced by the mutation
    }
  };

  const handleSetActive = async (id: string, name: string) => {
    try {
      await updateExecutive({ id, updates: { is_active_approver: true } });
      toast.success(`${name} هو الآن المعتمد الحالي — تصله الإشعارات ويظهر له زر الاعتماد`);
    } catch {
      // surfaced by the mutation
    }
  };

  const handleChangeRole = async (id: string, role: string) => {
    try {
      await updateExecutive({ id, updates: { role } });
    } catch {
      // surfaced by the mutation
    }
  };

  const handleDelete = async (member: { id: string; name: string }) => {
    const ok = await confirm({
      title: "حذف المعتمد",
      message: `هل أنت متأكد من حذف "${member.name}" من قائمة المعتمدين التنفيذيين؟`,
      confirmLabel: "حذف",
      danger: true,
    });
    if (ok) deleteExecutive(member.id);
  };

  if (profileLoading || !isAdmin) {
    return (
      <div
        className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-bold text-gray-400 text-sm"
        dir="rtl"
      >
        جارِ التحقق من الصلاحية...
      </div>
    );
  }

  const hasActive = executives.some((x) => x.is_active_approver);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col" dir="rtl">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Cairo', sans-serif !important; }
      `,
        }}
      />
      <AppHeader />
      <main className="flex-1 p-6 lg:p-10 max-w-4xl mx-auto w-full">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#0D4435] mb-6 transition-colors"
        >
          <ArrowRight size={16} /> رجوع
        </button>

        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-[#0D4435]/10 rounded-2xl flex items-center justify-center text-[#0D4435]">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0D4435]">المعتمدون التنفيذيون</h1>
            <p className="text-sm font-bold text-gray-500 mt-1">
              المدير العام التنفيذي ونوابه — أصحاب التوقيع النهائي على طلبات الشراء المباشر
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-[#C5A059]" /> إضافة معتمد تنفيذي
          </h2>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-center w-full">
            <div className="flex-1 min-w-0 w-full">
              <ModernDropdown
                value={selectedEmployeeEmail}
                options={employeeOptions}
                searchable
                onChange={(val) => setSelectedEmployeeEmail(val)}
                placeholder="ابحث واختر الموظف من الدليل..."
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-64 shrink-0 min-w-0">
              <ModernDropdown
                value={selectedRole}
                options={EXECUTIVE_ROLE_OPTIONS}
                onChange={(val) => setSelectedRole(val)}
                placeholder="اختر الصفة"
                className="w-full"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-sm transition-all active:scale-95 shrink-0 shadow-sm whitespace-nowrap cursor-pointer"
            >
              إضافة
            </button>
          </form>
          <p className="text-xs font-bold text-gray-400 mt-3 leading-relaxed">
            المعتمد الحالي وحده تصله إشعارات الاعتماد ويظهر له زر التوقيع. عند غياب المدير العام
            التنفيذي، اجعل أحد النواب هو المعتمد الحالي — ويعود الأمر إليه بضغطة عند رجوعه.
          </p>
        </div>

        {!hasActive && executives.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-xs font-bold text-amber-800 leading-relaxed">
            لم تحدّد المعتمد الحالي بعد. حتى تحدده، تُوجَّه الطلبات تلقائياً إلى المدير العام
            التنفيذي المسجّل في القائمة.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {executives.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-gray-400">
              لا يوجد معتمدون مضافون بعد — لن يتمكن أي طلب من تجاوز مرحلة الاعتماد النهائي
            </div>
          ) : (
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-5 font-black text-gray-500">الاسم</th>
                  <th className="py-3.5 px-5 font-black text-gray-500">البريد الإلكتروني</th>
                  <th className="py-3.5 px-5 font-black text-gray-500 w-56">الصفة</th>
                  <th className="py-3.5 px-5 font-black text-gray-500 w-40 text-center">المعتمد الحالي</th>
                  <th className="py-3.5 px-5 font-black text-gray-500 w-20 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {executives.map((x) => (
                  <tr
                    key={x.id}
                    className={`transition-colors ${
                      x.is_active_approver ? "bg-emerald-50/40" : "hover:bg-gray-50/50"
                    }`}
                  >
                    <td className="py-4 px-5 font-black text-gray-800">
                      <span className="flex items-center gap-2">
                        <UserCheck size={16} className="text-[#0D4435]" />
                        {x.name}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-bold text-gray-600" dir="ltr">
                      {x.email}
                    </td>
                    <td className="py-4 px-5">
                      <ModernDropdown
                        value={x.role}
                        options={EXECUTIVE_ROLE_OPTIONS}
                        onChange={(val) => handleChangeRole(x.id, val)}
                        placeholder="اختر الصفة"
                        className="w-full"
                      />
                    </td>
                    <td className="py-4 px-5 text-center">
                      {x.is_active_approver ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-black">
                          <BadgeCheck size={14} /> المعتمد الحالي
                        </span>
                      ) : (
                        <Tooltip content="اجعله المعتمد الحالي — يُلغى تلقائياً عن غيره">
                          <button
                            onClick={() => handleSetActive(x.id, x.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-[#0D4435] text-gray-500 hover:text-[#0D4435] rounded-lg text-xs font-black transition-all cursor-pointer"
                          >
                            <Circle size={12} /> تفويض
                          </button>
                        </Tooltip>
                      )}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <Tooltip content="حذف من قائمة المعتمدين">
                        <button
                          onClick={() => handleDelete(x)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-xs font-bold text-gray-500 leading-relaxed">
          <p className="text-gray-800 font-black mb-2 flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#C5A059]" /> ملاحظة عن الدخول
          </p>
          إضافة الشخص هنا تمنحه التوقيع على طلبات الشراء المباشر. وحتى يدخل النظام بصلاحية
          «معتمد تنفيذي»، ادعُه من شاشة{" "}
          <button
            onClick={() => router.push("/dashboard/users")}
            className="text-[#0D4435] underline underline-offset-2 font-black cursor-pointer"
          >
            إدارة المستخدمين
          </button>{" "}
          بنفس بريده — فالصلاحية تُقرأ من ملف المستخدم لا من هذه القائمة.
        </div>
      </main>
    </div>
  );
}
