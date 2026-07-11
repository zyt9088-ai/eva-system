const fs = require('fs');

// Fix print/[id]/page.tsx
let printCode = fs.readFileSync('app/print/[id]/page.tsx', 'utf8');
printCode = printCode.replace('parseFloat(calculateEvfAveragesForVendor(data, idx).total)', 'parseFloat(calculateEvfAveragesForVendor(data, idx).total as string)');
printCode = printCode.replace('parseFloat(scoreStr)', 'parseFloat(scoreStr as string)');
printCode = printCode.replace(/\\(v\\) =>/g, '(v: any) =>');
printCode = printCode.replace(/\\(pv, index\\)/g, '(pv: any, index: any)');
fs.writeFileSync('app/print/[id]/page.tsx', printCode);

// Fix eval/[id]/page.tsx
let evalCode = fs.readFileSync('app/eval/[id]/page.tsx', 'utf8');
evalCode = evalCode.replace('const data = evaluations.find((ev) => ev.id === evalId);', 'const data: any = evaluations.find((ev: any) => ev.id === evalId);');
evalCode = evalCode.replace(/\\(_: any, idx: number\\)/g, '(_: any, idx: any)');
evalCode = evalCode.replace(/\\(_: any, vIdx: number\\)/g, '(_: any, vIdx: any)');
evalCode = evalCode.replace(/\\(_: any, cIdx: number\\)/g, '(_: any, cIdx: any)');
fs.writeFileSync('app/eval/[id]/page.tsx', evalCode);
