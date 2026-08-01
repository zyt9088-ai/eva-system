# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

"نظام قيّم" (Qayyem) — an internal evaluation-request tool for برنامج تطوير وزارة الحرس الوطني. Procurement staff create evaluation requests (vendor comparisons, EVF-weighted technical evaluations, general spec-matching), assign evaluators by email, and track approval. UI is Arabic/RTL throughout.

## Commands

- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build (also runs the TypeScript check)
- `npx tsc --noEmit` — typecheck only, faster than a full build; use this while iterating
- `npm run lint` — ESLint (`eslint.config.mjs`); the codebase currently carries a large number of pre-existing `@typescript-eslint/no-explicit-any` and `@ts-ignore` warnings — don't try to fix unrelated ones in an unrelated change
- No test runner is configured in this repo (no Jest/Vitest, no test files).

## Architecture

### Roles and auth

Auth is Microsoft 365 / Azure AD via Supabase Auth's Azure provider only — there is no email/password login. Three roles live in `profiles.role`:

- `admin` (مدير مشتريات) — full permissions including permanent delete and user management.
- `specialist` (أخصائي مشتريات) — everything except permanent delete and user management.
- `employee` (موظف) — default role auto-created for any `@mngdp.com` account on first login; scoped to `/my-tasks` (their own evaluation tasks, matched by email).

`supabase/migrations/20260730_profiles_and_rls.sql` is the single source of truth for the schema, the `handle_new_user()` trigger (auto-creates a `profiles` row on first Azure login, using `pending_invites` to pre-assign `admin`/`specialist` by email if the admin invited them from `/dashboard/users`), and all RLS policies. It is hand-maintained and meant to be **re-run wholesale in the Supabase SQL Editor** after any edit — every statement is idempotent (`drop policy if exists` + `create policy`, `create table if not exists`, etc.) specifically so the whole file can be pasted and run again safely. There is no Supabase CLI/migration-runner wired up.

Route access is enforced in `proxy.ts` (not `middleware.ts` — see AGENTS.md: this Next.js version renamed Middleware to Proxy). It checks the Supabase session and the caller's `profiles.role`:

- `/dashboard`, `/tech-eval`, `/vendor-perf`, `/print` — staff only (`admin`/`specialist`); an `employee` hitting these is redirected to `/my-tasks`.
- `/my-tasks` — any authenticated role.
- No session on a protected route → redirect to `/`. No profile row at all → `/no-access` (should be rare now that `handle_new_user` always creates one).

### Supabase clients (`lib/supabase/`)

Three variants, don't mix them up:

- `client.ts` — browser client (anon key), used from `"use client"` components/hooks.
- `server.ts` — SSR client for Route Handlers/Server Components, cookie-based session (`await cookies()`, async in this Next.js version).
- `admin.ts` — `service_role` key, **server-only**, bypasses RLS entirely. Used only by API routes that must act without a user session (e.g. `app/api/public-eval/*`, `app/api/notify-evaluators`). Never import this from client code.

### Evaluation data model

`evaluations` is the parent row; `vendors`, `evaluators`, `evf_criteria`, `evaluated_items` are child tables keyed by `evaluation_id`. Important quirks:

