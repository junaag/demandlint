import { useState, type FormEvent } from "react";

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

export function AccountGate({
  mode,
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
  const creating = mode === "signup";

  async function requestAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const verificationRequired = await onRequestAccess(email, mode);
      if (verificationRequired) {
        setStage("code");
        setCode("");
      }
    } catch {
      // The parent exposes the backend error in the shared alert.
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await onVerifyCode(email, code);
    } catch {
      // The parent exposes the backend error in the shared alert.
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setNotice(null);
    try {
      await onRequestAccess(email, mode);
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

  const formCard = (
    <section className={`auth-card ${creating ? "signup-card" : ""}`} aria-labelledby="auth-title">
      {!creating && (
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">D</span>
          <strong>DemandLint</strong>
        </div>
      )}

      <div className="auth-heading">
        <h1 id="auth-title">
          {stage === "code"
            ? "Check your email"
            : creating
              ? "Start cleaning leads for free"
              : "Welcome back!"}
        </h1>
        <p>
          {stage === "code"
            ? <>Enter the 6-digit code sent to <strong>{email}</strong>.</>
            : creating
              ? "Create your workspace with your work email. No password needed."
              : "Sign in with your work email. We will send you a secure one-time code."}
        </p>
      </div>

      {stage === "email" && (
        <>
          <div className={`auth-providers ${creating ? "" : "login-providers"}`} aria-label="Sign-in options">
            <button
              type="button"
              disabled={!googleEnabled || busy}
              title={googleEnabled ? "Continue with Google" : "Google sign-in coming soon"}
              onClick={() => void openProvider("google")}
            >
              <span className="google-symbol" aria-hidden="true">G</span>
              Google
            </button>
            <button
              type="button"
              disabled={!microsoftEnabled || busy}
              title={microsoftEnabled ? "Continue with Microsoft" : "Microsoft sign-in coming soon"}
              onClick={() => void openProvider("azure")}
            >
              <span className="microsoft-symbol" aria-hidden="true"><i /><i /><i /><i /></span>
              Microsoft
            </button>
            {!creating && (
              <button type="button" disabled title="Organization SSO coming later">
                <svg className="organization-symbol" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="8" cy="8" r="4" />
                  <path d="M11 11l9 9m-3-3 2-2m-5-1 2-2" />
                </svg>
                Organization
              </button>
            )}
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
            {busy ? "Sending code…" : creating ? "Create my account" : "Continue with email"}
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

      {stage === "email" && (
        <p className="auth-switch">
          {creating ? "Already have an account?" : "Do not have an account yet?"}{" "}
          <a href={creating ? "?page=login" : "./"}>
            {creating ? "Sign in" : "Create an account for free"}
          </a>
        </p>
      )}

      <p className="auth-legal">
        {creating ? (
          <>
            By continuing, you agree to the <a href="?page=terms">Terms and Conditions</a> and{" "}
            <a href="?page=privacy">Privacy Policy</a>.
          </>
        ) : hosted ? (
          <>DemandLint uses a secure one-time email code. No password is requested or stored.</>
        ) : (
          <>Local development preview: no real email is sent and no password is stored.</>
        )}
      </p>
    </section>
  );

  if (!creating) return <main className="auth-page login-page">{formCard}</main>;

  return (
    <main className="auth-page signup-page">
      <div className="signup-layout">
        <section className="signup-intro" aria-labelledby="signup-intro-title">
          <div className="signup-brand">
            <span className="auth-brand-mark" aria-hidden="true">D</span>
            <strong>DemandLint</strong>
          </div>
          <p className="eyebrow">CRM IMPORT PRE-FLIGHT</p>
          <h2 id="signup-intro-title">Clean every lead file before it reaches your CRM.</h2>
          <p>
            Detect mapping issues, normalize contact details and review duplicates before bad data
            reaches Salesforce or another CRM.
          </p>
          <ul className="signup-benefits">
            <li><span>✓</span> CSV and multi-sheet Excel support</li>
            <li><span>✓</span> Smart phone and email prioritization</li>
            <li><span>✓</span> Local processing — your lead files are never uploaded</li>
          </ul>
        </section>
        {formCard}
      </div>
    </main>
  );
}
