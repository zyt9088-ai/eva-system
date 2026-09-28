import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const STAFF_PREFIXES = ["/dashboard", "/tech-eval", "/vendor-perf", "/print"];
// Any authenticated role (not just staff) can hit these — /eval/[id] is the
// evaluation form itself; /direct-purchase allows employees to create and view their direct purchase justifications.
const EMPLOYEE_PREFIXES = ["/my-tasks", "/eval", "/direct-purchase"];
const PROTECTED_PREFIXES = [...STAFF_PREFIXES, ...EMPLOYEE_PREFIXES];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isStaffRoute = STAFF_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isProtected && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.redirect(new URL("/no-access", request.url));
    }

    // Staff screens belong to procurement only. An `executive` signs direct
    // purchase requests and has no business on the evaluation dashboard, so
    // they're bounced to the module they actually work in rather than to
    // /my-tasks, which is where an employee's own tasks live.
    if (isStaffRoute && profile.role !== "admin" && profile.role !== "specialist") {
      const fallback = profile.role === "executive" ? "/direct-purchase" : "/my-tasks";
      return NextResponse.redirect(new URL(fallback, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|api/public-eval|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