- `evaluators.email` is a plain text column, **not** a foreign key to `auth.users`. Matching a logged-in person to their evaluation tasks (`/my-tasks`, `/eval/[id]`) is done by comparing `auth` email to `evaluators.email` at query time.
- Per-evaluator submissions live in `evaluations.item_evaluations` (jsonb), keyed by that evaluator's **array index** within the evaluation's `evaluators` list — not by id or email. This means evaluator order matters.
- Editing an evaluation (`hooks/useEvaluations.ts`'s `editMutation`) deletes and re-inserts `vendors`/`evaluators`/`evf_criteria`/`evaluated_items` wholesale rather than diffing, and intentionally resets `status` to `"قيد التجهيز"` and clears `item_evaluations` — editing a request always re-opens it for evaluators.
- `lib/evaluation-utils.ts`'s `mapEvaluationRow()` is the canonical snake_case-DB-row → camelCase-frontend-shape mapper. Reused by `hooks/useEvaluations.ts`, `app/api/public-eval/[id]/route.ts`, and `app/my-tasks/page.tsx` — route new code that reads evaluation rows through it instead of re-deriving the mapping.
- `public.employee_directory` (name/phone/department/email, admin-write via RLS, any authenticated read) is a separate lookup table — not a source of truth for evaluators. `/dashboard/employees` (admin-only) manages it, including bulk import/export via `xlsx` (SheetJS), upserting by `email`. `components/features/evaluations/create-eval-modal.tsx`'s committee step uses it only to prefill an evaluator's name/email (via `useEvaluationForm.ts`'s `handleEvaluatorSelect`) — the manual name/email fields remain the actual source of truth and stay editable for people not in the directory.

### Email

`lib/resend.ts` wraps the Resend client; it degrades gracefully (`resend` is `null`) when `RESEND_API_KEY` isn't set, so evaluation create/edit never fails because email is unconfigured. `app/api/notify-evaluators/route.ts` sends the actual notification; calls to it are fire-and-forget from `hooks/useEvaluations.ts` on create/edit, and on-demand (with a toast result) via the "تذكير" button in `evaluation-list.tsx` → `useEvaluations()`'s `remindEvaluator`.

### UI conventions

- Tailwind v4 + shadcn (`components.json`: style `radix-nova`, icon library lucide). Prefer existing primitives in `components/ui/` (e.g. `ModernDropdown` — a portal-based custom dropdown with an optional `searchable` prop for a filter input, used for e.g. the employee-directory picker; there should be no native `<select>` in this codebase) over ad hoc markup.
- No native `window.confirm`/`window.alert` — use `useConfirm()` from `components/ui/confirm-dialog.tsx` (its `ConfirmProvider` is mounted once in the root layout, same "mount once globally" rule as `<Toaster/>`) for a styled confirmation modal instead.
- Pages set `dir="rtl"` and inject the Cairo font via a per-page `<style>` tag rather than a global font — when adding a new top-level page, copy this pattern from an existing one rather than assuming a global stylesheet handles it.
- `AppHeader`/`AppFooter` (`components/layout/`) are role-aware (they read `useCurrentProfile()`) and used across all authenticated pages.
- Some older pages are still untyped `.jsx` (`app/dashboard/page.jsx`, `app/tech-eval/page.jsx`, `app/vendor-perf/page.jsx`) while newer code is `.tsx` — match the file's existing style rather than converting it as a drive-by change.

## قواعد العمل (إلزامية)

### نطاق التنفيذ

- نفّذ المطلوب فقط، ولا تلمس أي شيء خارج نطاق الطلب بالضبط.
- عدّل الجزء المطلوب فقط — لا تعيد كتابة ملف كامل إذا كان التعديل يخص جزء محدد.
- لا تحذف أو تعلّق على كود موجود إلا إذا طلبت منك ذلك صراحة.
- لا تصلح تحذيرات `no-explicit-any` أو `@ts-ignore` القديمة غير المرتبطة بالتعديل الحالي.

### الاعتماديات والمكتبات

- لا تضيف أي مكتبة أو حزمة (dependency) جديدة بدون ما تسألني وتاخذ موافقتي أولًا.
- لا تحدّث إصدارات المكتبات الموجودة بدون إذن.

### قبل التنفيذ

- اسأل قبل أي تعديل كبير أو تغيير في البنية، واشرح لي الخطة أولًا وانتظر موافقتي.
- إذا الطلب غير واضح أو ناقص، اسألني ولا تفترض — واقترح علي خيارات حسب الموضوع.

### الجودة والالتزام بأنماط المشروع

- التزم بنفس نمط الكود والتسمية الموجود، وطابق نوع الملف (`.jsx` مقابل `.tsx`) بدل تحويله.
- لا تستخدم `<select>` أصلي — استعمل `ModernDropdown` والمكوّنات في `components/ui/`.
- أي كود يقرأ صفوف التقييمات مرّره عبر `mapEvaluationRow()` بدل إعادة اشتقاق التحويل.
- حافظ على RTL وخط Cairo بنمط الحقن لكل صفحة عند إضافة صفحة جديدة.
- بعد أي تعديل، تأكد إن الكود يعدّي `npx tsc --noEmit` وأخبرني بالنتيجة.

### الأمان وقاعدة البيانات

- لا تغيّر ملفات الإعدادات (config) أو متغيرات البيئة (env) بدون إذن.
- لا تستورد `admin.ts` (service_role) من كود العميل أبدًا — server-only فقط.
- انتبه لصلاحيات RLS والأدوار الثلاثة عند أي تعديل يخص قاعدة البيانات، وأي تعديل على ملف الـ migration خلّه idempotent قابل لإعادة التشغيل كامل.
- ضبط الوصول للمسارات يكون في `proxy.ts` مو `middleware.ts`.
