import {
  resolveRuntimeEnvironment,
  type RuntimeEnvironment,
} from "../application/runtimeEnvironment";

export function getBrowserRuntimeEnvironment(): RuntimeEnvironment {
  return resolveRuntimeEnvironment({
    appEnvironment: import.meta.env.VITE_APP_ENV,
    authMode: import.meta.env.VITE_AUTH_MODE,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    viteMode: import.meta.env.MODE,
    ...(typeof window === "undefined" ? {} : { hostname: window.location.hostname }),
  });
}
