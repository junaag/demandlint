import { useEffect, useMemo, useState } from "react";
import {
  analyzeImportSource,
  updateImportSourceMapping,
  validateMapping,
  type AccountWorkspace,
  type CanonicalField,
  type ContactPreferences,
  type CreateAccountInput,
  type ImportSession,
  type MappingTemplate,
  type MembershipRole,
  type OrganizationMember,
} from "./application/public";
import {
  addBrowserOrganizationMember,
  createBrowserAccount,
  createBrowserOrganization,
  listBrowserOrganizationMembers,
  loadBrowserAccountWorkspace,
  signInBrowserAccount,
  signOutBrowserAccount,
  switchBrowserOrganization,
} from "./composition/browserAccounts";
import {
  loadBrowserContactPreferences,
  saveBrowserContactPreferences,
} from "./composition/browserContactPreferences";
import { createBrowserImportSession } from "./composition/browserImport";
import {
  deleteBrowserMappingTemplate,
  listBrowserMappingTemplates,
  mappingFromBrowserTemplate,
  saveBrowserMappingTemplate,
} from "./composition/browserMappingTemplates";
import { AccountGate } from "./components/AccountGate";
import { DataHealthReview } from "./components/DataHealthReview";
import { FileSummary } from "./components/FileSummary";
import { LegalPage } from "./components/LegalPage";
import { MappingPanel } from "./components/MappingPanel";
import { MappingTemplatesPanel } from "./components/MappingTemplatesPanel";
import { UploadPanel } from "./components/UploadPanel";
import { WorkspaceSettings } from "./components/WorkspaceSettings";

type AppPage = "import" | "settings";
type PublicRoute = "terms" | "privacy" | null;

function getPublicRoute(): PublicRoute {
  if (typeof window === "undefined") return null;
  if (window.location.hash === "#terms") return "terms";
  if (window.location.hash === "#privacy") return "privacy";
  return null;
}

