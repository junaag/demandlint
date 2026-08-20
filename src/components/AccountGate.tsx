import { useState, type FormEvent } from "react";
import type { CreateAccountInput } from "../application/public";

interface AccountGateProps {
  onContinue: (input: CreateAccountInput) => void;
  error?: string | null;
}

export function AccountGate({ onContinue, error }: AccountGateProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onContinue({ displayName, email, organizationName });
  }

  return (
    <main className="account-page">
      <section className="account-intro">
        <p className="eyebrow">DEMANDLINT V0.2</p>
        <h1>Your repeatable lead-cleaning workspace.</h1>
        <p>
          Keep contact priorities and mapping templates separated by organization while every
          uploaded lead file continues to be processed locally in your browser.
        </p>
        <ul className="account-benefits">
          <li><span>✓</span> Organization-level contact preferences</li>
          <li><span>✓</span> Reusable source mapping templates</li>
          <li><span>✓</span> Local lead processing — no file upload</li>
        </ul>
      </section>

      <section className="account-card panel">
        <div>
          <p className="section-label">LOCAL TEST PROFILE</p>
          <h2>Create or reopen your workspace</h2>
          <p className="muted-copy">
            This preview stores the profile on this device. Do not use a password; hosted Google,
            Microsoft and SSO authentication will replace this test adapter.
          </p>
        </div>

        {error && <div className="alert error-alert" role="alert">{error}</div>}

        <form className="account-form" onSubmit={submit}>
          <label>
            <span>Your name</span>
            <input
              required
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Alex Martin"
            />
          </label>
          <label>
            <span>Work email</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="alex@company.com"
            />
          </label>
          <label>
            <span>Organization</span>
            <input
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Acme Marketing"
            />
          </label>
          <button className="button primary wide" type="submit">Continue to DemandLint</button>
        </form>

        <div className="provider-preview" aria-label="Future sign-in providers">
          <button type="button" disabled>Google · coming next</button>
          <button type="button" disabled>Microsoft · coming next</button>
        </div>
      </section>
    </main>
  );
}
