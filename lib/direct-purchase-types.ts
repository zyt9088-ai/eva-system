export interface CommitteeMember {
  id: string;
  name: string;
  email: string;
  role: 'chair' | 'vice_chair' | 'member' | 'reserve_member' | 'secretary';
  created_at?: string;
}

export const COMMITTEE_ROLE_LABELS: Record<string, string> = {
  chair: "رئيس اللجنة",
  vice_chair: "نائب رئيس اللجنة",
  member: "عضو اللجنة",
  reserve_member: "عضو احتياط",
  secretary: "أمين اللجنة",
};

export const COMMITTEE_ROLE_OPTIONS = [
  { value: "chair", label: "رئيس اللجنة" },
  { value: "vice_chair", label: "نائب رئيس اللجنة" },
  { value: "member", label: "عضو اللجنة" },
  { value: "reserve_member", label: "عضو احتياط" },
  { value: "secretary", label: "أمين اللجنة" },
  { value: "other", label: "أخرى (تحديد مسمى مخصص)" },
];

export const REASON_TYPE_OPTIONS = [
  { value: "service_continuation", label: "استمرار خدمة" },
  { value: "single_source", label: "مورد واحد" },
  { value: "emergency", label: "طلب طارئ" },
  { value: "contract_completion", label: "استكمال عقد" },
];

export const REASON_TYPE_LABELS: Record<string, string> = {
  service_continuation: "استمرار خدمة",
  single_source: "مورد واحد",
  emergency: "طلب طارئ",
  contract_completion: "استكمال عقد",
};

export const getReasonLabels = (reasonType?: string): string[] => {
  if (!reasonType) return [];
  const keys = reasonType.split(",").map((k) => k.trim()).filter(Boolean);
  return keys.map((k) => REASON_TYPE_LABELS[k] || k);
};

export const INTAKE_METHOD_OPTIONS = [
  { value: "qayyem_system", label: "نظام قيّم" },
  { value: "email", label: "بريد إلكتروني" },
];

export const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; stepIndex: number }
> = {
  pending_dept_manager: {
    label: "بانتظار موافقة مدير الإدارة",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    stepIndex: 1,
  },
  dept_manager_rejected: {
    label: "مرفوض من مدير الإدارة",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    stepIndex: 1,
  },
  pending_procurement_assign: {
    label: "بانتظار تعيين أخصائي المشتريات",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    stepIndex: 2,
  },
  pending_specialist_review: {
    label: "قيد دراسة أخصائي المشتريات",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    stepIndex: 2,
  },
  returned_to_requester: {
    label: "معاد للموظف للتعديل",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    stepIndex: 1,
  },
  closed_by_specialist: {
    label: "مغلق من أخصائي المشتريات",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
    stepIndex: 2,
  },
  pending_admin_approval: {
    label: "بانتظار اعتماد مدير المشتريات",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    stepIndex: 3,
  },
  pending_committee_secretary: {
    label: "بانتظار إعداد محضر اللجنة",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    stepIndex: 3,
  },
  pending_committee_approval: {
    label: "بانتظار إقرار أعضاء اللجنة",
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    border: "border-yellow-200",
    stepIndex: 3,
  },
  approved: {
    label: "معتمد نهائياً",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    stepIndex: 4,
  },
  rejected: {
    label: "مرفوض نهائياً",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    stepIndex: 4,
  },
};

export interface ChecklistItemDef {
  key: string;
  label: string;
}

export interface ChecklistSectionDef {
  title: string;
  items: ChecklistItemDef[];
}

