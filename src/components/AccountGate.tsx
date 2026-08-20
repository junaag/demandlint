import { useEffect, useState, type FormEvent } from "react";
import type { CreateAccountInput } from "../application/public";

type AccountMode = "signup" | "login";

interface AccountGateProps {
  onCreateAccount: (input: CreateAccountInput) => void;
  onSignIn: (email: string) => void;
  onModeChange: () => void;
  error?: string | null;
}

export function AccountGate({
  onCreateAccount,
  onSignIn,
  onModeChange,
  error,
}: AccountGateProps) {
  const [mode, setMode] = useState<AccountMode>(
    () => typeof window !== "undefined" && window.location.hash === "#login" ? "login" : "signup",
  );
  const [email, setEmail] = useState("");

  useEffect(() => {
    function syncModeFromUrl() {
      setMode(window.location.hash === "#login" ? "login" : "signup");
      onModeChange();
    }
    window.addEventListener("hashchange", syncModeFromUrl);
    return () => window.removeEventListener("hashchange", syncModeFromUrl);
  }, [onModeChange]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "signup") onCreateAccount({ email });
    else onSignIn(email);
  }

  function switchMode(nextMode: AccountMode) {
    setMode(nextMode);
    onModeChange();
  }

  const creating = mode === "signup";

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">D</span>
          <strong>DemandLint</strong>
        </div>

        <div className="auth-heading">
          <h1 id="auth-title">
            {creating ? "Essayez gratuitement" : "Bienvenue à nouveau !"}
          </h1>
          <p>
            {creating
              ? "Créez votre espace de travail avec votre e-mail professionnel."
              : "Connectez-vous à votre espace de travail DemandLint."}
          </p>
        </div>

        <div className={`auth-providers ${creating ? "" : "login-providers"}`} aria-label="Futurs modes de connexion">
          <button type="button" disabled title="Connexion Google bientôt disponible">
            <span className="google-symbol" aria-hidden="true">G</span>
            Google
          </button>
          <button type="button" disabled title="Connexion Microsoft bientôt disponible">
            <span className="microsoft-symbol" aria-hidden="true">
              <i /><i /><i /><i />
            </span>
            Microsoft
          </button>
          {!creating && (
            <button type="button" disabled title="Connexion SSO d’organisation bientôt disponible">
              <svg className="organization-symbol" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="8" cy="8" r="4" />
                <path d="M11 11l9 9m-3-3 2-2m-5-1 2-2" />
              </svg>
              Organisation
            </button>
          )}
        </div>

        <div className="auth-separator"><span>ou</span></div>

        {error && <div className="alert error-alert auth-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>{creating ? "E-mail professionnel" : "E-mail"}</span>
            <input
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@entreprise.com"
              autoFocus
            />
          </label>
          <button className="button primary auth-submit" type="submit">
            {creating ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        <p className="auth-switch">
          {creating ? "Vous avez déjà un compte ?" : "Vous n’avez pas encore de compte ?"}{" "}
          <a
            href={creating ? "#login" : "#signup"}
            onClick={() => switchMode(creating ? "login" : "signup")}
          >
            {creating ? "Se connecter" : "Créer un compte gratuitement"}
          </a>
        </p>

        <p className="auth-legal">
          {creating ? (
            <>
              En continuant, vous acceptez les <a href="#terms">Conditions d’utilisation</a> et la{" "}
              <a href="#privacy">Politique de confidentialité</a>.
            </>
          ) : (
            <>
              Connexion locale par e-mail pour cette version de test. Aucun mot de passe n’est demandé ou enregistré.
            </>
          )}
        </p>
      </section>
    </main>
  );
}
