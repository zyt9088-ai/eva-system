"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText, Plus, Search, Filter, Clock, CheckCircle2, AlertCircle,
  Users, Building, DollarSign, ArrowLeft, Eye, Calendar, Sparkles, Inbox
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { CreateDirectPurchaseModal } from "@/components/features/direct-purchase/create-direct-purchase-modal";
import { STATUS_CONFIG, getReasonLabels } from "@/lib/direct-purchase-types";
import { SaudiRiyalIcon } from "@/components/SaudiRiyalIcon";

export default function DirectPurchaseDashboardPage() {
  const router = useRouter();
  const { profile, isAdmin, isLoading: isProfileLoading } = useCurrentProfile();
  const { requests, isLoading: isRequestsLoading } = useDirectPurchase();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  if (isProfileLoading || isRequestsLoading) {
    return <LoadingScreen />;
  }

  // Filter requests
  let filteredRequests = requests;

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filteredRequests = filteredRequests.filter(
      (r) =>
        r.request_number?.toLowerCase().includes(term) ||
        r.request_title?.toLowerCase().includes(term) ||
        r.requester_name?.toLowerCase().includes(term) ||
        r.vendor_name?.toLowerCase().includes(term) ||
        r.department?.toLowerCase().includes(term)
    );
  }

  if (filterStatus !== "ALL") {
    filteredRequests = filteredRequests.filter((r) => {
      if (filterStatus === "PENDING_DEPT") return r.status === "pending_dept_manager";
      if (filterStatus === "SPECIALIST") return r.status === "pending_procurement_assign" || r.status === "pending_specialist_review";
      if (filterStatus === "COMMITTEE") return r.status === "pending_committee_secretary" || r.status === "pending_committee_approval" || r.status === "pending_admin_approval";
      if (filterStatus === "APPROVED") return r.status === "approved";
      if (filterStatus === "REJECTED") return r.status === "rejected" || r.status === "dept_manager_rejected" || r.status === "closed_by_specialist";
      return true;
    });
  }

  // Calculate statistics
  const totalCount = requests.length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const pendingCount = requests.filter((r) => r.status !== "approved" && r.status !== "rejected" && r.status !== "closed_by_specialist" && r.status !== "dept_manager_rejected").length;
  const highValueCount = requests.filter((r) => Number(r.estimated_cost) > 50000).length;

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

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#0D4435]/10 rounded-2xl flex items-center justify-center text-[#0D4435]">
                <FileText size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#0D4435]">إدارة الشراء المباشر</h1>
                <p className="text-sm font-bold text-gray-500 mt-0.5">
                  نماذج مبررات الشراء المباشر ومحاضر اللجنة وسلسلة الموافقات
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-12 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0"
          >
            <Plus size={18} /> إنشاء مبرر شراء مباشر
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400">إجمالي الطلبات</p>
              <p className="text-2xl font-black text-[#0D4435] mt-1">{totalCount}</p>
            </div>
            <div className="w-11 h-11 bg-[#0D4435]/10 text-[#0D4435] rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400">قيد الإجراء والمراجعة</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
            </div>
            <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400">الطلبات المعتمدة</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{approvedCount}</p>
            </div>
            <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400">طلبات اللجنة (&gt; 50 ألف)</p>
              <p className="text-2xl font-black text-[#C5A059] mt-1">{highValueCount}</p>
            </div>
            <div className="w-11 h-11 bg-yellow-50 text-[#C5A059] rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute right-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث برقم الطلب، العنوان، المورد، صاحب الطلب..."
              className="w-full h-11 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { key: "ALL", label: "عرض الكل" },
              { key: "PENDING_DEPT", label: "موافقة الإدارة" },
              { key: "SPECIALIST", label: "دراسة المشتريات" },
              { key: "COMMITTEE", label: "اللجنة / الاعتماد" },
              { key: "APPROVED", label: "معتمد" },
              { key: "REJECTED", label: "مرفوض" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === tab.key
                    ? "bg-[#0D4435] text-white shadow-sm"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
              <Inbox size={32} />
            </div>
            <h3 className="text-base font-black text-gray-700">لا توجد طلبات شراء مباشر</h3>
            <p className="text-xs font-bold text-gray-400 max-w-sm">
              يمكنك البدء بالضغط على &quot;إنشاء مبرر شراء مباشر&quot; لرفع طلب جديد.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => {
              const statusCfg = STATUS_CONFIG[req.status] || {
                label: req.status,
                bg: "bg-gray-50",
                text: "text-gray-700",
                border: "border-gray-200",
              };
              const isHigh = Number(req.estimated_cost) > 50000;

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-[#C5A059] to-[#0D4435]"></div>

                  <div>
                    {/* Header: Request number and status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-black text-[#0D4435] bg-[#0D4435]/5 px-2.5 py-1 rounded-lg border border-[#0D4435]/10">
                        {req.request_number}
                      </span>
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        {statusCfg.label}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-black text-gray-900 leading-snug mb-3 group-hover:text-[#0D4435] transition-colors line-clamp-2">
                      {req.request_title}
                    </h3>

                    {/* Info rows */}
                    <div className="space-y-2 text-xs py-3 border-t border-b border-gray-50">
                      <div className="flex items-center justify-between text-gray-600">
                        <span className="font-bold text-gray-400 flex items-center gap-1.5">
                          <Building size={13} /> الإدارة:
                        </span>
                        <span className="font-black text-gray-800">{req.department || "—"}</span>
                      </div>

                      <div className="flex items-center justify-between text-gray-600">
                        <span className="font-bold text-gray-400 flex items-center gap-1.5">
                          <Building size={13} /> المورد:
                        </span>
                        <span className="font-black text-gray-800 truncate max-w-[150px]">{req.vendor_name}</span>
                      </div>

                      <div className="flex items-start justify-between text-gray-600 gap-2">
                        <span className="font-bold text-gray-400 flex items-center gap-1.5 shrink-0 mt-0.5">
                          <Sparkles size={13} /> سبب الطلب:
                        </span>
                        <div className="flex flex-wrap justify-end gap-1">
                          {getReasonLabels(req.reason_type).map((lbl, idx) => (
                            <span key={idx} className="font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded text-[11px] border border-gray-100">
                              {lbl}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-gray-400 flex items-center gap-1.5">
                          التكلفة التقديرية:
                        </span>
                        <span className="font-black text-sm text-[#0D4435] flex items-center gap-1">
                          <span>{Number(req.estimated_cost).toLocaleString()}</span>
                          <SaudiRiyalIcon size={14} className="text-[#C5A059]" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-4 pt-3 flex items-center justify-between">
                    <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                      <Calendar size={12} /> {new Date(req.created_at).toLocaleDateString("ar-SA")}
                    </div>

                    <Link
                      href={`/direct-purchase/${req.id}`}
                      className="h-9 px-4 bg-gray-50 hover:bg-[#0D4435] text-gray-700 hover:text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm group-hover:bg-[#0D4435] group-hover:text-white"
                    >
                      <Eye size={14} /> تفاصيل ومسار الطلب <ArrowLeft size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Create Modal */}
      <CreateDirectPurchaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
