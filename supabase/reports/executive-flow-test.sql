-- ============================================================================
-- اختبار مسار الاعتماد التنفيذي — يُشغَّل في Supabase SQL Editor
-- ============================================================================
-- يُنشئ طلب شراء مباشر وهميًا، يمشي به عبر كل مرحلة حتى الإقفال، يتحقق من أن
-- قاعدة البيانات تقبل الحالات والأعمدة الجديدة، ثم يحذفه. لا يبقى منه أثر.
-- آمن لإعادة التشغيل. رقم الطلب المستخدم "DP-SELFTEST" محجوز لهذا الغرض.
-- ============================================================================

create temp table if not exists _exec_test (n int, step text, result text);
truncate _exec_test;

do $$
declare
  v_id uuid;
  v_status text;
  v_active int;
  v_err text;
begin
  -- نظّف أي بقايا من تشغيل سابق تعطّل في منتصفه
  delete from public.direct_purchase_requests where request_number = 'DP-SELFTEST';

  -- 1) إنشاء الطلب (أقل من 50 ألف = المسار المباشر بلا لجنة)
  insert into public.direct_purchase_requests (
    request_number, requester_name, requester_email, department, request_title,
    estimated_cost, reason_type, scope_of_work, justification_reason,
    impact_if_rejected, vendor_name, dept_manager_email, dept_manager_name, status
  ) values (
    'DP-SELFTEST', 'موظف اختباري', 'selftest@mngdp.com', 'إدارة الاختبار',
    'اختبار آلي لمسار الاعتماد التنفيذي', 25000, 'single_source',
    'نطاق اختباري', 'مبرر اختباري', 'أثر اختباري', 'مورد اختباري',
    'selftest.manager@mngdp.com', 'مدير اختباري', 'pending_dept_manager'
  ) returning id into v_id;
  insert into _exec_test values (1, 'إنشاء الطلب', '✅ نجح');

  -- 2) اعتماد مدير الإدارة
  update public.direct_purchase_requests set
    dept_manager_approval_status = 'approved',
    dept_manager_approval_date = now(),
    status = 'pending_procurement_assign'
  where id = v_id;
  insert into _exec_test values (2, 'اعتماد مدير الإدارة', '✅ نجح');

  -- 3) تعيين الأخصائي ثم إكمال دراسته — هنا يتفرّع المسار الجديد
  update public.direct_purchase_requests set
    assigned_specialist_name = 'أخصائي اختباري',
    assigned_specialist_email = 'selftest.specialist@mngdp.com',
    specialist_action = 'completed',
    specialist_review_date = now(),
    status = 'pending_executive_approval'
  where id = v_id;
  insert into _exec_test values (3, 'إكمال الأخصائي ← بانتظار المدير التنفيذي', '✅ الحالة الجديدة مقبولة');

  -- 4) توقيع المدير العام التنفيذي
  update public.direct_purchase_requests set
    executive_approver_name = 'معتمد اختباري',
    executive_approver_email = 'selftest.exec@mngdp.com',
    executive_approver_role = 'executive',
    executive_decision = 'approved',
    executive_approval_date = now(),
    executive_declaration = 'إقرار اختباري',
    executive_notes = 'ملاحظة اختبارية',
    status = 'pending_closure'
  where id = v_id;
  insert into _exec_test values (4, 'اعتماد المدير التنفيذي', '✅ الأعمدة السبعة تُكتب بنجاح');

  -- 5) إقفال مدير المشتريات
  update public.direct_purchase_requests set
    closed_by_name = 'مدير مشتريات اختباري',
    closed_by_email = 'selftest.admin@mngdp.com',
    closure_date = now(),
    closure_notes = 'إقفال اختباري',
    status = 'approved'
  where id = v_id;

  select status into v_status from public.direct_purchase_requests where id = v_id;
  insert into _exec_test values (5, 'إقفال مدير المشتريات', '✅ الحالة النهائية: ' || v_status);

  -- 6) القيد يجب أن يرفض قرارًا غير معروف
  begin
    update public.direct_purchase_requests
      set executive_decision = 'maybe' where id = v_id;
    insert into _exec_test values (6, 'رفض قرار غير صالح', '❌ القيد لم يعمل — راجع الترحيل');
  exception when check_violation then
    insert into _exec_test values (6, 'رفض قرار غير صالح', '✅ القيد يعمل');
  end;

  delete from public.direct_purchase_requests where id = v_id;
  insert into _exec_test values (7, 'حذف الطلب الاختباري', '✅ لم يبقَ أثر');

exception when others then
  get stacked diagnostics v_err = message_text;
  insert into _exec_test values (99, 'توقف الاختبار', '❌ ' || v_err);
  delete from public.direct_purchase_requests where request_number = 'DP-SELFTEST';
end $$;

-- ============================================================================
-- اختبار مستقل: مُشغِّل "معتمد واحد فقط"
-- ============================================================================
do $$
declare
  v_active int;
  v_total int;
  v_was uuid;
  v_probe uuid;
begin
  select count(*) into v_total from public.direct_purchase_executives;
  if v_total < 2 then
    insert into _exec_test values (8, 'مُشغِّل المعتمد الواحد', '⚠️ يحتاج معتمدَين على الأقل — تخطّي');
    return;
  end if;

  -- احفظ المعتمد الحالي لإعادته بعد الاختبار — هذا الاختبار لا يغيّر تفويضك
  select id into v_was from public.direct_purchase_executives where is_active_approver;

  -- فوّض صفًا آخر: يجب أن يُلغى التفويض عن الأول تلقائيًا
  select id into v_probe from public.direct_purchase_executives
    where v_was is null or id <> v_was order by created_at limit 1;

  update public.direct_purchase_executives set is_active_approver = true where id = v_probe;
  select count(*) into v_active from public.direct_purchase_executives where is_active_approver;

  if v_active = 1 then
    insert into _exec_test values (8, 'مُشغِّل المعتمد الواحد', '✅ يعمل — التفويض انتقل ولم يتكرر');
  else
    insert into _exec_test values (8, 'مُشغِّل المعتمد الواحد', '❌ عدد المعتمدين الحاليين: ' || v_active);
  end if;

  -- أعد التفويض لصاحبه الأصلي
  if v_was is not null then
    update public.direct_purchase_executives set is_active_approver = true where id = v_was;
    insert into _exec_test values (9, 'إرجاع التفويض لصاحبه', '✅ لم يتغيّر تشكيلك');
  end if;
end $$;

-- ============================================================================
-- النتيجة
-- ============================================================================
select step as "الخطوة", result as "النتيجة" from _exec_test order by n;
