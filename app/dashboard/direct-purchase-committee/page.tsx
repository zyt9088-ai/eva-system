"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Users, UserPlus, Trash2, Edit3, UserCheck, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { AppHeader } from "@/components/layout/app-header";
import { ModernDropdown } from "@/components/ui/modern-dropdown";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { COMMITTEE_ROLE_OPTIONS, COMMITTEE_ROLE_LABELS } from "@/lib/direct-purchase-types";

export default function DirectPurchaseCommitteePage() {
  const router = useRouter();
  const { profile, isAdmin, isLoading: profileLoading } = useCurrentProfile();
  const confirm = useConfirm();
  const { committee, addCommitteeMember, updateCommitteeMember, deleteCommitteeMember } = useDirectPurchase();

  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("member");
  const [customRoleText, setCustomRoleText] = useState("");

  // Edit Modal State
  const [editingMember, setEditingMember] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [editRole, setEditRole] = useState<string>("member");
  const [editCustomRole, setEditCustomRole] = useState<string>("");

  useEffect(() => {
    if (!profileLoading && profile && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [profileLoading, profile, isAdmin, router]);

  // Fetch employees for autocomplete picker
  const { data: employees = [] } = useQuery({
    queryKey: ["employee-directory-for-committee"],
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

  const employeeOptions = employees.map((emp: any) => ({
    value: emp.email,
    label: emp.name,
    badge: emp.department || "عام",
    subLabel: emp.email,
  }));

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployeeEmail) {
      toast.error("يرجى اختيار الموظف من القائمة");
      return;
    }

    const finalRole = selectedRole === "other" ? customRoleText.trim() : selectedRole;
    if (!finalRole) {
      toast.error("يرجى كتابة المسمى المخصص للمنصب");
      return;
    }

    const employee = employees.find((e: any) => e.email === selectedEmployeeEmail);
    const memberName = employee ? employee.name : selectedEmployeeEmail.split("@")[0];

    try {
      await addCommitteeMember({
        name: memberName,
        email: selectedEmployeeEmail.trim().toLowerCase(),
        role: finalRole,
      });

      setSelectedEmployeeEmail("");
      setSelectedRole("member");
      setCustomRoleText("");
    } catch (err) {
      // handled
    }
  };

  const handleOpenEdit = (m: { id: string; name: string; email: string; role: string }) => {
    setEditingMember(m);
    const isStandardRole = ["chair", "vice_chair", "member", "reserve_member", "secretary"].includes(m.role);
    if (isStandardRole) {
      setEditRole(m.role);
      setEditCustomRole("");
    } else {
      setEditRole("other");
      setEditCustomRole(m.role);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const finalRole = editRole === "other" ? editCustomRole.trim() : editRole;
    if (!finalRole) {
      toast.error("يرجى كتابة المسمى المخصص للمنصب");
      return;
    }

    try {
      await updateCommitteeMember({
        id: editingMember.id,
        updates: { role: finalRole },
      });
      setEditingMember(null);
    } catch (err) {
      // handled
    }
  };

  const handleDelete = async (member: { id: string; name: string }) => {
    const ok = await confirm({
      title: "حذف عضو اللجنة",
      message: `هل أنت متأكد من حذف "${member.name}" من تشكيل لجنة الشراء المباشر؟`,
      confirmLabel: "حذف",
    });
    if (ok) {
      deleteCommitteeMember(member.id);
    }
  };

  if (profileLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-bold text-gray-400 text-sm" dir="rtl">
        جارِ التحقق من الصلاحية...
      </div>
    );
  }

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
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#0D4435] mb-6 transition-colors">
          <ArrowRight size={16} /> رجوع
        </button>

        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-[#0D4435]/10 rounded-2xl flex items-center justify-center text-[#0D4435]">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0D4435]">لجنة الشراء المباشر</h1>
            <p className="text-sm font-bold text-gray-500 mt-1">تشكيل وتحديد أعضاء لجنة الشراء المباشر ومناصبهم المعتمدة</p>
          </div>
        </div>

        {/* Add Member Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-[#C5A059]" /> إضافة عضو إلى لجنة الشراء المباشر
          </h2>
          <form onSubmit={handleAddMember} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
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
              <div className="w-full sm:w-56 shrink-0 min-w-0">
                <ModernDropdown
                  value={selectedRole}
                  options={COMMITTEE_ROLE_OPTIONS}
                  onChange={(val) => setSelectedRole(val)}
                  placeholder="اختر المنصب"
                  className="w-full"
                />
              </div>
              <button
                type="submit"
                className="h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-sm transition-all active:scale-95 shrink-0 shadow-sm whitespace-nowrap cursor-pointer"
              >
                إضافة للجنة
              </button>
            </div>

            {selectedRole === "other" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-1"
              >
                <input
                  type="text"
                  required
                  value={customRoleText}
                  onChange={(e) => setCustomRoleText(e.target.value)}
                  placeholder="اكتب المسمى المخصص للمنصب (مثال: أمين بالنيابة، عضو مؤقت)..."
                  className="w-full h-11 px-4 bg-white border border-[#C5A059] rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-1 focus:ring-[#0D4435]"
                />
              </motion.div>
            )}
          </form>
          <p className="text-xs font-bold text-gray-400 mt-3">
            المناصب المتاحة: رئيس اللجنة، نائب رئيس اللجنة، عضو اللجنة، عضو احتياط، أمين اللجنة، أو منصب مخصص بالنيابة.
          </p>
        </div>

        {/* Committee List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {committee.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-gray-400">لا يوجد أعضاء مضافون في اللجنة بعد</div>
          ) : (
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-5 font-black text-gray-500">اسم العضو</th>
                  <th className="py-3.5 px-5 font-black text-gray-500">البريد الإلكتروني</th>
                  <th className="py-3.5 px-5 font-black text-gray-500">المنصب باللجنة</th>
                  <th className="py-3.5 px-5 font-black text-gray-500 w-28 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {committee.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-5 font-black text-gray-800 flex items-center gap-2">
                      <UserCheck size={16} className="text-[#0D4435]" />
                      {m.name}
                    </td>
                    <td className="py-4 px-5 font-bold text-gray-600" dir="ltr">{m.email}</td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center px-3 py-1 bg-[#0D4435]/10 text-[#0D4435] border border-[#0D4435]/15 rounded-lg text-xs font-black">
                        {COMMITTEE_ROLE_LABELS[m.role] || m.role}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="text-gray-400 hover:text-[#0D4435] transition-colors p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
                          title="تعديل المنصب"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                          title="حذف من اللجنة"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Edit Member Modal */}
        <AnimatePresence>
          {editingMember && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-[#0D4435]/10 rounded-xl flex items-center justify-center text-[#0D4435]">
                      <Edit3 size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#0D4435]">تعديل منصب عضو اللجنة</h3>
                      <p className="text-xs font-bold text-gray-500">{editingMember.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingMember(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">البريد الإلكتروني</label>
                    <input
                      type="text"
                      disabled
                      value={editingMember.email}
                      className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">المنصب في اللجنة *</label>
                    <ModernDropdown
                      value={editRole}
                      options={COMMITTEE_ROLE_OPTIONS}
                      onChange={(val) => setEditRole(val)}
                      placeholder="اختر المنصب"
                      className="w-full"
                    />
                  </div>

                  {editRole === "other" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">المسمى المخصص *</label>
                      <input
                        type="text"
                        required
                        value={editCustomRole}
                        onChange={(e) => setEditCustomRole(e.target.value)}
                        placeholder="مثال: أمين بالنيابة، رئيس بالإنابة..."
                        className="w-full h-11 px-4 bg-white border border-[#C5A059] rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-1 focus:ring-[#0D4435]"
                      />
                    </motion.div>
                  )}

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditingMember(null)}
                      className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-xs transition-all active:scale-95 shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={15} />
                      <span>حفظ التعديل</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
