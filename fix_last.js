const fs = require('fs');

let printCode = fs.readFileSync('app/print/[id]/page.tsx', 'utf8');
printCode = printCode.replace('vendorsList.map((v, idx', 'vendorsList.map((v: any, idx');
printCode = printCode.replace(/\\(v\\) =>/g, '(v: any) =>');
printCode = printCode.replace(/\\(pv, index\\)/g, '(pv: any, index: any)');
fs.writeFileSync('app/print/[id]/page.tsx', printCode);

let viewing = fs.readFileSync('components/features/evaluations/viewing-modal.tsx', 'utf8');
viewing = viewing.replace('History, User } from "lucide-react"', 'History, User, Tag, Printer, Clock, Radar as RadarIcon } from "lucide-react"');
viewing = viewing.replace('parseFloat(calculateEvfAveragesForVendor(viewingEval, activeVendorTab).total)', 'parseFloat(calculateEvfAveragesForVendor(viewingEval, activeVendorTab).total as string)');
viewing = viewing.replace(/\(ev, i\)/g, '(ev: any, i: any)');
viewing = viewing.replace(/\(_, itemIdx\)/g, '(_: any, itemIdx: any)');
viewing = viewing.replace(/\(_, evIdx\)/g, '(_: any, evIdx: any)');
viewing = viewing.replace(/\(ev, evIdx\)/g, '(ev: any, evIdx: any)');
viewing = viewing.replace(/\(ev, evalIndex\)/g, '(ev: any, evalIndex: any)');
viewing = viewing.replace('<Radar size={18}', '<RadarIcon size={18}');
fs.writeFileSync('components/features/evaluations/viewing-modal.tsx', viewing);
