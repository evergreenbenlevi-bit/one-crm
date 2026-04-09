import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isLocalMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

// Routes restricted to admin users only
const ADMIN_ONLY_ROUTES = ["/settings", "/goals", "/content", "/leads", "/customers", "/financial", "/applications", "/campaigns", "/meetings", "/agents"];

// Routes that course_editor role can access (everything else is blocked)
const COURSE_EDITOR_ALLOWED = ["/course-builder", "/api/course", "/login"];

export async function middleware(request: NextRequest) {
  // Skip auth entirely in local mode
  if (isLocalMode) {
    return NextResponse.next({ request });
  }

  // Skip auth for webhook endpoints and internal AI endpoints
  if (
    request.nextUrl.pathname.startsWith("/api/webhook") ||
    request.nextUrl.pathname.startsWith("/api/chat") ||
    request.nextUrl.pathname.startsWith("/api/crm-query")
  ) {
    return NextResponse.next({ request });
  }

  // Skip auth for API routes with valid x-crm-secret header (Jarvis / CLI access)
  const CRM_SECRET = process.env.CRM_API_SECRET || "crm-jarvis-dda52f158017635af1a4deba";
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    request.headers.get("x-crm-secret") === CRM_SECRET
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname.startsWith("/login")) {
    // Redirect to appropriate page based on role
    const ROLE_COOKIE = `crm_role_${user.id}`;
    const cachedRole = request.cookies.get(ROLE_COOKIE)?.value;
    const url = request.nextUrl.clone();
    url.pathname = cachedRole === "course_editor" ? "/course-builder" : "/";
    return NextResponse.redirect(url);
  }

  // RBAC: Role-based access control
  if (user) {
    const ROLE_COOKIE = `crm_role_${user.id}`;
    let userRole = request.cookies.get(ROLE_COOKIE)?.value;

    if (!userRole) {
      // First request: fetch role from DB and cache for 5 minutes
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const roleRes = await fetch(
        `${supabaseUrl}/rest/v1/user_roles?select=role&user_id=eq.${user.id}&limit=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const roleRows: { role: string }[] = roleRes.ok ? await roleRes.json() : [];
      userRole = roleRows[0]?.role || "user";
      supabaseResponse.cookies.set(ROLE_COOKIE, userRole, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 300,
        path: "/",
      });
    }

    // course_editor: can ONLY access course-builder + course API
    if (userRole === "course_editor") {
      const isAllowed = COURSE_EDITOR_ALLOWED.some(
        (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + "/")
      );
      if (!isAllowed) {
        const url = request.nextUrl.clone();
        url.pathname = "/course-builder";
        return NextResponse.redirect(url);
      }
    }

    // admin-only routes: block non-admin users
    if (userRole !== "admin") {
      const isAdminRoute = ADMIN_ONLY_ROUTES.some(
        (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + "/")
      );
      if (isAdminRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhook|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
