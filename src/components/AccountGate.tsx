import { useEffect, useState, type FormEvent } from "react";

export type AccountMode = "signup" | "login";
type OAuthProvider = "google" | "azure";
type AuthStage = "email" | "code";

interface AccountGateProps {
  mode: AccountMode;
  initialEmail?: string;
  hosted: boolean;
  googleEnabled: boolean;
  microsoftEnabled: boolean;
  onRequestAccess: (email: string, mode: AccountMode) => Promise<boolean>;
  onVerifyCode: (email: string, code: string) => Promise<void>;
  onProviderSignIn: (provider: OAuthProvider) => Promise<void>;
  error?: string | null;
}

function authPathFor(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, "");
  if (normalized.endsWith("/auth")) return normalized || "/auth";
  return normalized ? `${normalized}/auth` : "/auth";
}

function workspacePathFor(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, "");
  if (!normalized.endsWith("/auth")) return pathname || "/";
  return normalized.slice(0, -"/auth".length) || "/";
}

function replaceWithAuthPath(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.delete("page");
  const search = params.toString();
  const href = `${authPathFor(window.location.pathname)}${search ? `?${search}` : ""}`;
  window.history.replaceState(null, "", href);
}

function replaceWithWorkspacePath(): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", workspacePathFor(window.location.pathname));
}

export function AccountGate({
  initialEmail = "",
  hosted,
  googleEnabled,
  microsoftEnabled,
  onRequestAccess,
  onVerifyCode,
  onProviderSignIn,
  error,
}: AccountGateProps) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<AuthStage>("email");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    replaceWithAuthPath();
  }, []);

  async function requestUnifiedAccess(): Promise<boolean> {
    if (hosted) {
      // Always allow account creation so existing and new users follow the same non-enumerating flow.
      return onRequestAccess(email, "signup");
    }

    // Keep the local preview convenient without changing the local account repository contract.
    try {
      return await onRequestAccess(email, "login");
    } catch {
      return onRequestAccess(email, "signup");
    }
  }

  async function requestAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    if (!hosted) replaceWithWorkspacePath();
    try {
      const verificationRequired = await requestUnifiedAccess();
      if (verificationRequired) {
        replaceWithAuthPath();
        setStage("code");
        setCode("");
      }
    } catch {
      if (!hosted) replaceWithAuthPath();
      // The parent exposes the backend error in the shared alert.
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    replaceWithWorkspacePath();
    try {
      await onVerifyCode(email, code);
    } catch {
      replaceWithAuthPath();
      // The parent exposes the backend error in the shared alert.
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setNotice(null);
    try {
      await requestUnifiedAccess();
      setNotice("A new code has been sent.");
    } catch {
      // The parent exposes the backend error in the shared alert.
    } finally {
      setBusy(false);
    }
  }

  async function openProvider(provider: OAuthProvider) {
    setBusy(true);
    try {
      await onProviderSignIn(provider);
    } catch {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page login-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">D</span>
          <strong>DemandLint</strong>
        </div>

        <div className="auth-heading">
          <h1 id="auth-title">{stage === "code" ? "Check your email" : "Continue to DemandLint"}</h1>
          <p>
            {stage === "code"
              ? <>Enter the 6-digit code sent to <strong>{email}</strong>.</>
              : "Enter your work email. We will send you a secure one-time code. No password needed."}
          </p>
        </div>

        {stage === "email" && (
          <>
            <div className="auth-providers" role="group" aria-label="Sign-in options">
              <button
                className="auth-provider-button"
                type="button"
                aria-label="Continue with Google"
                disabled={!googleEnabled || busy}
                title={googleEnabled ? "Continue with Google" : "Google sign-in is not configured"}
                onClick={() => void openProvider("google")}
              >
                <svg className="auth-provider-icon" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.614Z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A9 9 0 0 0 9 18Z" />
                  <path fill="#FBBC05" d="M3.963 10.71A5.41 5.41 0 0 1 3.68 9c0-.593.102-1.17.283-1.71V4.958H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.042l3.007-2.332Z" />
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.345l2.582-2.582C13.464.891 11.426 0 9 0A9 9 0 0 0 .956 4.958L3.963 7.29C4.672 5.164 6.656 3.58 9 3.58Z" />
                </svg>
                <span className="auth-provider-label">Google</span>
              </button>
              <button
                className="auth-provider-button"
                type="button"
                aria-label="Continue with Microsoft"
                disabled={!microsoftEnabled || busy}
                title={microsoftEnabled ? "Continue with Microsoft" : "Microsoft sign-in is not configured"}
                onClick={() => void openProvider("azure")}
              >
                <svg className="auth-provider-icon" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#F35325" d="M0 0h8.5v8.5H0z" />
                  <path fill="#81BC06" d="M9.5 0H18v8.5H9.5z" />
                  <path fill="#05A6F0" d="M0 9.5h8.5V18H0z" />
                  <path fill="#FFBA08" d="M9.5 9.5H18V18H9.5z" />
                </svg>
                <span className="auth-provider-label">Microsoft</span>
              </button>
            </div>

            <div className="auth-separator"><span>or</span></div>
          </>
        )}

        {error && <div className="alert error-alert auth-error" role="alert">{error}</div>}
        {notice && <div className="alert success-alert auth-error" role="status">{notice}</div>}

        {stage === "email" ? (
          <form className="auth-form" onSubmit={(event) => void requestAccess(event)}>
            <label>
              <span>Work email</span>
              <input
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoFocus
              />
            </label>
            <button className="button primary auth-submit" type="submit" disabled={busy}>
              {busy ? "Sending code…" : "Send me a secure code"}
            </button>
          </form>
        ) : (
          <form className="auth-form otp-form" onSubmit={(event) => void verifyCode(event)}>
            <label>
              <span>Verification code</span>
              <input
                required
                className="otp-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                aria-describedby="otp-help"
                autoFocus
              />
            </label>
            <p id="otp-help" className="otp-help">The code expires shortly and can only be used once.</p>
            <button className="button primary auth-submit" type="submit" disabled={busy || code.length !== 6}>
              {busy ? "Verifying…" : "Verify and continue"}
            </button>
            <div className="otp-actions">
              <button type="button" className="text-button" disabled={busy} onClick={() => void resendCode()}>
                Resend code
              </button>
              <button type="button" className="text-button" disabled={busy} onClick={() => setStage("email")}>
                Change email
              </button>
            </div>
          </form>
        )}

        <p className="auth-legal">
          By continuing, you agree to the <a href="?page=terms">Terms and Conditions</a> and{" "}
          <a href="?page=privacy">Privacy Policy</a>.
          {hosted
            ? " DemandLint uses a secure one-time email code; no password is requested or stored."
            : " Local development preview: no real email is sent and no password is stored."}
        </p>
      </section>
    </main>
  );
}
