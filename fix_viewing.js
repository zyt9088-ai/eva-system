const fs = require('fs');

// Fix evaluation-utils.ts
let utils = fs.readFileSync('lib/evaluation-utils.ts', 'utf8');
if (!utils.includes('getRadarData')) {
  utils += \`
export const getRadarData = (evalData: any, vendorIdx: number) => {
  if (evalData.type !== "EVF" || !evalData.evfCriteria) return [];
  const { criteria } = calculateEvfAveragesForVendor(evalData, vendorIdx);
  return evalData.evfCriteria.map((crit: any, i: number) => ({
    subject: crit.title,
    A: parseFloat((criteria[i] as any)?.avgScore || 0),
    fullMark: 10,
  }));
};
\`;
  fs.writeFileSync('lib/evaluation-utils.ts', utils);
}

// Fix viewing-modal.tsx
let viewing = fs.readFileSync('components/features/evaluations/viewing-modal.tsx', 'utf8');
viewing = viewing.replace('getSafeScore } from', 'getSafeScore, getRadarData } from');
viewing = viewing.replace('Calculator, ClipboardList, Briefcase, Users, Star, MessageSquare, History, User', 'Calculator, ClipboardList, Briefcase, Users, Star, MessageSquare, History, User, Tag, Printer, Clock, RadarIcon');
viewing = viewing.replace('<Printer ', '<Printer ');
viewing = viewing.replace('<Clock ', '<Clock ');
viewing = viewing.replace('<Tag ', '<Tag ');
viewing = viewing.replace('<Radar size={18}', '<RadarIcon size={18}');
viewing = viewing.replace(/\\(ev, i\\)/g, '(ev: any, i: any)');
viewing = viewing.replace(/\\(_, itemIdx\\)/g, '(_: any, itemIdx: any)');
viewing = viewing.replace(/\\(_, evIdx\\)/g, '(_: any, evIdx: any)');
viewing = viewing.replace(/\\(ev, evIdx\\)/g, '(ev: any, evIdx: any)');
viewing = viewing.replace(/\\(ev, evalIndex\\)/g, '(ev: any, evalIndex: any)');
viewing = viewing.replace('viewingEval, onClose', 'viewingEval: any, onClose: any');

fs.writeFileSync('components/features/evaluations/viewing-modal.tsx', viewing);
