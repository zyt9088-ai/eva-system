const fs = require('fs');
let content = fs.readFileSync('lib/evaluation-utils.ts', 'utf8');
const goodContent = content.substring(0, content.indexOf('e x p o r t'));
fs.writeFileSync('lib/evaluation-utils.ts', goodContent + '\nexport const formatDateTime = (isoString: string) => {\n  if (!isoString) return "-";\n  const d = new Date(isoString);\n  return d.toLocaleDateString("ar-SA") + " " + d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });\n};\n');
