"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface Evaluation {
  id: string;
  prNumber: string;
  projectName: string;
  deadline: string;
  vendors: any[];
  type: string;
  evaluatedItems: string[];
  evfCriteria: any[];
  evaluators: any[];
  status: string;
  itemEvaluations: any;
  createdAt?: string;
  date?: string;
  history?: any[];
  [key: string]: any;
}

export function useEvaluations() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evfTemplates, setEvfTemplates] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch initial data
  useEffect(() => {
    let isMounted = true;
    const saved = localStorage.getItem("ladun_workflow_evals");
    if (saved && isMounted) setEvaluations(JSON.parse(saved));

    const savedTemplates = localStorage.getItem("ladun_evf_templates");
    if (savedTemplates && isMounted) setEvfTemplates(JSON.parse(savedTemplates));

    const timer = setTimeout(() => {
      if (isMounted) setIsLoaded(true);
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Sync evaluations to local storage when changed (simulate server mutation success)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("ladun_workflow_evals", JSON.stringify(evaluations));
      localStorage.setItem("ladun_evf_templates", JSON.stringify(evfTemplates));
    }
  }, [evaluations, evfTemplates, isLoaded]);

  const saveEvaluation = (newEval: Evaluation, isEdit: boolean) => {
    if (isEdit) {
      setEvaluations((prev) => prev.map((ev) => (ev.id === newEval.id ? newEval : ev)));
      toast.success("تم تحديث بيانات الطلب وإعادة تفعيله للتقييم بنجاح");
    } else {
      setEvaluations((prev) => [newEval, ...prev]);
      toast.success("تم إنشاء طلب التقييم بنجاح");
    }
  };

  const deleteEvaluation = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا السجل بشكل نهائي؟")) {
      setEvaluations((prev) => prev.filter((ev) => ev.id !== id));
      toast.success("تم حذف السجل بنجاح");
    }
  };

  const updateStatus = (id: string, newStatus: string) => {
    setEvaluations((prev) => prev.map((ev) => (ev.id === id ? { ...ev, status: newStatus } : ev)));
    toast.success("تم تحديث حالة الطلب بنجاح والاعتماد النهائي.");
  };

  const addEvfTemplate = (newTemplate: any) => {
    setEvfTemplates((prev) => [...prev, newTemplate]);
    toast.success("تم حفظ القالب بنجاح.");
  };

  return {
    evaluations,
    evfTemplates,
    isLoaded,
    saveEvaluation,
    deleteEvaluation,
    updateStatus,
    addEvfTemplate,
  };
}
