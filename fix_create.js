const fs = require('fs');
let content = fs.readFileSync('components/features/evaluations/create-eval-modal.tsx', 'utf8');
content = content.replace('ArrowRight } from "lucide-react"', 'ArrowRight, Paperclip, Bookmark, AlertCircle } from "lucide-react"');
content = content.replace(/\(vendor, vIdx\)/g, '(vendor: any, vIdx: any)');
content = content.replace(/\(item, index\)/g, '(item: any, index: any)');
content = content.replace(/\(evaluator, index\)/g, '(evaluator: any, index: any)');
fs.writeFileSync('components/features/evaluations/create-eval-modal.tsx', content);
