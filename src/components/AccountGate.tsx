import { useState, type FormEvent } from "react";
import type { CreateAccountInput } from "../application/public";

export type AccountMode = "signup" | "login";

interface AccountGateProps {
  mode: AccountMode;
  onCreateAccount: (input: CreateAccountInput) => void;
  onSignIn: (email: string) => void;
  error?: string | null;
}

export function AccountGate({ mode, onCreateAccount, onSignIn, error }: AccountGateProps) {
  const [email, setEmail] = useState("");
  const creating = mode === "signup";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) onCreateAccount({ email });
    else onSignIn(email);
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
          {creating ? "Start cleaning leads for free" : "Welcome back!"}
        </h1>
        <p>
          {creating
            ? "Create your workspace with your work email."
            : "Sign in to your DemandLint workspace."}
        </p>
      </div>

      <div className={`auth-providers ${creating ? "" : "login-providers"}`} aria-label="Future sign-in options">
        <button type="button" disabled title="Google sign-in coming soon">
          <span className="google-symbol" aria-hidden="true">G</span>
          Google
        </button>
        <button type="button" disabled title="Microsoft sign-in coming soon">
          <span className="microsoft-symbol" aria-hidden="true">
            <i /><i /><i /><i />
          </span>
          Microsoft
        </button>
        {!creating && (
          <button type="button" disabled title="Organization SSO coming soon">
            <svg className="organization-symbol" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="8" cy="8" r="4" />
              <path d="M11 11l9 9m-3-3 2-2m-5-1 2-2" />
            </svg>
            Organization
          </button>
        )}
      </div>

      <div className="auth-separator"><span>or</span></div>

      {error && <div className="alert error-alert auth-error" role="alert">{error}</div>}

      <form className="auth-form" onSubmit={submit}>
        <label>
          <span>{creating ? "Work email" : "Email"}</span>
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
        <button className="button primary auth-submit" type="submit">
          {creating ? "Create my account" : "Sign in"}
        </button>
      </form>

      <p className="auth-switch">
        {creating ? "Already have an account?" : "Do not have an account yet?"}{" "}
        <a href={creating ? "?page=login" : "./"}>
          {creating ? "Sign in" : "Create an account for free"}
        </a>
      </p>

      <p className="auth-legal">
        {creating ? (
          <>
            By continuing, you agree to the <a href="?page=terms">Terms and Conditions</a> and{" "}
            <a href="?page=privacy">Privacy Policy</a>.
          </>
        ) : (
          <>This preview uses local email sign-in. No password is requested or stored.</>
        )}
      </p>
    </section>
  );

  if (!creating) {
    return <main className="auth-page login-page">{formCard}</main>;
  }

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
