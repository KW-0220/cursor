import "server-only";
import { createServerClient } from "@supabase/ssr";
import {
  createAdminClient as createServerAdminClient,
  createContextClient,
  extractCredentials,
  verifyCredentials,
} from "@supabase/server/core";
import type {
  AuthModeWithKey,
  SupabaseContext,
  SupabaseEnv,
} from "@supabase/server";
import { cookies } from "next/headers";
import {
  getSupabaseJwksUrl,
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

function resolveNextEnv(): Partial<SupabaseEnv> {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const secretKey = getSupabaseSecretKey();

  return {
    url: url || undefined,
    publishableKeys: publishableKey ? { default: publishableKey } : {},
    secretKeys: secretKey ? { default: secretKey } : {},
  };
}

let cachedJwks: SupabaseEnv["jwks"] = null;

async function getJwks(supabaseUrl: string): Promise<SupabaseEnv["jwks"]> {
  if (cachedJwks) return cachedJwks;
  try {
    const jwksUrl =
      getSupabaseJwksUrl() ||
      `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
    const res = await fetch(jwksUrl, { cache: "no-store" });
    if (!res.ok) return null;
    cachedJwks = (await res.json()) as SupabaseEnv["jwks"];
    return cachedJwks;
  } catch {
    return null;
  }
}

/**
 * Next.js SSR adapter：@supabase/ssr cookies + @supabase/server/core verify。
 * @see node_modules/@supabase/server/docs/ssr-frameworks.md
 */
export async function createSupabaseContext(
  options: {
    auth?: AuthModeWithKey | AuthModeWithKey[];
    request?: Request;
  } = { auth: "user" },
): Promise<
  { data: SupabaseContext; error: null } | { data: null; error: Error }
> {
  const nextEnv = resolveNextEnv();

  if (!nextEnv.url || !nextEnv.publishableKeys?.default) {
    return {
      data: null,
      error: new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY"),
    };
  }

  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    nextEnv.url,
    nextEnv.publishableKeys.default,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options: opts }) => {
              cookieStore.set(name, value, opts);
            });
          } catch {
            // Server Component 無法 set cookie；proxy 負責 refresh
          }
        },
      },
    },
  );

  const {
    data: { session },
  } = await ssrClient.auth.getSession();
  let token = session?.access_token ?? null;
  let apikey: string | null = null;

  // Route Handler 亦可帶 Authorization / apikey（非 cookie）
  if (options.request) {
    const creds = extractCredentials(options.request);
    if (!token && creds.token) token = creds.token;
    apikey = creds.apikey;
  }

  const jwks = await getJwks(nextEnv.url);
  const env: Partial<SupabaseEnv> = { ...nextEnv, jwks };

  const { data: auth, error } = await verifyCredentials(
    { token, apikey },
    { auth: options.auth ?? "user", env },
  );

  if (error) {
    return { data: null, error };
  }

  const supabase = createContextClient({
    auth: { token: auth!.token },
    env,
  });
  const supabaseAdmin = createServerAdminClient({ env });

  return {
    data: {
      supabase,
      supabaseAdmin,
      userClaims: auth!.userClaims,
      jwtClaims: auth!.jwtClaims,
      authMode: auth!.authMode,
    },
    error: null,
  };
}

/** 後台：必須係已登入 + app_metadata.role = admin */
export async function requireAdminContext(request?: Request): Promise<
  | { data: SupabaseContext; error: null }
  | { data: null; error: Error; status: number }
> {
  const result = await createSupabaseContext({
    auth: "user",
    request,
  });
  if (result.error || !result.data) {
    return {
      data: null,
      error: result.error ?? new Error("UNAUTHORIZED"),
      status: 401,
    };
  }

  const appRole =
    (
      result.data.jwtClaims as {
        app_metadata?: { role?: string };
      } | null
    )?.app_metadata?.role ??
    (
      result.data.userClaims as {
        app_metadata?: { role?: string };
      } | null
    )?.app_metadata?.role;

  if (appRole !== "admin") {
    return {
      data: null,
      error: new Error("FORBIDDEN_ADMIN"),
      status: 403,
    };
  }

  return { data: result.data, error: null };
}

/** 開戶文件通後台：必須已登入 + app_metadata.role = biz_admin */
export async function requireBizAdminContext(request?: Request): Promise<
  | { data: SupabaseContext; error: null }
  | { data: null; error: Error; status: number }
> {
  const result = await createSupabaseContext({
    auth: "user",
    request,
  });
  if (result.error || !result.data) {
    return {
      data: null,
      error: result.error ?? new Error("UNAUTHORIZED"),
      status: 401,
    };
  }

  const appRole =
    (
      result.data.jwtClaims as {
        app_metadata?: { role?: string };
      } | null
    )?.app_metadata?.role ??
    (
      result.data.userClaims as {
        app_metadata?: { role?: string };
      } | null
    )?.app_metadata?.role;

  if (appRole !== "biz_admin") {
    return {
      data: null,
      error: new Error("FORBIDDEN_BIZ_ADMIN"),
      status: 403,
    };
  }

  return { data: result.data, error: null };
}
