import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isLocalMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

// Routes restricted to admin users only
const ADMIN_ONLY_ROUTES = ["/settings", "/goals", "/content", "/leads", "/customers", "/financial", "/applications", "/campaigns", "/meetings"];

export async function middleware(request: NextRequest) {
  // Skip auth entirely in local mode
  if (isLocalMode) {
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

  const { data: { user } } = await supabase.auth.getUser();

  // Skip auth for webhook endpoints — they use their own key-based auth
  if (request.nextUrl.pathname.startsWith("/api/webhook")) {
    return NextResponse.next({ request });
  }

  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // RBAC: Block admin-only routes for non-admin users
  if (user) {
    const isAdminRoute = ADMIN_ONLY_ROUTES.some(
      (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + "/")
    );

    if (isAdminRoute) {
      // Use service role key via direct fetch to bypass RLS infinite recursion bug
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const roleRes = await fetch(
        `${supabaseUrl}/rest/v1/user_roles?select=role&user_id=eq.${user.id}&limit=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const roleRows: { role: string }[] = roleRes.ok ? await roleRes.json() : [];
      const isAdmin = roleRows[0]?.role === "admin";

      if (!isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
