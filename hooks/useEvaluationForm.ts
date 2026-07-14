import { useState } from "react";
import { toast } from "sonner";

export function useEvaluationForm(evaluations: any[], setEvaluations: any, saveEvaluation: any) {
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
  
  const [step, setStep] = useState(1);
  const [editingEval, setEditingEval] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [evfTemplates, setEvfTemplates] = useState<any[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const handleVendorChange = (index: number, field: string, value: string) => {
    const newVendors = [...form.vendors];
    (newVendors[index] as any)[field] = value;
    setForm({ ...form, vendors: newVendors });
  };

  const addVendor = () =>
    setForm({
      ...form,
      vendors: [...form.vendors, { name: "", attachmentName: "" }],
    });

  const removeVendor = (index: number) => {
    const newVendors = form.vendors.filter((_, i) => i !== index);
    setForm({
      ...form,
      vendors: newVendors.length ? newVendors : [{ name: "", attachmentName: "" }],
    });
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...form.evaluatedItems];
    newItems[index] = value;
    setForm({ ...form, evaluatedItems: newItems });
  };

  const addItem = () =>
    setForm({ ...form, evaluatedItems: [...form.evaluatedItems, ""] });

  const removeItem = (index: number) => {
    const newItems = form.evaluatedItems.filter((_, i) => i !== index);
    setForm({ ...form, evaluatedItems: newItems.length ? newItems : [""] });
  };

  const handleEvfChange = (index: number, field: string, value: string) => {
    const newCriteria = [...form.evfCriteria];
    (newCriteria[index] as any)[field] = value;
    setForm({ ...form, evfCriteria: newCriteria });
  };

  const addEvfItem = () =>
    setForm({
      ...form,
      evfCriteria: [...form.evfCriteria, { title: "", weight: "" }],
    });

  const removeEvfItem = (index: number) => {
    const newCriteria = form.evfCriteria.filter((_, i) => i !== index);
    setForm({
      ...form,
      evfCriteria: newCriteria.length ? newCriteria : [{ title: "", weight: "" }],
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
    setEvfTemplates([...evfTemplates, newTemplate]);
    setNewTemplateName("");
    toast.success("تم حفظ القالب بنجاح.");
  };

  const handleLoadTemplate = (templateId: string) => {
    if (!templateId) return;
    const tmpl = evfTemplates.find((t) => t.id === templateId);
    if (tmpl) {
      setForm({ ...form, evfCriteria: [...tmpl.criteria] });
      toast.success(`تم إدراج معايير قالب: \${tmpl.name}`);
    }
  };

  const handleEvaluatorChange = (index: number, field: string, value: string) => {
    const newEvals = [...form.evaluators];
    (newEvals[index] as any)[field] = value;
    setForm({ ...form, evaluators: newEvals });
  };

  const handleSetPM = (index: number) => {
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

  const removeEvaluator = (index: number) => {
    const newEvals = form.evaluators.filter((_, i) => i !== index);
    if (newEvals.length > 0 && !newEvals.some((ev) => ev.isPM)) {
      newEvals[0].isPM = true;
    }
    setForm({
      ...form,
      evaluators: newEvals.length ? newEvals : [{ name: "", email: "", isPM: true }],
    });
  };

  const handleCreateRequest = (e: any) => {
    e.preventDefault();
    setStep(2);
  };

  const handleFinalSave = (e: any) => {
    e.preventDefault();
    if (editingEval) {
      const updatedEntry = {
        ...editingEval,
        prNumber: form.prNumber,
        projectName: form.projectName,
        deadline: form.deadline,
        vendors: form.vendors.filter((v) => v.name.trim()),
        evaluatedItems: form.type === "GENERAL" ? form.evaluatedItems.filter(i => i.trim()) : [],
        evfCriteria: form.type === "EVF" ? form.evfCriteria : [],
        evaluators: form.evaluators.filter((ev) => ev.name.trim()),
      };
      saveEvaluation(updatedEntry, true);
    } else {
      const newEval = {
        prNumber: form.prNumber,
        projectName: form.projectName,
        deadline: form.deadline,
        vendors: form.vendors.filter((v) => v.name.trim()),
        type: form.type,
        evaluatedItems: form.type === "GENERAL" ? form.evaluatedItems.filter(i => i.trim()) : [],
        evfCriteria: form.type === "EVF" ? form.evfCriteria : [],
        evaluators: form.evaluators.filter((ev) => ev.name.trim()),
        status: "قيد التجهيز",
        itemEvaluations: {},
      };
      saveEvaluation(newEval, false);
    }
    setIsModalOpen(false);
    setEditingEval(null);
    setStep(1);
  };

  const handleEdit = (ev: any) => {
    setEditingEval(ev);
    setForm({
      type: ev.type || "GENERAL",
      prNumber: ev.prNumber || "",
      projectName: ev.projectName || "",
      deadline: ev.deadline || "",
      vendors: ev.vendors?.length ? ev.vendors : [{ name: ev.vendorName || "", attachmentName: ev.attachmentName || "" }],
      evaluatedItems: ev.evaluatedItems?.length ? ev.evaluatedItems : [""],
      evfCriteria: ev.evfCriteria?.length ? ev.evfCriteria : [{ title: "", weight: "" }],
      evaluators: ev.evaluators?.length ? ev.evaluators : [{ name: ev.evaluatorName || "", email: ev.evaluatorEmail || "", isPM: true }],
    });
    setStep(1);
    setIsModalOpen(true);
  };

  const openCreateModal = (type: "GENERAL" | "EVF" | "VENDOR_PERFORMANCE") => {
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

  return {
    form,
    setForm,
    step,
    setStep,
    editingEval,
    setEditingEval,
    isModalOpen,
    setIsModalOpen,
    evfTemplates,
    setEvfTemplates,
    newTemplateName,
    setNewTemplateName,
    selectedTemplateId,
    setSelectedTemplateId,
    handleVendorChange,
    addVendor,
    removeVendor,
    handleItemChange,
    addItem,
    removeItem,
    handleEvfChange,
    addEvfItem,
    removeEvfItem,
    currentTotalWeight,
    handleSaveTemplate,
    handleLoadTemplate,
    handleEvaluatorChange,
    handleSetPM,
    addEvaluator,
    removeEvaluator,
    handleCreateRequest,
    handleFinalSave,
    handleEdit,
    openCreateModal
  };
}
