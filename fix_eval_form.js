const fs = require('fs');
let content = fs.readFileSync('components/features/evaluations/public/evaluation-form.tsx', 'utf8');
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');
fs.writeFileSync('components/features/evaluations/public/evaluation-form.tsx', content);
