export type AppEnvironment = "development" | "preprod-local" | "production";
export type RuntimeAuthMode = "supabase" | "bypass";

export interface RuntimeEnvironmentInput {
  appEnvironment?: string | undefined;
  authMode?: string | undefined;
  hostname?: string | undefined;
  supabaseUrl?: string | undefined;
  viteMode: string;
}

export interface RuntimeEnvironment {
  appEnvironment: AppEnvironment;
  authMode: RuntimeAuthMode;
  isLocalPreprod: boolean;
  usesLocalSupabase: boolean;
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

function appEnvironmentFrom(input: RuntimeEnvironmentInput): AppEnvironment {
  const configured = input.appEnvironment?.trim();
  if (!configured) return input.viteMode === "production" ? "production" : "development";
  if (["development", "preprod-local", "production"].includes(configured)) {
    return configured as AppEnvironment;
  }
  throw new Error(`Unsupported VITE_APP_ENV '${configured}'.`);
}

function authModeFrom(input: RuntimeEnvironmentInput): RuntimeAuthMode {
  const configured = input.authMode?.trim() || "supabase";
  if (configured === "supabase" || configured === "bypass") return configured;
  throw new Error(`Unsupported VITE_AUTH_MODE '${configured}'.`);
}

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname.trim().toLowerCase());
}

export function isLocalSupabaseUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:"
      && isLocalHostname(url.hostname)
      && url.port === "54321"
      && url.pathname === "/"
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}

export function resolveRuntimeEnvironment(input: RuntimeEnvironmentInput): RuntimeEnvironment {
  const appEnvironment = appEnvironmentFrom(input);
  const authMode = authModeFrom(input);
  const usesLocalSupabase = isLocalSupabaseUrl(input.supabaseUrl);

  if (appEnvironment === "preprod-local") {
    const failures: string[] = [];
    if (input.viteMode !== "preprod") failures.push("the Vite build mode must be preprod");
    if (!usesLocalSupabase) {
      failures.push("VITE_SUPABASE_URL must be http://localhost:54321 or http://127.0.0.1:54321");
    }
    if (input.hostname !== undefined && !isLocalHostname(input.hostname)) {
      failures.push("the application hostname must be localhost or 127.0.0.1");
    }
    if (failures.length) {
      throw new Error(`DemandLint local pre-production refused: ${failures.join("; ")}.`);
    }
  }

  if (authMode === "bypass") {
    const failures: string[] = [];
    if (appEnvironment !== "preprod-local") failures.push("VITE_APP_ENV must be preprod-local");
    if (failures.length) {
      throw new Error(`DemandLint auth bypass refused: ${failures.join("; ")}.`);
    }
  }

  return {
    appEnvironment,
    authMode,
    isLocalPreprod: appEnvironment === "preprod-local",
    usesLocalSupabase,
  };
}
