const fs = require('fs');
let content = fs.readFileSync('app/tech-eval/page.jsx', 'utf8');

// 1. Add import for utility functions
content = content.replace(
  'import { useEvaluations } from "@/hooks/useEvaluations";',
  'import { useEvaluations } from "@/hooks/useEvaluations";\nimport { getSafeScore, getSafeReason, getSafeEvalStatus, calculateEvfAveragesForVendor, getFinalStatusForVendor, getHighestScore, formatDateTime, getEvaluatorsList } from "@/lib/evaluation-utils";'
);

// 2. Remove duplicated functions outside the component
const toRemoveOutside = [
  /const getSafeScore = [\s\S]*?return undefined;\r?\n\s*\};\r?\n/,
  /const getSafeReason = [\s\S]*?return null;\r?\n\s*\};\r?\n/,
  /const getSafeEvalStatus = [\s\S]*?return null;\r?\n\s*\};\r?\n/,
  /const calculateEvfAveragesForVendor = [\s\S]*?return \{ criteria: criteriaStats, total: totalScore\.toFixed\(2\) \};\r?\n\s*\};\r?\n/,
  /const getFinalStatusForVendor = [\s\S]*?return "مطابق جزئياً";\r?\n\s*\};\r?\n/,
  /const getHighestScore = [\s\S]*?return maxScore\.toFixed\(2\);\r?\n\s*\};\r?\n/,
  /const formatDateTime = [\s\S]*?minute: "2-digit" \}\)\r?\n\s*\);\r?\n\s*\};\r?\n/
];

toRemoveOutside.forEach(regex => {
  content = content.replace(regex, '');
});

// 3. Remove getEvaluatorsList inside the component
content = content.replace(/\/\/ @ts-ignore\r?\n\s*const getEvaluatorsList = \(ev\) =>\r?\n\s*ev\.evaluators\?\.length\r?\n\s*\?\s*ev\.evaluators\r?\n\s*:\s*\[\{ name: ev\.evaluatorName \|\| "مقيم 1" \}\];\r?\n/, '');

fs.writeFileSync('app/tech-eval/page.jsx', content);
console.log('Removed duplicate functions successfully.');