export const SPECIALIST_CHECKLIST_SECTIONS: ChecklistSectionDef[] = [
  {
    title: "البند الأول : اكتمال النموذج والمرفقات",
    items: [
      { key: "form_complete", label: "اكتمال نموذج الشراء المباشر" },
      { key: "attachments_present", label: "وجود جميع المرفقات المطلوبة" },
    ],
  },
  {
    title: "البند الثاني : بيانات المورد",
    items: [
      { key: "vendor_name_valid", label: "صحة اسم المورد" },
      { key: "cr_valid", label: "صحة السجل التجاري والبيانات النظامية" },
      { key: "activity_match", label: "توافق نشاط المورد مع موضوع الطلب" },
      { key: "vendor_suitability", label: "مدى مناسبة المورد لتنفيذ نطاق العمل" },
    ],
  },
  {
    title: "البند الثالث : نطاق العمل",
    items: [
      { key: "scope_clear", label: "وضوح نطاق العمل" },
      { key: "scope_comprehensive", label: "شمولية نطاق العمل وعدم غموضه" },
      { key: "scope_reason_match", label: "توافق نطاق العمل مع سبب الطلب" },
      { key: "scope_cost_match", label: "انسجام نطاق العمل مع التكلفة" },
    ],
  },
  {
    title: "البند الرابع : سبب الطلب والمبررات",
    items: [
      { key: "reason_clear", label: "وضوح سبب الطلب" },
      { key: "reason_logical", label: "منطقية سبب الطلب" },
      { key: "justification_valid", label: "صحة المبررات المقدمة" },
      { key: "supporting_docs_present", label: "وجود مستندات داعمة للمبررات" },
      { key: "policy_compliance", label: "توافق سبب الطلب مع سياسة الشراء المباشر" },
    ],
  },
  {
    title: "البند الخامس : الأسعار والتكلفة",
    items: [
      { key: "price_justification_sound", label: "سلامة صياغة المبررات السعرية" },
      { key: "market_comparison", label: "مقارنة الأسعار بأسعار السوق" },
      { key: "cost_reasonable", label: "التأكد من أن التكلفة معقولة وغير مبالغ فيها" },
      { key: "price_scope_logic", label: "منطقية السعر مقابل نطاق العمل" },
    ],
  },
  {
    title: "البند السادس : البنود المالية",
    items: [
      { key: "financial_items_reviewed", label: "مراجعة البنود المالية لعرض السعر" },
      { key: "cost_details_clear", label: "وضوح تفاصيل التكاليف (الكميات - الوحدات - الإجمالي)" },
      { key: "no_unjustified_items", label: "عدم وجود بنود مالية غير مبررة" },
      { key: "quotation_matches", label: "تطابق عرض السعر مع النموذج والمرفقات" },
    ],
  },
];

export interface DirectPurchaseRequest {
  id: string;
  request_number: string;
  created_by?: string;
  requester_name: string;
  requester_email: string;
  department?: string;
  request_title: string;
  estimated_cost: number;
  reason_type: string;
  scope_of_work: string;
  justification_reason: string;
  impact_if_rejected: string;
  vendor_name: string;
  vendor_contact_person?: string;
  vendor_contact_phone?: string;
  vendor_contact_email?: string;
  attachments?: Array<{ name: string; path?: string; url?: string; dataUrl?: string; size?: number }>;
  
  // Department manager
  dept_manager_name?: string;
  dept_manager_email: string;
  dept_manager_approval_status?: 'pending' | 'approved' | 'rejected' | 'returned';
  dept_manager_approval_date?: string;
  dept_manager_declaration?: string;
  dept_manager_notes?: string;

  // Specialist
  assigned_specialist_id?: string;
  assigned_specialist_name?: string;
  assigned_specialist_email?: string;
  specialist_checklist?: Record<string, { value: boolean | null; note?: string }>;
  specialist_declaration?: string;
  specialist_review_date?: string;
  specialist_action?: 'completed' | 'returned' | 'closed' | 'referred_to_committee';
  specialist_notes?: string;

  // Committee
  intake_method?: string;
  budget_amount?: number;
  committee_overview?: string;
  committee_recommendation?: 'approved' | 'rejected';
  committee_recommendation_reasons?: string;
  committee_attendees?: Array<{
    name: string;
    email: string;
    role: string;
    has_approved?: boolean;
    approval_date?: string;
    declaration?: string;
    notes?: string;
  }>;
  committee_submitted_at?: string;
  committee_completed_at?: string;

  // Overall status
  status: string;
  admin_approval_date?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}