export default function App() {
  const [workspace, setWorkspace] = useState<AccountWorkspace | null>(loadBrowserAccountWorkspace);
  const [page, setPage] = useState<AppPage>("import");
  const [session, setSession] = useState<ImportSession | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [contactPreferences, setContactPreferences] = useState<ContactPreferences>(
    () => loadBrowserContactPreferences(workspace?.session.activeOrganizationId),
  );
  const [mappingTemplates, setMappingTemplates] = useState<MappingTemplate[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [publicRoute, setPublicRoute] = useState<PublicRoute>(getPublicRoute);

  const activeOrganizationId = workspace?.session.activeOrganizationId;
  const source = session?.sources[0];
  const table = source?.table;
  const result = source?.result;

  const validation = useMemo(
    () => (source ? validateMapping(source.table, source.mapping) : null),
    [source],
  );

  useEffect(() => {
    function syncPublicRoute() {
      setPublicRoute(getPublicRoute());
      setError(null);
    }
    window.addEventListener("hashchange", syncPublicRoute);
    return () => window.removeEventListener("hashchange", syncPublicRoute);
  }, []);

  useEffect(() => {
    if (!activeOrganizationId) {
      setMappingTemplates([]);
      setMembers([]);
      return;
    }
    let cancelled = false;
    setContactPreferences(loadBrowserContactPreferences(activeOrganizationId));
    setMembers(listBrowserOrganizationMembers(activeOrganizationId));
    void listBrowserMappingTemplates(activeOrganizationId).then((templates) => {
      if (!cancelled) setMappingTemplates(templates);
    });
    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId]);

  function createAccount(input: CreateAccountInput) {
    setError(null);
    try {
      setWorkspace(createBrowserAccount(input));
      setPage("import");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The account could not be opened.");
    }
  }

  function signIn(email: string) {
    setError(null);
    try {
      setWorkspace(signInBrowserAccount(email));
      setPage("import");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The account could not be opened.");
    }
  }

  function signOut() {
    signOutBrowserAccount();
    setWorkspace(null);
    setPage("import");
    reset();
  }

  function switchOrganization(organizationId: string) {
    setError(null);
    try {
      setWorkspace(switchBrowserOrganization(organizationId));
      reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The organization could not be opened.");
    }
  }

  function createOrganization(name: string) {
    const nextWorkspace = createBrowserOrganization(name);
    setWorkspace(nextWorkspace);
    reset();
  }

  function addMember(email: string, role: MembershipRole) {
    if (!activeOrganizationId) return;
    addBrowserOrganizationMember(activeOrganizationId, email, role);
    setMembers(listBrowserOrganizationMembers(activeOrganizationId));
  }

  async function processFile(file: File) {
    setBusy(true);
    setError(null);
    setUploadedFile(file);

    try {
      setSession(await createBrowserImportSession(file));
    } catch (caught) {
      setSession(null);
      setUploadedFile(null);
      setError(caught instanceof Error ? caught.message : "The file could not be read.");
    } finally {
      setBusy(false);
    }
  }

  async function selectWorksheet(sheetName: string) {
    if (!uploadedFile) return;
    setBusy(true);
    setError(null);

    try {
      setSession(await createBrowserImportSession(uploadedFile, { sheetName }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The worksheet could not be read.");
    } finally {
      setBusy(false);
    }
  }

  function updateMapping(sourceColumn: string, value: CanonicalField | "ignore") {
    if (!session || !source) return;
    setSession(
      updateImportSourceMapping(session, source.id, {
        ...source.mapping,
        [sourceColumn]: value,
      }),
    );
  }

  function applyTemplate(template: MappingTemplate) {
    if (!session || !source || !table) return;
    const savedMapping = mappingFromBrowserTemplate(template);
    const mapping = Object.fromEntries(
      table.columns.map((column) => [column, savedMapping[column] ?? "ignore"]),
    );
    setSession(updateImportSourceMapping(session, source.id, mapping));
    setError(null);
  }

  async function saveTemplate(name: string) {
    if (!activeOrganizationId || !source || !table) return;
    await saveBrowserMappingTemplate({
      name,
      organizationId: activeOrganizationId,
      mapping: source.mapping,
      sourceColumns: table.columns,
    });
    setMappingTemplates(await listBrowserMappingTemplates(activeOrganizationId));
  }

  async function deleteTemplate(id: string) {
    if (!activeOrganizationId) return;
    await deleteBrowserMappingTemplate(id);
    setMappingTemplates(await listBrowserMappingTemplates(activeOrganizationId));
  }

  function reset() {
    setSession(null);
    setUploadedFile(null);
    setError(null);
  }

  function updateContactPreferences(preferences: ContactPreferences) {
    saveBrowserContactPreferences(preferences, activeOrganizationId);
    setContactPreferences(preferences);
    if (session && source?.result) {
      setSession(updateImportSourceMapping(session, source.id, source.mapping));
    }
  }

  function runAnalysis() {
    if (!session || !source || !validation?.valid) return;

    try {
      setSession(analyzeImportSource(session, source.id, contactPreferences));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    }
  }

  if (publicRoute) {
    return (
      <div className="app-shell account-shell legal-shell">
        <LegalPage kind={publicRoute} />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="app-shell account-shell">
        <AccountGate
          onCreateAccount={createAccount}
          onSignIn={signIn}
          onModeChange={() => setError(null)}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar workspace-topbar">
        <Brand />
        <nav className="app-navigation" aria-label="Application">
          <button
            type="button"
            className={page === "import" ? "active" : ""}
            onClick={() => setPage("import")}
          >Import</button>
          <button
            type="button"
            className={page === "settings" ? "active" : ""}
            onClick={() => setPage("settings")}
          >Settings</button>
        </nav>
        <div className="account-controls">
          <select
            aria-label="Active organization"
            value={activeOrganizationId}
            onChange={(event) => switchOrganization(event.target.value)}
          >
            {workspace.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.name}</option>
            ))}
          </select>
          <span className="avatar" title={workspace.session.user.email}>
            {(workspace.session.user.displayName || workspace.session.user.email).slice(0, 1).toUpperCase()}
          </span>
          <button className="text-button" type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className="page">
        {page === "settings" ? (
          <WorkspaceSettings
            workspace={workspace}
            members={members}
            preferences={contactPreferences}
            onPreferencesChange={updateContactPreferences}
            onCreateOrganization={createOrganization}
            onAddMember={addMember}
          />
        ) : (
          <>
            <section className="hero">
              <p className="eyebrow">CRM IMPORT PRE-FLIGHT</p>
              <h1>Catch bad lead data before it reaches your CRM.</h1>
              <p>
                Upload a CSV or XLSX file, confirm the field mapping, then run DemandLint’s
                deterministic quality checks directly in your browser.
              </p>
            </section>

            <nav className="steps" aria-label="Import workflow">
              <div className={`step ${table ? "complete" : "active"}`}><span>1</span>Upload</div>
              <div className={`step ${table && !result ? "active" : result ? "complete" : ""}`}><span>2</span>Map fields</div>
              <div className={`step ${result ? "active" : ""}`}><span>3</span>Review & export</div>
            </nav>

            {error && <div className="alert error-alert" role="alert">{error}</div>}

            {!source || !table ? (
              <UploadPanel busy={busy} onFile={(file) => void processFile(file)} />
            ) : (
              <>
                <FileSummary
                  table={table}
                  busy={busy}
                  onReset={reset}
                  onSheetChange={(sheetName) => void selectWorksheet(sheetName)}
                />
                <MappingPanel
                  table={table}
                  plan={source.mappingPlan}
                  mapping={source.mapping}
                  onChange={updateMapping}
                />
                <MappingTemplatesPanel
                  templates={mappingTemplates}
                  currentColumns={table.columns}
                  onSave={saveTemplate}
                  onApply={applyTemplate}
                  onDelete={deleteTemplate}
                />

                <section className={`validation-bar ${validation?.valid ? "valid" : "invalid"}`}>
                  <div>
                    <strong>{validation?.valid ? "Mapping ready" : "Mapping needs attention"}</strong>
                    {validation?.valid ? (
                      <span>Required fields are present and each target is mapped once.</span>
                    ) : (
                      <span>{validation?.errors.join(" ")}</span>
                    )}
                  </div>
                  <button
                    className="button primary"
                    type="button"
                    disabled={!validation?.valid}
                    onClick={runAnalysis}
                  >Analyze data</button>
                </section>

                {result && (
                  <DataHealthReview result={result} contactPreferences={contactPreferences} />
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer>
        DemandLint V0.2.1 · Local account preview · lead files never leave this browser ·{" "}
        <a href="#terms">Conditions</a> · <a href="#privacy">Confidentialité</a>
      </footer>
    </div>
  );
}

function Brand() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark" aria-hidden="true">D</div>
      <div><strong>DemandLint</strong><span>Lead import quality</span></div>
    </div>
  );
}
