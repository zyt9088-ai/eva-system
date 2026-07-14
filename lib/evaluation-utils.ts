export const getSafeScore = (itemEvals: any, evalIdx: number, vendorIdx: number, critIdx: number) => {
  if (!itemEvals) return undefined;
  const evalData = itemEvals[evalIdx];
  if (!evalData) return undefined;
  if (evalData.evals && evalData.evals[vendorIdx]) {
    return evalData.evals[vendorIdx][critIdx]?.score;
  }
  if (vendorIdx === 0 && evalData[critIdx]) return evalData[critIdx].score;
  return undefined;
};

export const getSafeReason = (itemEvals: any, evalIdx: number, vendorIdx: number, critIdx: number) => {
  if (!itemEvals) return undefined;
  const evalData = itemEvals[evalIdx];
  if (!evalData) return undefined;
  if (evalData.evals && evalData.evals[vendorIdx]) {
    return evalData.evals[vendorIdx][critIdx]?.reason;
  }
  if (vendorIdx === 0 && evalData[critIdx]) return evalData[critIdx].reason;
  return undefined;
};

export const getSafeEvalStatus = (itemEvals: any, evalIdx: number, vendorIdx: number, itemIdx: number) => {
  if (!itemEvals) return null;
  const evalData = itemEvals[evalIdx];
  if (!evalData) return null;
  if (evalData.evals && evalData.evals[vendorIdx]) {
    return evalData.evals[vendorIdx][itemIdx];
  }
  if (vendorIdx === 0 && evalData[itemIdx]) return evalData[itemIdx];
  return null;
};

