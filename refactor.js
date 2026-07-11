const fs = require('fs');
let content = fs.readFileSync('app/tech-eval/page.jsx', 'utf8');

// 1. Add import
content = content.replace(
  'import { useRouter } from "next/navigation";',
  'import { useRouter } from "next/navigation";\nimport { useEvaluations } from "@/hooks/useEvaluations";'
);

// 2. Replace state vars (using regex to handle CRLF)
content = content.replace(
  /const \[isLoaded, setIsLoaded\] = useState\(false\);\r?\n\s*const \[evaluations, setEvaluations\] = useState\(\[\]\);/,
  'const { evaluations, isLoaded, saveEvaluation, deleteEvaluation, updateStatus } = useEvaluations();'
);

// 3. Replace useEffects for localStorage
const effectsRegex = /useEffect\(\(\) => \{\r?\n\s*let isMounted = true;\r?\n\s*const saved = localStorage\.getItem\("ladun_workflow_evals"\);[\s\S]*?localStorage\.setItem\("ladun_evf_templates", JSON\.stringify\(evfTemplates\)\);\r?\n\s*\}\r?\n\s*\}, \[evaluations, evfTemplates, isLoaded\]\);/;
const effectsReplacement = `useEffect(() => {
    let isMounted = true;
    const savedTemplates = localStorage.getItem("ladun_evf_templates");
    if (savedTemplates && isMounted) setEvfTemplates(JSON.parse(savedTemplates));
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem("ladun_evf_templates", JSON.stringify(evfTemplates));
  }, [evfTemplates]);`;
content = content.replace(effectsRegex, effectsReplacement);

// 4. Remove handleDelete and updateStatus completely
content = content.replace(/\/\/ @ts-ignore\r?\n\s*const handleDelete = \(id\) => \{[\s\S]*?toast\.success\("تم حذف السجل بنجاح"\);\r?\n\s*\}\r?\n\s*\};\r?\n/, '');
content = content.replace(/\/\/ @ts-ignore\r?\n\s*const updateStatus = \(id, newStatus\) => \{[\s\S]*?toast\.success\("تم تحديث حالة الطلب بنجاح والاعتماد النهائي\."\);\r?\n\s*\};\r?\n/, '');

// 5. Update the prop passed to EvaluationList
content = content.replace('handleDelete={handleDelete}', 'handleDelete={deleteEvaluation}');

// 6. Fix handleFinalSave
const finalSaveRegex = /const handleFinalSave = \(e\) => \{[\s\S]*?setStep\(1\);\r?\n\s*\};/;
const finalSaveReplacement = `const handleFinalSave = (e) => {
    e.preventDefault();
    if (editingEval) {
      saveEvaluation(editingEval, true);
    } else {
      const newEval = {
        prNumber: form.prNumber,
        projectName: form.projectName,
        deadline: form.deadline,
        vendors: form.vendors.filter((v) => v.name.trim()),
        type: form.type,
        evaluatedItems: form.type === "GENERAL" ? form.evaluatedItems.filter(i => i.trim()) : [],
        evfCriteria: form.type === "EVF" ? form.evfCriteria : [],
        evaluators: form.evaluators.filter((e) => e.name.trim()),
        status: "قيد التجهيز",
        itemEvaluations: {},
      };
      saveEvaluation(newEval, false);
    }
    setIsModalOpen(false);
    setEditingEval(null);
    setStep(1);
  };`;
content = content.replace(finalSaveRegex, finalSaveReplacement);

fs.writeFileSync('app/tech-eval/page.jsx', content);
console.log('Fixed page.jsx successfully.');
