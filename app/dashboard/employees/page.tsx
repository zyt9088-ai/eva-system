"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { ArrowRight, Contact, UserPlus, Trash2, Pencil, Upload, Download, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { AppHeader } from "@/components/layout/app-header";
import { Tooltip } from "@/components/ui/tooltip";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  department: string | null;
  email: string;
}

const EMPTY_FORM = { name: "", phone: "", department: "", email: "" };

const findField = (row: Record<string, any>, keys: string[]) => {
  const foundKey = Object.keys(row).find((k) => keys.includes(k.trim().toLowerCase()));
  return foundKey ? String(row[foundKey] ?? "").trim() : "";
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function EmployeesDirectoryPage() {
  const router = useRouter();
  const { profile, isAdmin, isLoading: profileLoading } = useCurrentProfile();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!profileLoading && profile && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [profileLoading, profile, isAdmin, router]);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employee-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_directory")
        .select("id, name, phone, department, email")
        .order("name");
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!isAdmin,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["employee-directory"] });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof EMPTY_FORM) => {
      const payload = {
        name: values.name.trim(),
        phone: values.phone.trim() || null,
        department: values.department.trim() || null,
        email: values.email.trim().toLowerCase(),
      };
      if (editingEmployee) {
        const { error } = await supabase.from("employee_directory").update(payload).eq("id", editingEmployee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employee_directory").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success(editingEmployee ? "تم تحديث بيانات الموظف" : "تمت إضافة الموظف للدليل");
      setShowForm(false);
      setEditingEmployee(null);
      setForm(EMPTY_FORM);
    },
    onError: (error: any) => {
      if (error?.code === "23505") {
        toast.error("هذا البريد مسجّل مسبقًا بالدليل");
      } else {
        toast.error("حدث خطأ أثناء الحفظ");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_directory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف الموظف من الدليل");
    },
    onError: () => toast.error("حدث خطأ أثناء الحذف"),
  });

  const importMutation = useMutation({
    mutationFn: async (rows: Array<{ name: string; phone: string | null; department: string | null; email: string }>) => {
      const { error } = await supabase.from("employee_directory").upsert(rows, { onConflict: "email" });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      invalidate();
      toast.success(`تم استيراد/تحديث ${count} موظف بنجاح`);
    },
    onError: () => toast.error("حدث خطأ أثناء الاستيراد — تأكد من صيغة الملف"),
  });

  const handleEditClick = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({ name: emp.name, phone: emp.phone || "", department: emp.department || "", email: emp.email });
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEmployee(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (emp: Employee) => {
    const ok = await confirm({
      title: "حذف موظف من الدليل",
      message: `هل أنت متأكد من حذف "${emp.name}" من الدليل؟`,
      confirmLabel: "حذف",
    });
    if (ok) deleteMutation.mutate(emp.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !EMAIL_RE.test(form.email.trim())) {
      toast.error("الاسم والبريد الإلكتروني الصحيح مطلوبان");
      return;
    }
    saveMutation.mutate(form);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

        const rows = rawRows
          .map((row) => ({
            name: findField(row, ["name", "الاسم"]),
            phone: findField(row, ["phone", "الجوال", "رقم الجوال"]) || null,
            department: findField(row, ["department", "الإدارة"]) || null,
            email: findField(row, ["email", "البريد"]).toLowerCase(),
          }))
          .filter((row) => row.name && EMAIL_RE.test(row.email));

        if (rows.length === 0) {
          toast.error("لم يتم العثور على صفوف صالحة بالملف (تحتاج أعمدة Name وEmail على الأقل)");
          return;
        }
        importMutation.mutate(rows);
      } catch {
        toast.error("تعذّرت قراءة الملف — تأكد من أنه بصيغة Excel أو CSV صحيحة");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExport = () => {
    const rows = employees.map((emp) => ({
      الاسم: emp.name,
      الجوال: emp.phone || "",
      الإدارة: emp.department || "",
      البريد: emp.email,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "دليل الموظفين");
    XLSX.writeFile(workbook, "دليل_الموظفين.xlsx");
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

        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#0D4435]/10 rounded-xl flex items-center justify-center">
              <Contact size={24} className="text-[#0D4435]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#0D4435]">دليل الموظفين</h1>
              <p className="text-sm font-bold text-gray-500 mt-1">يُستخدم للبحث السريع عن المقيّمين عند إنشاء طلب تقييم</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
              className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-gray-200 hover:border-[#0D4435] text-gray-700 hover:text-[#0D4435] rounded-lg font-bold text-xs transition-all disabled:opacity-50"
            >
              <Upload size={14} /> {importMutation.isPending ? "جارِ الاستيراد..." : "استيراد إكسل"}
            </button>
            <button
              onClick={handleExport}
              disabled={employees.length === 0}
              className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-gray-200 hover:border-[#0D4435] text-gray-700 hover:text-[#0D4435] rounded-lg font-bold text-xs transition-all disabled:opacity-50"
            >
              <Download size={14} /> تصدير إكسل
            </button>
            <button
              onClick={() => (showForm ? handleCancelForm() : setShowForm(true))}
              className="inline-flex items-center gap-2 h-10 px-4 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-lg font-black text-xs transition-all active:scale-95"
            >
              {showForm ? <X size={14} /> : <UserPlus size={14} />} {showForm ? "إلغاء" : "إضافة موظف"}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="font-black text-gray-800 text-sm mb-4">
              {editingEmployee ? `تعديل بيانات "${editingEmployee.name}"` : "إضافة موظف جديد للدليل"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="الاسم الكامل"
                className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
              />
              <input
                required
                type="email"
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@mngdp.com"
                className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="رقم الجوال"
                dir="ltr"
                className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
              />
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="الإدارة"
                className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
              />
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {editingEmployee ? "حفظ التعديلات" : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-sm font-bold text-gray-400">جارِ التحميل...</div>
          ) : employees.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-gray-400">لا يوجد موظفون بالدليل بعد</div>
          ) : (
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-5 font-black text-gray-500">الاسم</th>
                  <th className="py-3 px-5 font-black text-gray-500">البريد الإلكتروني</th>
                  <th className="py-3 px-5 font-black text-gray-500">الجوال</th>
                  <th className="py-3 px-5 font-black text-gray-500">الإدارة</th>
                  <th className="py-3 px-5 font-black text-gray-500 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-5 font-bold text-gray-800">{emp.name}</td>
                    <td className="py-4 px-5 font-bold text-gray-600" dir="ltr">{emp.email}</td>
                    <td className="py-4 px-5 font-bold text-gray-600" dir="ltr">{emp.phone || "—"}</td>
                    <td className="py-4 px-5 font-bold text-gray-600">{emp.department || "—"}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-center gap-3">
                        <Tooltip content="تعديل بيانات الموظف">
                          <button onClick={() => handleEditClick(emp)} className="text-gray-400 hover:text-[#0D4435] transition-colors cursor-pointer">
                            <Pencil size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip content="حذف الموظف من الدليل">
                          <button onClick={() => handleDelete(emp)} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                            <Trash2 size={16} />
                          </button>
                        </Tooltip>
                      </div>
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