export const calculateEvfAveragesForVendor = (evalData: any, vendorIdx: number) => {
  if (evalData.type !== "EVF" || !evalData.evfCriteria)
    return { criteria: [], total: 0 };
  let totalScore = 0;
  const evaluatorsList = evalData.evaluators?.length
    ? evalData.evaluators
    : [{ name: evalData.evaluatorName || "مقيم 1" }];

  const criteriaStats = evalData.evfCriteria.map((crit: any, critIndex: number) => {
    let sum = 0;
    let count = 0;
    evaluatorsList.forEach((_: any, evalIndex: number) => {
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

export const getFinalStatusForVendor = (evalData: any, vendorIdx: number) => {
  if (evalData.type !== "GENERAL" || !evalData.evaluatedItems)
    return "قيد التقييم";
  let yesCount = 0;
  let noCount = 0;
  let evaluatedCountTotal = 0;
  const evaluatorsList = evalData.evaluators?.length
    ? evalData.evaluators
    : [{ name: "مقيم 1" }];

  evalData.evaluatedItems.forEach((_: any, itemIdx: number) => {
    evaluatorsList.forEach((_: any, evIdx: number) => {
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

export const getHighestScore = (evalData: any) => {
  if (evalData.type === "VENDOR_PERFORMANCE") return calculateVendorPerformanceAverages(evalData).total;
  if (evalData.type !== "EVF" || !evalData.vendors) return "0";
  let maxScore = 0;
  evalData.vendors.forEach((_: any, idx: number) => {
    const score = parseFloat(calculateEvfAveragesForVendor(evalData, idx).total as string);
    if (score > maxScore) maxScore = score;
  });
  return maxScore.toFixed(2);
};

export const getEvaluatorsList = (ev: any) =>
  ev.evaluators?.length
    ? ev.evaluators
    : [{ name: ev.evaluatorName || "مقيم 1", email: "", isPM: true }];

export const getRadarData = (evalData: any, vendorIdx: number) => {
  if (evalData.type === "VENDOR_PERFORMANCE") {
    const { categories } = calculateVendorPerformanceAverages(evalData);
    return categories.map((cat: any) => ({
      subject: cat.name,
      A: parseFloat(cat.avgScore || 0),
      fullMark: 100,
    }));
  }
  if (evalData.type !== "EVF" || !evalData.evfCriteria) return [];
  const { criteria } = calculateEvfAveragesForVendor(evalData, vendorIdx);
  return evalData.evfCriteria.map((crit: any, i: number) => ({
    subject: crit.title,
    A: parseFloat((criteria[i] as any)?.avgScore || 0),
    fullMark: 10,
  }));
};

export const formatDateTime = (isoString: string) => {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return d.toLocaleDateString("ar-SA") + " " + d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
};


export const VENDOR_PERFORMANCE_CATEGORIES = [
  {
    name: "إدارة العقد",
    weight: 0.15,
    criteria: [
      { id: "contract_1", main: "الالتزام بشروط العقد", indicator: "نسبة الإلتزام بإغلاق الملاحظات المتعلقة بشروط العقد", ranges: { green: "> 95%", blue: "85% - 95%", red: "< 85%" } }
    ]
  },
  {
    name: "الجودة",
    weight: 0.30,
    criteria: [
      { id: "quality_1", main: "اتباع طريقة تنفيذ الخدمات", indicator: "نسبة الإلتزام بإغلاق الملاحظات المتعلقة بالخدمات المنفذة", ranges: { green: "> 89%", blue: "70% - 89%", red: "< 70%" } },
      { id: "quality_2", main: "الالتزام بشروط والمواصفات الفنية", indicator: "نسبة الالتزام بإغلاق الملاحظات المتعلقة بالاشتراطات والمواصفات الفنية المطلوبة", ranges: { green: "> 89%", blue: "70% - 89%", red: "< 70%" } },
      { id: "quality_3", main: "جودة المخرجات وصحتها", indicator: "تقديم تقارير كاملة وصحيحة", ranges: { green: "كاملة وصحيحة", blue: "وجود بعض الأخطاء (غير مؤثرة)", red: "وجود أخطاء جوهرية" } }
    ]
  },
  {
    name: "التسليم",
    weight: 0.40,
    criteria: [
      { id: "delivery_1", main: "الإلتزام بالجدول الزمني", indicator: "نسبة الاختلاف عن الجدول الزمني المخطط", ranges: { green: "< 5%", blue: "5% - 10%", red: "> 10%" } },
      { id: "delivery_2", main: "التسليم خالي من العيوب", indicator: "نسبة الإلتزام بإغلاق الملاحظات المتعلقة بالتسليم النهائي", ranges: { green: "> 89%", blue: "70% - 89%", red: "< 70%" } },
      { id: "delivery_3", main: "صحة معلومات وثائق التسليم", indicator: "صحة معلومات وثائق التسليم (مذكرات التسليم وقوائم التعبئة والفواتير)", ranges: { green: "كاملة وصحيحة", blue: "وجود بعض الأخطاء", red: "وجود أخطاء جوهرية" } }
    ]
  },
  {
    name: "سرعة وسهولة تجاوب المتعاقد",
    weight: 0.15,
    criteria: [
      { id: "speed_1", main: "التواصل", indicator: "عدد أيام التأخير في الرد على الاستفسارات وطلبات البيانات", ranges: { green: "< 5 أيام", blue: "5 - 10 أيام", red: "> 10 أيام" } },
      { id: "speed_2", main: "المرونة", indicator: "نسبة الإلتزام بإغلاق الملاحظات المتعلقة بطلبات التغيير", ranges: { green: "> 89%", blue: "70% - 89%", red: "< 70%" } },
      { id: "speed_3", main: "الاستجابة للطوارئ", indicator: "عدد ساعات التأخير في الاستجابة للطوارئ", ranges: { green: "< 6 ساعات", blue: "6 - 12 ساعة", red: "> 12 ساعة" } },
      { id: "speed_4", main: "التعاون مع أصحاب العلاقة", indicator: "نسبة الاستجابة لطلبات التعاون مع أصحاب العلاقة", ranges: { green: "> 89%", blue: "70% - 89%", red: "< 70%" } }
    ]
  }
];

export const VENDOR_PERFORMANCE_FLAT_CRITERIA: any[] = VENDOR_PERFORMANCE_CATEGORIES.reduce((acc: any[], cat: any) => [...acc, ...cat.criteria], []);

export const calculateVendorPerformanceAverages = (evalData: any) => {
  const vendorIdx = 0;
  if (evalData.type !== "VENDOR_PERFORMANCE") return { total: "0.00", categories: [] };
  let totalScore = 0;
  const evaluatorsList = evalData.evaluators?.length ? evalData.evaluators : [{ name: evalData.evaluatorName || "مقيم 1" }];
  let flatIndexOffset = 0;

  const categoriesStats = VENDOR_PERFORMANCE_CATEGORIES.map(cat => {
    let catSum = 0;
    const criteriaStats = cat.criteria.map((crit, idx) => {
      const globalCritIdx = flatIndexOffset + idx;
      let sum = 0;
      let count = 0;
      evaluatorsList.forEach((_: any, evalIndex: number) => {
        const score = getSafeScore(evalData.itemEvaluations, evalIndex, vendorIdx, globalCritIdx);
        if (score !== undefined && score !== "") {
          sum += parseFloat(score);
          count++;
        }
      });
      const avgScore = count > 0 ? sum / count : 0;
      catSum += avgScore;
      return { avgScore: avgScore.toFixed(2) };
    });
    
    flatIndexOffset += cat.criteria.length;

    const catAvg = cat.criteria.length > 0 ? catSum / cat.criteria.length : 0;
    const catWeighted = catAvg * cat.weight;
    totalScore += catWeighted;

    return {
      name: cat.name,
      avgScore: catAvg.toFixed(2),
      weightedScore: catWeighted.toFixed(2)
    };
  });

  return { categories: categoriesStats, total: totalScore.toFixed(2) };
};
