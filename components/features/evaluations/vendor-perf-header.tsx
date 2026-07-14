import Link from "next/link";
import { ArrowRight, Download, ClipboardList, Calculator } from "lucide-react";

export function VendorPerfHeader({
  handleExportCSV,
  openCreateModal,
}: {
  handleExportCSV: () => void;
  openCreateModal: (type: "GENERAL" | "EVF" | "VENDOR_PERFORMANCE") => void;
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-[#C5A059] transition-colors mb-2"
        >
          <span>الرجوع</span> <ArrowRight size={16} className="mr-1" />
        </Link>
        <h1 className="text-3xl font-bold text-[#0D4435] tracking-tight">
          إدارة تقييم أداء الموردين
        </h1>
        <p className="text-gray-500 mt-1">
          السجل الموحد لمتابعة واعتماد تقييمات أداء الموردين بدقة.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 h-10 px-4 py-2 text-sm font-bold shadow-sm transition-all"
        >
          <span>تصدير إكسل</span> <Download size={18} />
        </button>
        <button
          onClick={() => openCreateModal("VENDOR_PERFORMANCE")}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#C5A059] text-white hover:bg-[#b08d4b] h-10 px-6 py-2 text-sm font-bold shadow-md transition-all"
        >
          <span>تقييم أداء مورد</span> <ClipboardList size={18} />
        </button>
      </div>
    </div>
  );
}
