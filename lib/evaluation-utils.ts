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
