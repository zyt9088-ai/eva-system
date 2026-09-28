"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, UserPlus, X, ShieldQuestion, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { AppHeader } from "@/components/layout/app-header";
import { Tooltip } from "@/components/ui/tooltip";
import { ModernDropdown } from "@/components/ui/modern-dropdown";
import { useConfirm } from "@/components/ui/confirm-dialog";

const ORG_DOMAIN = "mngdp.com";
const EMAIL_PATTERN = new RegExp(`^[^@\\s]+@${ORG_DOMAIN.replace(".", "\\.")}$`, "i");

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير مشتريات",
  specialist: "أخصائي مشتريات",
  // Signs the final approval on direct purchase requests. Who currently holds
  // the signature is set separately, in /dashboard/executive-approvers.
  executive: "معتمد تنفيذي",
};

const ROLE_OPTIONS = [
  { value: "admin", label: ROLE_LABELS.admin },
  { value: "specialist", label: ROLE_LABELS.specialist },
  { value: "executive", label: ROLE_LABELS.executive },
];

export default function UsersPage() {
  const router = useRouter();
  const { profile, isAdmin, isLoading: profileLoading } = useCurrentProfile();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (!profileLoading && profile && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [profileLoading, profile, isAdmin, router]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .in("role", ["admin", "specialist", "executive"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["pending-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_invites")
        .select("email, role, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("تم تحديث الصلاحية بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تحديث الصلاحية");
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        if (ROLE_OPTIONS.some((o) => o.value === existingProfile.role)) {
          throw { code: "ALREADY_MEMBER" };
        }
        const { error } = await supabase
          .from("profiles")
          .update({ role: "specialist" })
          .eq("id", existingProfile.id);
        if (error) throw error;
        return { type: "upgraded" };
      }

      const { error } = await supabase
        .from("pending_invites")
        .insert({ email, role: "specialist", invited_by: profile?.id });
      if (error) throw error;
      return { type: "invited" };
    },
    onSuccess: (result) => {
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
      if (result?.type === "upgraded") {
        toast.success("تمت إضافة الموظف وتعيينه أخصائي مشتريات بنجاح");
      } else {
        toast.success("تمت إضافة الحساب — سيحصل على صلاحية أخصائي مشتريات فور تسجيل دخوله لأول مرة");
      }
    },
    onError: (error: any) => {
      if (error?.code === "ALREADY_MEMBER") {
        toast.error("هذا المستخدم مضاف مسبقاً في إدارة المستخدمين");
      } else if (error?.code === "23505") {
        toast.error("هذا الحساب مضاف مسبقًا وبانتظار أول تسجيل دخول");
      } else {
        toast.error("حدث خطأ أثناء إضافة الحساب");
      }
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.from("pending_invites").delete().eq("email", email);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
      toast.success("تم إلغاء الدعوة");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("تم حذف المستخدم بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف المستخدم");
    },
  });

  const handleDeleteUser = async (u: { id: string; email: string }) => {
    const ok = await confirm({
      title: "حذف المستخدم",
      message: `هل أنت متأكد من حذف حساب "${u.email}" نهائيًا؟`,
      confirmLabel: "حذف",
    });
    if (ok) deleteUserMutation.mutate(u.id);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      toast.error(`يجب أن يكون البريد من نطاق المنظمة (@${ORG_DOMAIN}) فقط`);
      return;
    }
    inviteMutation.mutate(email);
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
          <div className="w-12 h-12 bg-[#0D4435]/10 rounded-xl flex items-center justify-center">
            <ShieldCheck size={24} className="text-[#0D4435]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0D4435]">إدارة المستخدمين والصلاحيات</h1>
            <p className="text-sm font-bold text-gray-500 mt-1">التحكم بصلاحيات المستخدمين المسجّلين عبر Microsoft 365</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-[#C5A059]" /> إضافة حساب أخصائي مشتريات جديد
          </h2>
          <form onSubmit={handleInviteSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              dir="ltr"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={`name@${ORG_DOMAIN}`}
              className="flex-1 h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
            />
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 shrink-0"
            >
              إضافة
            </button>
          </form>
          <p className="text-xs font-bold text-gray-400 mt-3">
            يُسمح فقط بحسابات نطاق المنظمة (@{ORG_DOMAIN}). الحساب المضاف يحصل تلقائيًا على صلاحية &quot;أخصائي مشتريات&quot; فور أول تسجيل دخول له عبر Microsoft.
          </p>

          {invites.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
              <p className="text-xs font-black text-gray-500 mb-2 flex items-center gap-1.5">
                <ShieldQuestion size={14} /> بانتظار أول تسجيل دخول
              </p>
              {invites.map((inv: any) => (
                <div key={inv.email} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                  <span className="text-sm font-bold text-gray-700" dir="ltr">{inv.email}</span>
                  <Tooltip content="إلغاء الدعوة">
                    <button
                      onClick={() => cancelInviteMutation.mutate(inv.email)}
                      className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-sm font-bold text-gray-400">جارِ التحميل...</div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-gray-400">لا يوجد مستخدمون بعد</div>
          ) : (
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-5 font-black text-gray-500">البريد الإلكتروني</th>
                  <th className="py-3 px-5 font-black text-gray-500">الاسم</th>
                  <th className="py-3 px-5 font-black text-gray-500">الصلاحية</th>
                  <th className="py-3 px-5 font-black text-gray-500 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-5 font-bold text-gray-800" dir="ltr">{u.email}</td>
                    <td className="py-4 px-5 font-bold text-gray-600">{u.full_name || "—"}</td>
                    <td className="py-4 px-5">
                      <ModernDropdown
                        value={u.role}
                        options={ROLE_OPTIONS}
                        onChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}
                        placeholder="اختر الصلاحية"
                        className={`w-48 ${u.id === profile?.id ? "opacity-50 pointer-events-none" : ""}`}
                      />
                    </td>
                    <td className="py-4 px-5 text-center">
                      {u.id !== profile?.id && (
                        <Tooltip content="حذف المستخدم">
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
