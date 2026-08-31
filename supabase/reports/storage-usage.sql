-- ============================================================================
-- تقرير استهلاك التخزين — نظام قيّم
-- ============================================================================
-- الاستخدام: الصق الملف كاملًا في Supabase SQL Editor واضغط Run.
--
-- قبل التشغيل: عدّل الرقمين في كتلة plan_quota أدناه ليطابقا خطتك الحالية
-- (تجدها في: اسم المؤسسة أعلى اليسار ← Billing).
--   خطة Free : تخزين 1 جيجا   | قاعدة بيانات 0.5 جيجا
--   خطة Pro  : تخزين 100 جيجا | قاعدة بيانات 8 جيجا
--
-- ملاحظة: هذا التقرير يقيس التخزين وقاعدة البيانات فقط. حجم البيانات
-- الصادرة (Egress) لا يمكن قراءته عبر SQL — يُعرض في لوحة التحكم تحت Usage.
--
-- التقرير للقراءة فقط: لا ينشئ ولا يعدّل ولا يحذف أي شيء، فتشغيله آمن
-- في أي وقت وبأي عدد من المرات.
-- ============================================================================

with plan_quota as (
  select
    100::numeric as storage_quota_gb,   -- ← حد التخزين بالجيجا (Pro = 100)
    8::numeric as db_quota_gb           -- ← حد قاعدة البيانات بالجيجا (Pro = 8)
),
q as (
  select
    storage_quota_gb * 1024::numeric ^ 3 as storage_quota_bytes,
    db_quota_gb * 1024::numeric ^ 3 as db_quota_bytes
  from plan_quota
),
-- إجمالي ما رُفع فعليًا إلى Storage عبر كل البكتات
s as (
  select
    coalesce(sum((metadata->>'size')::bigint), 0)::numeric as bytes,
    count(*)::numeric as files,
    coalesce(avg((metadata->>'size')::bigint), 0)::numeric as avg_bytes
  from storage.objects
),
per_bucket as (
  select
    bucket_id,
    coalesce(sum((metadata->>'size')::bigint), 0)::numeric as bytes,
    count(*)::numeric as files
  from storage.objects
  group by bucket_id
),
db as (
  select pg_database_size(current_database())::numeric as bytes
),
-- المرفقات القديمة المحفوظة base64 داخل صفوف الجدول (قبل النقل إلى Storage)
legacy as (
  select
    count(*)::numeric as rows_count,
    coalesce(sum(octet_length(attachments::text)), 0)::numeric as bytes
  from public.direct_purchase_requests
  where attachments::text like '%dataUrl%'
),
remaining as (
  select greatest(q.storage_quota_bytes - s.bytes, 0) as bytes
  from q, s
),
report as (

  -- 1) التخزين الكلي مقابل حد الخطة
  select
    1 as ord,
    '📦 التخزين — إجمالي الملفات' as "البند",
    pg_size_pretty(s.bytes::bigint) || ' (' || s.files::text || ' ملف)' as "القيمة",
    pg_size_pretty(q.storage_quota_bytes::bigint) as "حد الخطة",
    round(100 * s.bytes / nullif(q.storage_quota_bytes, 0), 1)::text || '%' as "النسبة",
    pg_size_pretty(greatest(q.storage_quota_bytes - s.bytes, 0)::bigint) as "المتبقي",
    case
      when s.bytes / nullif(q.storage_quota_bytes, 0) >= 0.90 then '🔴 تصرّف الآن'
      when s.bytes / nullif(q.storage_quota_bytes, 0) >= 0.75 then '🟠 خطّط لحل'
      when s.bytes / nullif(q.storage_quota_bytes, 0) >= 0.50 then '🟡 راقب'
      else '🟢 مرتاح'
    end as "الحالة"
  from s, q

  union all

  -- 2) تفصيل كل بكت على حدة
  select
    2,
    '   ├─ ' || bucket_id,
    pg_size_pretty(bytes::bigint) || ' (' || files::text || ' ملف)',
    '—',
    '—',
    '—',
    '—'
  from per_bucket

  union all

  -- 3) قاعدة البيانات مقابل حد الخطة
  select
    3,
    '🗄️ قاعدة البيانات',
    pg_size_pretty(db.bytes::bigint),
    pg_size_pretty(q.db_quota_bytes::bigint),
    round(100 * db.bytes / nullif(q.db_quota_bytes, 0), 1)::text || '%',
    pg_size_pretty(greatest(q.db_quota_bytes - db.bytes, 0)::bigint),
    case
      when db.bytes / nullif(q.db_quota_bytes, 0) >= 0.90 then '🔴 تصرّف الآن'
      when db.bytes / nullif(q.db_quota_bytes, 0) >= 0.75 then '🟠 خطّط لحل'
      when db.bytes / nullif(q.db_quota_bytes, 0) >= 0.50 then '🟡 راقب'
      else '🟢 مرتاح'
    end
  from db, q

  union all

  -- 4) المرفقات القديمة المحبوسة داخل الجدول
  select
    4,
    '♻️ مرفقات قديمة base64 داخل الجدول',
    pg_size_pretty(legacy.bytes::bigint) || ' (' || legacy.rows_count::text || ' طلب)',
    '—',
    '—',
    '—',
    case when legacy.rows_count > 0 then '🟠 تستحق الترحيل إلى Storage' else '🟢 لا يوجد' end
  from legacy

  union all

  -- 5) الطاقة المتبقية بمتوسط حجم الملفات الفعلي
  select
    5,
    '🧮 كم ملفًا إضافيًا يتّسع (بالمتوسط الحالي)',
    case
      when s.avg_bytes > 0 then floor(remaining.bytes / s.avg_bytes)::text || ' ملف'
      else 'لا توجد ملفات بعد للقياس'
    end,
    'متوسط الملف: ' || case when s.avg_bytes > 0 then pg_size_pretty(s.avg_bytes::bigint) else '—' end,
    '—',
    '—',
    '—'
  from s, remaining

  union all

  -- 6) أسوأ حالة: كل ملف بالحد الأقصى المسموح (30 ميجا)
  select
    6,
    '⚠️ كم ملفًا يتّسع لو كان كل ملف 30 ميجا',
    floor(remaining.bytes / (30 * 1024 * 1024))::text || ' ملف',
    'الحد الأقصى للملف الواحد: 30 MB',
    '—',
    '—',
    '—'
  from remaining
)
select "البند", "القيمة", "حد الخطة", "النسبة", "المتبقي", "الحالة"
from report
order by ord, "البند";
