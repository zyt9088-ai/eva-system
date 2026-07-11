"use client";

import { useState, useEffect, useRef } from "react";
import { HistoryModal } from "@/components/features/evaluations/history-modal";
import { ViewingModal } from "@/components/features/evaluations/viewing-modal";
import { CreateEvalModal } from "@/components/features/evaluations/create-eval-modal";
import { ModernDropdown } from "@/components/ui/modern-dropdown";
import { StatsCards } from "@/components/features/evaluations/stats-cards";
import { FilterBar } from "@/components/features/evaluations/filter-bar";
import { EvaluationList } from "@/components/features/evaluations/evaluation-list";
import {
  ArrowRight,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Trash2,
  Pencil,
  Eye,
  Calculator,
  ClipboardList,
  LayoutGrid,
  List,
  Briefcase,
  Clock,
  Users,
  Search,
  Filter,
  Download,
  ChevronRight,
  ChevronLeft,
  Printer,
  Tag,
  Paperclip,
  History,
  Save,
  Bookmark,
  LogOut,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { useRouter } from "next/navigation";

const inputClasses =
  "w-full h-11 bg-white border border-gray-300 rounded-lg px-4 text-sm font-semibold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all placeholder:text-gray-400 shadow-sm";
const labelClasses = "block text-sm font-bold text-gray-700 mb-1.5 text-right";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#0D4435] text-white hover:bg-[#0a3529] h-11 px-6 text-sm font-bold shadow-sm transition-all active:scale-95";

const getSafeScore = (itemEvals, evalIdx, vendorIdx, critIdx) => {
  if (!itemEvals) return undefined;
  const evalData = itemEvals[evalIdx];
  if (!evalData) return undefined;
  if (evalData.evals && evalData.evals[vendorIdx]) {
    return evalData.evals[vendorIdx][critIdx]?.score;
  }
  if (vendorIdx === 0 && evalData[critIdx]) return evalData[critIdx].score;
  return undefined;
};

const getSafeReason = (itemEvals, evalIdx, vendorIdx, critIdx) => {
  if (!itemEvals) return null;
  const evalData = itemEvals[evalIdx];
  if (!evalData) return null;
  if (evalData.evals && evalData.evals[vendorIdx]) {
    return evalData.evals[vendorIdx][critIdx]?.reason;
  }
  return null;
};

const getSafeEvalStatus = (itemEvals, evalIdx, vendorIdx, itemIdx) => {
  if (!itemEvals) return null;
  const evalData = itemEvals[evalIdx];
  if (!evalData) return null;
  if (evalData.evals && evalData.evals[vendorIdx]) {
    return evalData.evals[vendorIdx][itemIdx];
  }
  if (vendorIdx === 0 && evalData[itemIdx]) return evalData[itemIdx];
  return null;
};

const calculateEvfAveragesForVendor = (evalData, vendorIdx) => {
  if (evalData.type !== "EVF" || !evalData.evfCriteria)
    return { criteria: [], total: 0 };
  let totalScore = 0;
  const evaluatorsList = evalData.evaluators?.length
    ? evalData.evaluators
    : [{ name: evalData.evaluatorName || "مقيم 1" }];

  const criteriaStats = evalData.evfCriteria.map((crit, critIndex) => {
    let sum = 0;
    let count = 0;
    evaluatorsList.forEach((_, evalIndex) => {
      const score = getSafeScore(
        evalData.itemEvaluations,
        evalIndex,
        vendorIdx,
        critIndex,
      );
      if (score !== undefined && score !== "") {
        sum += parseFloat(score);
        count++;
      }
    });
    const avgScore = count > 0 ? sum / count : 0;
    const weightedScore = (avgScore / 10) * parseFloat(crit.weight);
    totalScore += weightedScore;
    return {
      avgScore: avgScore.toFixed(2),
      weightedScore: weightedScore.toFixed(2),
    };
  });
  return { criteria: criteriaStats, total: totalScore.toFixed(2) };
};

const getFinalStatusForVendor = (evalData, vendorIdx) => {
  if (evalData.type !== "GENERAL" || !evalData.evaluatedItems)
    return "قيد التقييم";
  let yesCount = 0;
  let noCount = 0;
  let evaluatedCountTotal = 0;
  const evaluatorsList = evalData.evaluators?.length
    ? evalData.evaluators
    : [{ name: "مقيم 1" }];

  evalData.evaluatedItems.forEach((_, itemIdx) => {
    evaluatorsList.forEach((_, evIdx) => {
      const st = getSafeEvalStatus(
        evalData.itemEvaluations,
        evIdx,
        vendorIdx,
        itemIdx,
      );
      if (st) {
        evaluatedCountTotal++;
        if (st.status === "YES") yesCount++;
        if (st.status === "NO") noCount++;
      }
    });
  });

  const expectedTotal = evalData.evaluatedItems.length * evaluatorsList.length;
  if (evaluatedCountTotal < expectedTotal) return "قيد التقييم";

  if (noCount === 0) return "مطابق كلياً";
  if (yesCount === 0) return "غير مطابق";
  return "مطابق جزئياً";
};

const getHighestScore = (ev) => {
  if (ev.type !== "EVF") return 0;
  const vendorsList = ev.vendors?.length
    ? ev.vendors
    : [{ name: ev.vendorName }];
  let maxScore = 0;
  vendorsList.forEach((_, vIdx) => {
    const s = parseFloat(calculateEvfAveragesForVendor(ev, vIdx).total);
    if (s > maxScore) maxScore = s;
  });
  return maxScore.toFixed(2);
};

const formatDateTime = (isoString) => {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return (
    d.toLocaleDateString("ar-SA") +
    " " +
    d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
  );
};


export default function TechnicalEvalDashboard() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [evfTemplates, setEvfTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [editingEval, setEditingEval] = useState(null);

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

  const [form, setForm] = useState({
    prNumber: "",
    projectName: "",
    deadline: "",
    type: "GENERAL",
    vendors: [{ name: "", attachmentName: "" }],
    evaluatedItems: [""],
    evfCriteria: [{ title: "", weight: "" }],
    evaluators: [{ name: "", email: "", isPM: true }],
  });

  const filterOptions = [
    { label: "جميع الحالات", value: "ALL" },
    { label: "بانتظار التقييم", value: "PENDING" },
    { label: "بانتظار المراجعة", value: "EVALUATED" },
    { label: "مكتمل ومعتمد", value: "APPROVED" },
  ];

  const sortOptions = [
    { label: "الأحدث ترتيباً", value: "newest" },
    { label: "الأعلى تقييماً", value: "score_high" },
  ];

  useEffect(() => {
    // @ts-ignore
    const handleClickOutside = (event) => {
      // @ts-ignore
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    router.push("/");
  };

  useEffect(() => {
    let isMounted = true;
    const saved = localStorage.getItem("ladun_workflow_evals");
    if (saved && isMounted) setEvaluations(JSON.parse(saved));

    const savedTemplates = localStorage.getItem("ladun_evf_templates");
    if (savedTemplates && isMounted)
      setEvfTemplates(JSON.parse(savedTemplates));

    const timer = setTimeout(() => {
      if (isMounted) setIsLoaded(true);
    }, 100);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("ladun_workflow_evals", JSON.stringify(evaluations));
      localStorage.setItem("ladun_evf_templates", JSON.stringify(evfTemplates));
    }
  }, [evaluations, evfTemplates, isLoaded]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy, activeTab]);

  // @ts-ignore
  const handleVendorChange = (index, field, value) => {
    const newVendors = [...form.vendors];
    // @ts-ignore
    newVendors[index][field] = value;
    setForm({ ...form, vendors: newVendors });
  };
  const addVendor = () =>
    setForm({
      ...form,
      vendors: [...form.vendors, { name: "", attachmentName: "" }],
    });
  // @ts-ignore
  const removeVendor = (index) => {
    const newVendors = form.vendors.filter((_, i) => i !== index);
    setForm({
      ...form,
      vendors: newVendors.length
        ? newVendors
        : [
            {
              name: "",
              attachmentName: "",
            },
          ],
    });
  };

  // @ts-ignore
  const handleItemChange = (index, value) => {
    const newItems = [...form.evaluatedItems];
    newItems[index] = value;
    setForm({ ...form, evaluatedItems: newItems });
  };
  const addItem = () =>
    setForm({ ...form, evaluatedItems: [...form.evaluatedItems, ""] });
  // @ts-ignore
  const removeItem = (index) => {
    const newItems = form.evaluatedItems.filter((_, i) => i !== index);
    setForm({ ...form, evaluatedItems: newItems.length ? newItems : [""] });
  };

  // @ts-ignore
  const handleEvfChange = (index, field, value) => {
    const newCriteria = [...form.evfCriteria];
    // @ts-ignore
    newCriteria[index][field] = value;
    setForm({ ...form, evfCriteria: newCriteria });
  };
  const addEvfItem = () =>
    setForm({
      ...form,
      evfCriteria: [...form.evfCriteria, { title: "", weight: "" }],
    });
  // @ts-ignore
  const removeEvfItem = (index) => {
    const newCriteria = form.evfCriteria.filter((_, i) => i !== index);
    setForm({
      ...form,
      evfCriteria: newCriteria.length
        ? newCriteria
        : [{ title: "", weight: "" }],
    });
  };
  const currentTotalWeight = form.evfCriteria.reduce(
    (sum, item) => sum + (parseFloat(item.weight) || 0),
    0,
  );

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error("يرجى إدخال اسم للقالب أولاً.");
      return;
    }
    const cleanedCriteria = form.evfCriteria.filter(
      (i) => i.title.trim() !== "" && i.weight !== "",
    );
    if (cleanedCriteria.length === 0) {
      toast.error("يرجى إضافة معايير فنية لكي يتم حفظها كقالب.");
      return;
    }
    const newTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      criteria: cleanedCriteria,
    };
    // @ts-ignore
    setEvfTemplates([...evfTemplates, newTemplate]);
    setNewTemplateName("");
    toast.success("تم حفظ القالب بنجاح.");
  };

  // @ts-ignore
  const handleLoadTemplate = (templateId) => {
    if (!templateId) return;
    // @ts-ignore
    const tmpl = evfTemplates.find((t) => t.id === templateId);
    if (tmpl) {
      setForm({ ...form, evfCriteria: [...tmpl.criteria] });
      toast.success(`تم إدراج معايير قالب: ${tmpl.name}`);
    }
  };

  // @ts-ignore
  const handleEvaluatorChange = (index, field, value) => {
    const newEvals = [...form.evaluators];
    // @ts-ignore
    newEvals[index][field] = value;
    setForm({ ...form, evaluators: newEvals });
  };
  // @ts-ignore
  const handleSetPM = (index) => {
    const newEvals = form.evaluators.map((ev, i) => ({
      ...ev,
      isPM: i === index,
    }));
    setForm({ ...form, evaluators: newEvals });
  };
  const addEvaluator = () =>
    setForm({
      ...form,
      evaluators: [...form.evaluators, { name: "", email: "", isPM: false }],
    });
  // @ts-ignore
  const removeEvaluator = (index) => {
    const newEvals = form.evaluators.filter((_, i) => i !== index);
    if (newEvals.length > 0 && !newEvals.some((ev) => ev.isPM)) {
      newEvals[0].isPM = true;
    }
    setForm({
      ...form,
      evaluators: newEvals.length
        ? newEvals
        : [{ name: "", email: "", isPM: true }],
    });
  };

  // @ts-ignore
  const handleCreateRequest = (e) => {
    e.preventDefault();
    setStep(2);
  };

  // @ts-ignore
  const handleFinalSave = (e) => {
    e.preventDefault();

    const cleanedItems =
      form.type === "GENERAL"
        ? form.evaluatedItems.filter((i) => i.trim() !== "").length
          ? form.evaluatedItems.filter((i) => i.trim() !== "")
          : ["بدون بنود محددة"]
        : [];
    const cleanedCriteria =
      form.type === "EVF"
        ? form.evfCriteria.filter(
            (i) => i.title.trim() !== "" && i.weight !== "",
          ).length
          ? form.evfCriteria.filter(
              (i) => i.title.trim() !== "" && i.weight !== "",
            )
          : [{ title: "معيار افتراضي", weight: "100" }]
        : [];
    const cleanedEvaluators = form.evaluators.filter(
      (ev) => ev.name.trim() !== "",
    ).length
      ? form.evaluators.filter((ev) => ev.name.trim() !== "")
      : [{ name: "مقيم 1", email: "", isPM: true }];
    const cleanedVendors = form.vendors.filter((v) => v.name.trim() !== "");

    if (editingEval) {
      const updatedEntry = {
        ...editingEval,
        prNumber: form.prNumber,
        projectName: form.projectName,
        deadline: form.deadline,
        vendors: cleanedVendors,
        evaluatedItems: cleanedItems,
        evfCriteria: cleanedCriteria,
        evaluators: cleanedEvaluators,
        status: "PENDING",
        itemEvaluations: {},
        history: [
          // @ts-ignore
          ...(editingEval.history || []),
          {
            date: new Date().toISOString(),
            action: "تم تعديل الطلب وإعادة تفعيله للتقييم",
            user: "مدير النظام",
          },
        ],
      };
      setEvaluations(
        // @ts-ignore
        evaluations.map((ev) => (ev.id === editingEval.id ? updatedEntry : ev)),
      );
      toast.success("تم تحديث بيانات الطلب وإعادة تفعيله للتقييم بنجاح");
    } else {
      const baseHistory = [
        {
          date: new Date().toISOString(),
          action: "تم إنشاء الطلب",
          user: "مدير النظام",
        },
      ];
      const newEntry = {
        id: Math.random().toString(36).substr(2, 9),
        prNumber: form.prNumber,
        projectName: form.projectName,
        deadline: form.deadline,
        vendors: cleanedVendors,
        type: form.type,
        evaluatedItems: cleanedItems,
        evfCriteria: cleanedCriteria,
        evaluators: cleanedEvaluators,
        status: "PENDING",
        itemEvaluations: {},
        createdAt: new Date().toISOString(),
        history: baseHistory,
      };
      // @ts-ignore
      setEvaluations([newEntry, ...evaluations]);
      toast.success("تم إنشاء طلب التقييم بنجاح");
    }

    setIsModalOpen(false);
    setStep(1);
    setEditingEval(null);
  };

  // @ts-ignore
  const handleEdit = (ev) => {
    setEditingEval(ev);
    setForm({
      type: ev.type || "GENERAL",
      prNumber: ev.prNumber,
      projectName: ev.projectName,
      deadline: ev.deadline || "",
      vendors: ev.vendors?.length
        ? ev.vendors
        : [
            {
              name: ev.vendorName || "",
              attachmentName: ev.attachmentName || "",
            },
          ],
      evaluatedItems: ev.evaluatedItems?.length ? ev.evaluatedItems : [""],
      evfCriteria: ev.evfCriteria?.length
        ? ev.evfCriteria
        : [{ title: "", weight: "" }],
      evaluators: ev.evaluators?.length
        ? ev.evaluators
        : [
            {
              name: ev.evaluatorName || "",
              email: ev.evaluatorEmail || "",
              isPM: true,
            },
          ],
    });
    setStep(1);
    setIsModalOpen(true);
  };

  // @ts-ignore
  const handleDelete = (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا السجل بشكل نهائي؟")) {
      // @ts-ignore
      setEvaluations(evaluations.filter((ev) => ev.id !== id));
      toast.success("تم حذف السجل بنجاح");
    }
  };

  // @ts-ignore
  const updateStatus = (id, newStatus) => {
    // @ts-ignore
    setEvaluations(evaluations.map(ev => ev.id === id ? { ...ev, status: newStatus } : ev));
    toast.success("تم تحديث حالة الطلب بنجاح والاعتماد النهائي.");
  };

  // @ts-ignore
  const copyEvalLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/eval/${id}`);
    toast.success("تم نسخ الرابط بنجاح للمشاركة");
  };

  // @ts-ignore
  const openCreateModal = (type) => {
    setEditingEval(null);
    setForm({
      type,
      prNumber: "",
      projectName: "",
      deadline: "",
      vendors: [{ name: "", attachmentName: "" }],
      evaluatedItems: [""],
      evfCriteria: [{ title: "", weight: "" }],
      evaluators: [{ name: "", email: "", isPM: true }],
    });
    setSelectedTemplateId("");
    setStep(1);
    setIsModalOpen(true);
  };

  // @ts-ignore
  const openHistoryModal = (ev) => {
    setHistoryEval(ev);
    setIsHistoryModalOpen(true);
  };

  // @ts-ignore
  const openViewingModal = (ev) => {
    setViewingEval(ev);
    setActiveVendorTab(0);
  };

  // @ts-ignore
  const generateTimeline = (ev) => {
    let events = [];
    if (ev.history) events.push(...ev.history);
    else
      events.push({
        date: ev.createdAt || ev.date,
        action: "إنشاء الطلب القديم",
        user: "مدير النظام",
      });

    if (ev.itemEvaluations) {
      Object.keys(ev.itemEvaluations).forEach((idx) => {
        const evalData = ev.itemEvaluations[idx];
        const evaluatorName =
          ev.evaluators?.[idx]?.name || `مقيم ${parseInt(idx) + 1}`;
        if (evalData.timestamp) {
          events.push({
            date: evalData.timestamp,
            action: "اكتمل التقييم واعتماد من قبل العضو",
            user: evaluatorName,
            isEval: true,
          });
        }
      });
    }
    // @ts-ignore
    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const handleExportCSV = () => {
    toast.success("تم تصدير التقرير بنجاح");
  };

  // @ts-ignore
  const getEvaluatorsList = (ev) =>
    ev.evaluators?.length
      ? ev.evaluators
      : [{ name: ev.evaluatorName || "مقيم 1" }];

  let filteredAndSortedData =
    activeTab === "ALL"
      ? evaluations
      : // @ts-ignore
        evaluations.filter((ev) => ev.type === activeTab);
  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    // @ts-ignore
    filteredAndSortedData = filteredAndSortedData.filter((ev) => {
      const vendorNames = ev.vendors
        ? // @ts-ignore
          ev.vendors.map((v) => v.name).join(" ")
        : ev.vendorName || "";
      return (
        ev.projectName?.toLowerCase().includes(lower) ||
        vendorNames.toLowerCase().includes(lower) ||
        ev.prNumber?.toLowerCase().includes(lower)
      );
    });
  }
  if (filterStatus !== "ALL") {
    // @ts-ignore
    filteredAndSortedData = filteredAndSortedData.filter((ev) => {
      if (filterStatus === "PENDING") return ev.status === "PENDING";
      if (filterStatus === "EVALUATED") return ev.status === "EVALUATED";
      if (filterStatus === "AWAITING_JUSTIFICATION")
        return ev.status === "AWAITING_JUSTIFICATION";
      if (filterStatus === "APPROVED") return ev.status === "APPROVED";
      return true;
    });
  }
  filteredAndSortedData.sort((a, b) => {
    if (sortBy === "newest")
      // @ts-ignore
      return (
        // @ts-ignore
        new Date(b.createdAt || b.date || 0) -
        // @ts-ignore
        new Date(a.createdAt || a.date || 0)
      );
    // @ts-ignore
    if (sortBy === "score_high") return getHighestScore(b) - getHighestScore(a);
    return 0;
  });

  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // @ts-ignore
  const getRadarData = (ev, vIdx) => {
    if (ev.type !== "EVF" || !ev.evfCriteria) return [];
    const stats = calculateEvfAveragesForVendor(ev, vIdx);
    // @ts-ignore
    return ev.evfCriteria.map((crit, idx) => ({
      subject:
        crit.title?.length > 15
          ? crit.title.substring(0, 15) + "..."
          : crit.title,
      A: parseFloat(stats.criteria[idx]?.avgScore || 0),
      fullMark: 10,
    }));
  };

  const statsTotalCount = evaluations.length;
  // @ts-ignore
  const statsEvfCount = evaluations.filter((ev) => ev.type === "EVF").length;
  const statsGeneralCount = evaluations.filter(
    // @ts-ignore
    (ev) => ev.type === "GENERAL",
  ).length;
  const statsApprovedCount = evaluations.filter(
    // @ts-ignore
    (ev) => ev.status === "APPROVED",
  ).length;
  const statsPendingCount = evaluations.filter(
    // @ts-ignore
    (ev) =>
      ev.status === "PENDING" ||
      ev.status === "EVALUATED" ||
      ev.status === "AWAITING_JUSTIFICATION",
  ).length;
  const progressPercentage =
    statsTotalCount === 0
      ? 0
      : Math.round((statsApprovedCount / statsTotalCount) * 100);

  if (!isLoaded) return null;

  return (
    <div
      className="min-h-screen bg-gray-50/30 flex flex-col print:bg-white"
      dir="rtl"
    >
      <Toaster position="top-center" richColors />

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
      `,
        }}
      />

      <header className="bg-white border-b border-gray-200 px-6 lg:px-10 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="شعار النظام" className="h-8 w-auto" />
          <h2 className="text-2xl font-black text-[#0D4435]">نظام قيّم</h2>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors px-4 py-2 rounded-xl border border-gray-200"
          >
            <div className="w-9 h-9 bg-[#0D4435]/10 rounded-lg flex items-center justify-center">
              <Users size={18} className="text-[#0D4435]" />
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-gray-500 font-bold">مرحباً بك</p>
              <p className="text-xs font-black text-[#0D4435]">مدير النظام</p>
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden flex flex-col"
              >
                <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    مسجل الدخول بحساب
                  </p>
                  <p
                    className="text-sm font-black text-gray-800 truncate"
                    dir="ltr"
                  >
                    admin@ladun.com
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-between p-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors w-full text-right"
                >
                  تسجيل الخروج
                  <LogOut size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="flex-1 pb-20 pt-8 px-4 md:px-6 container mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-[#C5A059] transition-colors mb-2"
            >
              <span>الرجوع</span> <ArrowRight size={16} className="mr-1" />
            </Link>
            <h1 className="text-3xl font-bold text-[#0D4435] tracking-tight">
              إدارة التقييم الفني للموردين
            </h1>
            <p className="text-gray-500 mt-1">
              السجل الموحد لمتابعة واعتماد العروض الفنية ونماذج EVF بدقة.
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
              onClick={() => openCreateModal("GENERAL")}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white border border-gray-200 text-blue-700 hover:bg-blue-50 h-10 px-4 py-2 text-sm font-bold shadow-sm transition-all"
            >
              <span>إضافة مطابقة فنية</span> <ClipboardList size={18} />
            </button>
            <button
              onClick={() => openCreateModal("EVF")}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0D4435] text-white hover:bg-[#092e24] h-10 px-6 py-2 text-sm font-bold shadow-md transition-all"
            >
              <span>إنشاء نموذج EVF</span> <Calculator size={18} />
            </button>
          </div>
        </div>

        <StatsCards
          statsTotalCount={statsTotalCount}
          statsEvfCount={statsEvfCount}
          statsGeneralCount={statsGeneralCount}
          statsApprovedCount={statsApprovedCount}
          statsPendingCount={statsPendingCount}
          progressPercentage={progressPercentage}
        />

        <div className="mb-6 flex justify-start no-print">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
            {["ALL", "GENERAL", "EVF"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-6 py-2 rounded-md text-sm font-bold transition-colors duration-300 whitespace-nowrap ${activeTab === tab ? "bg-[#0D4435] text-white shadow-sm" : "bg-transparent text-gray-600 hover:bg-gray-50"}`}
              >
                {tab === "ALL"
                  ? "عرض الكل"
                  : tab === "GENERAL"
                    ? "المطابقة الفنية"
                    : "التقييم الموزون"}
              </button>
            ))}
          </div>
        </div>

        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <EvaluationList
          paginatedData={paginatedData}
          viewMode={viewMode}
          updateStatus={updateStatus}
          openHistoryModal={openHistoryModal}
          openViewingModal={openViewingModal}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          copyEvalLink={copyEvalLink}
        />

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6 no-print">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <div className="flex items-center gap-1 text-sm font-bold text-gray-600 px-4">
              صفحة {currentPage} من {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        )}

        <HistoryModal 
          isOpen={isHistoryModalOpen} 
          onClose={() => setIsHistoryModalOpen(false)} 
          historyEval={historyEval} 
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
        <p className="text-sm font-black text-[#0D4435]">
          ( برنامج تطوير وزارة الحرس الوطني )
        </p>
        <p className="text-sm font-black text-gray-400" dir="ltr">
          Powered by Eng. Yazeed Alonazi
        </p>
      </footer>
    </div>
  );
}
