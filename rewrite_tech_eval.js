const fs = require('fs');

const fileContent = `"use client";

import { useState, useEffect } from "react";
import { HistoryModal } from "@/components/features/evaluations/history-modal";
import { ViewingModal } from "@/components/features/evaluations/viewing-modal";
import { CreateEvalModal } from "@/components/features/evaluations/create-eval-modal";
import { StatsCards } from "@/components/features/evaluations/stats-cards";
import { FilterBar } from "@/components/features/evaluations/filter-bar";
import { EvaluationList } from "@/components/features/evaluations/evaluation-list";
import { AppHeader } from "@/components/layout/app-header";
import { DashboardHeader } from "@/components/features/evaluations/dashboard-header";
import { EvaluationTabs } from "@/components/features/evaluations/evaluation-tabs";
import { Toaster, toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useEvaluationForm } from "@/hooks/useEvaluationForm";
import { getHighestScore } from "@/lib/evaluation-utils";

export default function TechnicalEvalDashboard() {
  const router = useRouter();
  const { evaluations, isLoaded, saveEvaluation, deleteEvaluation, updateStatus } = useEvaluations();
  
  const evalFormState = useEvaluationForm(evaluations, null, saveEvaluation);
  const {
    form, setForm, step, setStep, editingEval, setEditingEval, isModalOpen, setIsModalOpen,
    evfTemplates, setEvfTemplates, newTemplateName, setNewTemplateName, selectedTemplateId, setSelectedTemplateId,
    handleVendorChange, addVendor, removeVendor, handleItemChange, addItem, removeItem,
    handleEvfChange, addEvfItem, removeEvfItem, currentTotalWeight, handleSaveTemplate, handleLoadTemplate,
    handleEvaluatorChange, handleSetPM, addEvaluator, removeEvaluator, handleCreateRequest, handleFinalSave,
    handleEdit, openCreateModal
  } = evalFormState;

  const [viewingEval, setViewingEval] = useState(null);
  const [activeVendorTab, setActiveVendorTab] = useState(0);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyEval, setHistoryEval] = useState(null);

  const [activeTab, setActiveTab] = useState("ALL");
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    let isMounted = true;
    const savedTemplates = localStorage.getItem("ladun_evf_templates");
    if (savedTemplates && isMounted) setEvfTemplates(JSON.parse(savedTemplates));
    return () => { isMounted = false; };
  }, [setEvfTemplates]);

  useEffect(() => {
    localStorage.setItem("ladun_evf_templates", JSON.stringify(evfTemplates));
  }, [evfTemplates]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy, activeTab]);

  const copyEvalLink = (id) => {
    navigator.clipboard.writeText(\`\${window.location.origin}/eval/\${id}\`);
    toast.success("تم نسخ الرابط بنجاح للمشاركة");
  };

  const openHistoryModal = (ev) => {
    setHistoryEval(ev);
    setIsHistoryModalOpen(true);
  };

  const openViewingModal = (ev) => {
    setViewingEval(ev);
    setActiveVendorTab(0);
  };

  const generateTimeline = (ev) => {
    let events = [];
    if (ev.history) events.push(...ev.history);
    else events.push({ date: ev.createdAt || ev.date, action: "إنشاء الطلب القديم", user: "مدير النظام" });

    if (ev.itemEvaluations) {
      Object.keys(ev.itemEvaluations).forEach((idx) => {
        const evalData = ev.itemEvaluations[idx];
        const evaluatorName = ev.evaluators?.[idx]?.name || \`مقيم \${parseInt(idx) + 1}\`;
        if (evalData.timestamp) {
          events.push({ date: evalData.timestamp, action: "اكتمل التقييم واعتماد من قبل العضو", user: evaluatorName, isEval: true });
        }
      });
    }
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const handleExportCSV = () => {
    toast.success("تم تصدير التقرير بنجاح");
  };

  let filteredAndSortedData = activeTab === "ALL" ? evaluations : evaluations.filter((ev) => ev.type === activeTab);
  
  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    filteredAndSortedData = filteredAndSortedData.filter((ev) => {
      const vendorNames = ev.vendors ? ev.vendors.map((v) => v.name).join(" ") : ev.vendorName || "";
      return (
        ev.projectName?.toLowerCase().includes(lower) ||
        vendorNames.toLowerCase().includes(lower) ||
        ev.prNumber?.toLowerCase().includes(lower)
      );
    });
  }
  
  if (filterStatus !== "ALL") {
    filteredAndSortedData = filteredAndSortedData.filter((ev) => {
      if (filterStatus === "PENDING") return ev.status === "PENDING";
      if (filterStatus === "EVALUATED") return ev.status === "EVALUATED";
      if (filterStatus === "AWAITING_JUSTIFICATION") return ev.status === "AWAITING_JUSTIFICATION";
      if (filterStatus === "APPROVED") return ev.status === "APPROVED";
      return true;
    });
  }
  
  filteredAndSortedData.sort((a, b) => {
    if (sortBy === "newest") return new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime();
    if (sortBy === "score_high") return parseFloat(getHighestScore(b)) - parseFloat(getHighestScore(a));
    return 0;
  });

  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedData = filteredAndSortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statsTotalCount = evaluations.length;
  const statsEvfCount = evaluations.filter((ev) => ev.type === "EVF").length;
  const statsGeneralCount = evaluations.filter((ev) => ev.type === "GENERAL").length;
  const statsApprovedCount = evaluations.filter((ev) => ev.status === "APPROVED").length;
  const progressPercentage = statsTotalCount === 0 ? 0 : Math.round((statsApprovedCount / statsTotalCount) * 100);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-gray-50/30 flex flex-col print:bg-white" dir="rtl">
      <Toaster position="top-center" richColors />

      <style dangerouslySetInnerHTML={{
        __html: \`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Cairo', sans-serif !important; }
        body, main { padding-top: 0 !important; margin-top: 0 !important; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
        @media print { .no-print { display: none !important; } body { background: white !important; } }
      \`}} />

      <AppHeader />

      <main className="flex-1 pb-20 pt-8 px-4 md:px-6 container mx-auto w-full">
        <DashboardHeader handleExportCSV={handleExportCSV} openCreateModal={openCreateModal} />
        
        <StatsCards 
          statsTotalCount={statsTotalCount}
          statsEvfCount={statsEvfCount}
          statsGeneralCount={statsGeneralCount}
          progressPercentage={progressPercentage}
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-8 mb-6 no-print">
          <EvaluationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <FilterBar
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filterOptions={[
              { label: "جميع الحالات", value: "ALL" },
              { label: "بانتظار التقييم", value: "PENDING" },
              { label: "بانتظار المراجعة", value: "EVALUATED" },
              { label: "مكتمل ومعتمد", value: "APPROVED" },
            ]}
            sortOptions={[
              { label: "الأحدث ترتيباً", value: "newest" },
              { label: "الأعلى تقييماً", value: "score_high" },
            ]}
          />
        </div>

        <EvaluationList
          paginatedData={paginatedData}
          viewMode={viewMode}
          openViewingModal={openViewingModal}
          handleEdit={handleEdit}
          deleteEvaluation={deleteEvaluation}
          copyEvalLink={copyEvalLink}
          openHistoryModal={openHistoryModal}
        />

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2 no-print">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={\`w-10 h-10 rounded-lg text-sm font-bold transition-all \${
                  currentPage === i + 1
                    ? "bg-[#0D4435] text-white shadow-md scale-110"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }\`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        <HistoryModal 
          isOpen={isHistoryModalOpen} 
          onClose={() => setIsHistoryModalOpen(false)} 
          historyEval={historyEval} 
          generateTimeline={generateTimeline} 
        />

        <CreateEvalModal
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          step={step}
          setStep={setStep}
          editingEval={editingEval}
          form={form}
          setForm={setForm}
          evfTemplates={evfTemplates}
          setEvfTemplates={setEvfTemplates}
          newTemplateName={newTemplateName}
          setNewTemplateName={setNewTemplateName}
          selectedTemplateId={selectedTemplateId}
          setSelectedTemplateId={setSelectedTemplateId}
          handleVendorChange={handleVendorChange}
          addVendor={addVendor}
          removeVendor={removeVendor}
          handleItemChange={handleItemChange}
          addItem={addItem}
          removeItem={removeItem}
          handleEvfChange={handleEvfChange}
          addEvfItem={addEvfItem}
          removeEvfItem={removeEvfItem}
          currentTotalWeight={currentTotalWeight}
          handleSaveTemplate={handleSaveTemplate}
          handleLoadTemplate={handleLoadTemplate}
          handleEvaluatorChange={handleEvaluatorChange}
          handleSetPM={handleSetPM}
          addEvaluator={addEvaluator}
          removeEvaluator={removeEvaluator}
          handleCreateRequest={handleCreateRequest}
          handleFinalSave={handleFinalSave}
        />

        <ViewingModal viewingEval={viewingEval} onClose={() => setViewingEval(null)} />
      </main>

      <footer className="py-6 px-6 lg:px-10 border-t border-gray-200 bg-white mt-auto flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
        <p className="text-sm font-black text-[#0D4435]">( برنامج تطوير وزارة الحرس الوطني )</p>
        <p className="text-sm font-black text-gray-400" dir="ltr">Powered by Eng. Yazeed Alonazi</p>
      </footer>
    </div>
  );
}
`;

fs.writeFileSync('app/tech-eval/page.jsx', fileContent);
console.log('Successfully refactored app/tech-eval/page.jsx');
