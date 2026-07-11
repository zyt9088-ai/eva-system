const fs = require('fs');

let viewing = fs.readFileSync('components/features/evaluations/viewing-modal.tsx', 'utf8');

// 1. Props
viewing = viewing.replace('export const ViewingModal = ({ viewingEval, onClose })', 'export const ViewingModal = ({ viewingEval, onClose }: any)');

// 2. Imports
viewing = viewing.replace('import { X, CheckCircle2, Calculator, ClipboardList, Briefcase, Users, AlertCircle, Paperclip } from "lucide-react";', 'import { X, CheckCircle2, Calculator, ClipboardList, Briefcase, Users, AlertCircle, Paperclip, Tag, Printer, Clock, Radar as RadarIcon } from "lucide-react";');
viewing = viewing.replace('getSafeScore, getRadarData } from "@/lib/evaluation-utils";', 'getSafeScore } from "@/lib/evaluation-utils";'); // undo previous addition if any, but wait we need getRadarData
viewing = viewing.replace('getSafeScore } from "@/lib/evaluation-utils";', 'getSafeScore, getRadarData } from "@/lib/evaluation-utils";');

// 3. Number cast for TS operator issue
viewing = viewing.replace(/calculateEvfAveragesForVendor\(\s*viewingEval,\s*activeVendorTab\s*,?\s*\)\.total >= 60/g, 'Number(calculateEvfAveragesForVendor(viewingEval, activeVendorTab).total) >= 60');

// 4. Radar to RadarIcon
viewing = viewing.replace(/<Radar\s+size/g, '<RadarIcon size');

// 5. Implicit any mappings
viewing = viewing.replace(/\(ev, i\) =>/g, '(ev: any, i: any) =>');
viewing = viewing.replace(/\(_, itemIdx\) =>/g, '(_: any, itemIdx: any) =>');
viewing = viewing.replace(/\(_, evIdx\) =>/g, '(_: any, evIdx: any) =>');
viewing = viewing.replace(/\(ev, evIdx\) =>/g, '(ev: any, evIdx: any) =>');
viewing = viewing.replace(/\(ev, evalIndex\) =>/g, '(ev: any, evalIndex: any) =>');

fs.writeFileSync('components/features/evaluations/viewing-modal.tsx', viewing);
