import { useEffect, useMemo, useState } from "react";
import {
  analyzeImportSource,
  updateImportSourceMapping,
  validateMapping,
  type AccountWorkspace,
  type CanonicalField,
  type ContactPreferences,
  DEFAULT_CONTACT_PREFERENCES,
  type ExportTemplate,
  type ExportTemplateWorkbookChange,
  type ImportSession,
  type MappingTemplate,
  type MembershipRole,
  type OrganizationMember,
} from "./application/public";
import {
  addBrowserOrganizationMember,
  cancelBrowserOrganizationInvitation,
  createBrowserOrganization,
  deleteBrowserAccount,
  isBrowserOAuthProviderEnabled,
  isHostedAccountBackendConfigured,
  listBrowserOrganizationMembers,
  loadBrowserAccountWorkspace,
  requestBrowserAccountAccess,
  resendBrowserOrganizationInvitation,
  revokeBrowserOrganizationMember,
  signInBrowserAccountWithProvider,
  signOutBrowserAccount,
  switchBrowserOrganization,
  transferBrowserOrganizationOwnership,
  updateBrowserOrganizationMemberRole,
  verifyBrowserAccountOtp,
} from "./composition/browserAccounts";
import type { BrowserOAuthProvider } from "./composition/browserAccounts";
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
import {
  deleteBrowserExportTemplate,
  listBrowserExportTemplates,
  saveBrowserExportTemplate,
} from "./composition/browserExportTemplates";
import { AccountGate, type AccountMode } from "./components/AccountGate";
import { DataHealthReview } from "./components/DataHealthReview";
import { ExportPreparation } from "./components/ExportPreparation";
import { ExportTemplatesPage } from "./components/ExportTemplatesPage";
import { BuildInfo } from "./components/BuildInfo";
import { FileSummary } from "./components/FileSummary";
import { LegalPage } from "./components/LegalPage";
import { MappingPanel } from "./components/MappingPanel";
import { MappingTemplatesPanel } from "./components/MappingTemplatesPanel";
import { UploadPanel } from "./components/UploadPanel";
import { WorkspaceSettings } from "./components/WorkspaceSettings";
import { EmailEligibilityError } from "./application/auth/emailEligibility";
import {
  authPageHref,
  getApplicationRoute,
  getWorkspacePage,
  intendedWorkspacePage,
  isWorkspacePage,
  publicPageHref,
  workspacePageHref,
  type WorkspacePage,
} from "./application/workspaceNavigation";

type PublicRoute = "terms" | "privacy" | null;

function getPublicRoute(): PublicRoute {
  if (typeof window === "undefined") return null;
  const route = getApplicationRoute(window.location.pathname);
  if (route === "terms") return "terms";
  if (route === "privacy") return "privacy";
  return null;
}

function getAccountMode(): AccountMode {
  if (typeof window === "undefined") return "signup";
  return new URLSearchParams(window.location.search).get("mode") === "login" ? "login" : "signup";
}

function getInitialAccountEmail(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("email")?.trim() ?? "";
}

export default function App() {
  const [workspace, setWorkspace] = useState<AccountWorkspace | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [page, setPage] = useState<WorkspacePage>(() => (
    typeof window === "undefined" ? "import" : getWorkspacePage(window.location.pathname)
  ));
  const [routeRevision, setRouteRevision] = useState(0);
  const [session, setSession] = useState<ImportSession | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [contactPreferences, setContactPreferences] = useState<ContactPreferences>(
    DEFAULT_CONTACT_PREFERENCES,
  );
  const [mappingTemplates, setMappingTemplates] = useState<MappingTemplate[]>([]);
  const [exportTemplates, setExportTemplates] = useState<ExportTemplate[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const publicRoute = getPublicRoute();
  const hosted = isHostedAccountBackendConfigured();

  const activeOrganizationId = workspace?.session.activeOrganizationId;
  const source = session?.sources[0];
  const table = source?.table;
  const result = source?.result;

  const validation = useMemo(
    () => (source ? validateMapping(source.table, source.mapping) : null),
    [source],
  );

  useEffect(() => {
    let cancelled = false;
    void loadBrowserAccountWorkspace()
      .then((savedWorkspace) => {
        if (!cancelled) setWorkspace(savedWorkspace);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setErrorTitle(caught instanceof EmailEligibilityError ? caught.title : null);
          setError(caught instanceof Error ? caught.message : "Your account could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setAccountLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function syncPageFromUrl() {
      setPage(getWorkspacePage(window.location.pathname));
      setRouteRevision((revision) => revision + 1);
    }

    window.addEventListener("popstate", syncPageFromUrl);
    return () => window.removeEventListener("popstate", syncPageFromUrl);
  }, []);

  useEffect(() => {
    if (accountLoading || getPublicRoute()) return;

    if (!workspace) {
      if (getApplicationRoute(window.location.pathname) !== "auth") {
        const requestedPage = isWorkspacePage(window.location.pathname)
          ? getWorkspacePage(window.location.pathname)
          : "import";
        window.history.replaceState(
          null,
          "",
          authPageHref(window.location.pathname, { next: requestedPage }),
        );
      }
      return;
    }

    if (isWorkspacePage(window.location.pathname)) {
      setPage(getWorkspacePage(window.location.pathname));
      return;
    }

    const destination = intendedWorkspacePage(window.location.search) ?? "import";
    setPage(destination);
    window.history.replaceState(null, "", workspacePageHref(destination, window.location.pathname));
  }, [accountLoading, routeRevision, workspace]);

  useEffect(() => {
    if (!activeOrganizationId) {
      setMappingTemplates([]);
      setExportTemplates([]);
      setMembers([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      loadBrowserContactPreferences(activeOrganizationId),
      listBrowserOrganizationMembers(activeOrganizationId),
      listBrowserMappingTemplates(activeOrganizationId),
      listBrowserExportTemplates(activeOrganizationId),
    ])
      .then(([preferences, nextMembers, templates, nextExportTemplates]) => {
        if (cancelled) return;
        setContactPreferences(preferences);
        setMembers(nextMembers);
        setMappingTemplates(templates);
        setExportTemplates(nextExportTemplates);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Workspace data could not be loaded.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId]);

  async function requestAccountAccess(email: string, mode: AccountMode): Promise<boolean> {
    setError(null);
    setErrorTitle(null);
    try {
      const result = await requestBrowserAccountAccess(
        email,
        mode,
        intendedWorkspacePage(window.location.search) ?? "import",
      );
      if (result.workspace) openWorkspace(result.workspace);
      return result.verificationRequired;
    } catch (caught) {
      setErrorTitle(caught instanceof EmailEligibilityError ? caught.title : null);
      setError(caught instanceof Error ? caught.message : "The account could not be opened.");
      throw caught;
    }
  }

  async function verifyAccountOtp(email: string, code: string): Promise<void> {
    setError(null);
    setErrorTitle(null);
    try {
      openWorkspace(await verifyBrowserAccountOtp(email, code));
    } catch (caught) {
      setErrorTitle(caught instanceof EmailEligibilityError ? caught.title : null);
      setError(caught instanceof Error ? caught.message : "The account could not be opened.");
      throw caught;
    }
  }

  function openWorkspace(nextWorkspace: AccountWorkspace) {
    const destination = intendedWorkspacePage(window.location.search) ?? "import";
    setWorkspace(nextWorkspace);
    window.history.replaceState(
      null,
      "",
      workspacePageHref(destination, window.location.pathname),
    );
    setPage(destination);
  }

  function navigateToPage(nextPage: WorkspacePage) {
    if (nextPage === page && isWorkspacePage(window.location.pathname)) return;
    window.history.pushState(null, "", workspacePageHref(nextPage, window.location.pathname));
    setPage(nextPage);
  }

  async function signInWithProvider(provider: BrowserOAuthProvider): Promise<void> {
    setError(null);
    setErrorTitle(null);
    try {
      await signInBrowserAccountWithProvider(
        provider,
        intendedWorkspacePage(window.location.search) ?? "import",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The sign-in provider could not be opened.");
      throw caught;
    }
  }

  async function signOut() {
    try {
      await signOutBrowserAccount();
      window.location.assign(authPageHref(window.location.pathname, { mode: "login" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "You could not be signed out.");
    }
  }

  async function switchOrganization(organizationId: string) {
    setError(null);
    try {
      setWorkspace(await switchBrowserOrganization(organizationId));
      reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The organization could not be opened.");
    }
  }

  async function createOrganization(name: string) {
    setWorkspace(await createBrowserOrganization(name));
    reset();
  }

  async function addMember(email: string, role: MembershipRole) {
    if (!activeOrganizationId) return;
    await addBrowserOrganizationMember(activeOrganizationId, email, role);
    setMembers(await listBrowserOrganizationMembers(activeOrganizationId));
  }

  async function resendInvitation(memberId: string) {
    if (!activeOrganizationId) return;
    await resendBrowserOrganizationInvitation(activeOrganizationId, memberId);
  }

  async function cancelInvitation(memberId: string) {
    if (!activeOrganizationId) return;
    await cancelBrowserOrganizationInvitation(activeOrganizationId, memberId);
    setMembers(await listBrowserOrganizationMembers(activeOrganizationId));
  }

  async function revokeMember(memberId: string) {
    if (!activeOrganizationId) return;
    await revokeBrowserOrganizationMember(activeOrganizationId, memberId);
    setMembers(await listBrowserOrganizationMembers(activeOrganizationId));
  }

  async function updateMemberRole(
    memberId: string,
    role: Exclude<MembershipRole, "owner">,
  ) {
    if (!activeOrganizationId) return;
    await updateBrowserOrganizationMemberRole(activeOrganizationId, memberId, role);
    const [nextWorkspace, nextMembers] = await Promise.all([
      loadBrowserAccountWorkspace(),
      listBrowserOrganizationMembers(activeOrganizationId),
    ]);
    if (nextWorkspace) setWorkspace(nextWorkspace);
    setMembers(nextMembers);
  }

  async function transferOwnership(newOwnerId: string) {
    if (!activeOrganizationId) return;
    await transferBrowserOrganizationOwnership(activeOrganizationId, newOwnerId);
    const [nextWorkspace, nextMembers] = await Promise.all([
      loadBrowserAccountWorkspace(),
      listBrowserOrganizationMembers(activeOrganizationId),
    ]);
    if (nextWorkspace) setWorkspace(nextWorkspace);
    setMembers(nextMembers);
  }

  async function deleteAccount() {
    await deleteBrowserAccount();
    window.location.assign(authPageHref(window.location.pathname));
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

  async function saveExportTemplate(template: ExportTemplate, workbookChange?: ExportTemplateWorkbookChange): Promise<ExportTemplate> {
    if (!activeOrganizationId) throw new Error("Open a workspace before saving a template.");
    const saved = await saveBrowserExportTemplate(template, activeOrganizationId, workbookChange);
    setExportTemplates(await listBrowserExportTemplates(activeOrganizationId));
    return saved;
  }

  async function deleteExportTemplate(id: string): Promise<void> {
    if (!activeOrganizationId) return;
    await deleteBrowserExportTemplate(id);
    setExportTemplates(await listBrowserExportTemplates(activeOrganizationId));
  }

  function reset() {
    setSession(null);
    setUploadedFile(null);
    setError(null);
  }

  async function updateContactPreferences(preferences: ContactPreferences) {
    const previousPreferences = contactPreferences;
    setContactPreferences(preferences);
    try {
      await saveBrowserContactPreferences(preferences, activeOrganizationId);
      if (session && source?.result) {
        setSession(updateImportSourceMapping(session, source.id, source.mapping));
      }
    } catch (caught) {
      setContactPreferences(previousPreferences);
      throw caught instanceof Error ? caught : new Error("Preferences could not be saved.");
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

  if (accountLoading) {
    return (
      <div className="app-shell account-shell">
        <main className="auth-page login-page">
          <section className="auth-card account-loading" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <strong>Opening DemandLint…</strong>
          </section>
        </main>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="app-shell account-shell">
        <AccountGate
          mode={getAccountMode()}
          initialEmail={getInitialAccountEmail()}
          hosted={hosted}
          googleEnabled={isBrowserOAuthProviderEnabled("google")}
          microsoftEnabled={isBrowserOAuthProviderEnabled("azure")}
          onRequestAccess={requestAccountAccess}
          onVerifyCode={verifyAccountOtp}
          onProviderSignIn={signInWithProvider}
          error={error}
          errorTitle={errorTitle}
          loginHref={authPageHref(window.location.pathname, { mode: "login" })}
          signupHref={authPageHref(window.location.pathname)}
          termsHref={publicPageHref("terms", window.location.pathname)}
          privacyHref={publicPageHref("privacy", window.location.pathname)}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar workspace-topbar">
        <Brand />
        <nav className="app-navigation" aria-label="Application">
          <a
            href={workspacePageHref("import", window.location.pathname)}
            className={page === "import" ? "active" : ""}
            onClick={(event) => {
              event.preventDefault();
              navigateToPage("import");
            }}
          >Import</a>
          <a
            href={workspacePageHref("templates", window.location.pathname)}
            className={page === "templates" ? "active" : ""}
            onClick={(event) => {
              event.preventDefault();
              navigateToPage("templates");
            }}
          >Templates</a>
        </nav>
        <div className="account-controls">
          <select
            aria-label="Active organization"
            value={activeOrganizationId}
            onChange={(event) => void switchOrganization(event.target.value)}
          >
            {workspace.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.name}</option>
            ))}
          </select>
          <span className="account-email" title={workspace.session.user.email}>
            {workspace.session.user.email}
          </span>
          <a
            className={`text-button header-settings ${page === "settings" ? "active" : ""}`}
            href={workspacePageHref("settings", window.location.pathname)}
            onClick={(event) => {
              event.preventDefault();
              navigateToPage("settings");
            }}
          >Settings</a>
          <button className="text-button" type="button" onClick={() => void signOut()}>Sign out</button>
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
            onResendInvitation={resendInvitation}
            onCancelInvitation={cancelInvitation}
            onRevokeMember={revokeMember}
            onUpdateMemberRole={updateMemberRole}
            onTransferOwnership={transferOwnership}
            hosted={hosted}
            {...(hosted ? { onDeleteAccount: deleteAccount } : {})}
          />
        ) : page === "templates" ? (
          activeOrganizationId && <ExportTemplatesPage
            templates={exportTemplates}
            organizationId={activeOrganizationId}
            onSave={saveExportTemplate}
            onDelete={deleteExportTemplate}
          />
        ) : (
          <>
            <section className="hero">
              <p className="eyebrow">CRM IMPORT PRE-FLIGHT</p>
              <h1>Catch bad lead data before it reaches your CRM.</h1>
              <p>
                Upload a CSV, XLSX or XLS file, confirm the field mapping, then run DemandLint’s
                deterministic quality checks directly in your browser.
              </p>
            </section>

            <nav className="steps" aria-label="Import workflow">
              <div className={`step ${table ? "complete" : "active"}`}><span>1</span>Upload</div>
              <div className={`step ${table && !result ? "active" : result ? "complete" : ""}`}><span>2</span>Map fields</div>
              <div className={`step ${result ? "complete" : ""}`}><span>3</span>Review</div>
              <div className={`step ${result ? "active" : ""}`}><span>4</span>Prepare export</div>
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
                  <>
                    <DataHealthReview result={result} />
                    {activeOrganizationId && (
                      <ExportPreparation
                        result={result}
                        templates={exportTemplates}
                        organizationId={activeOrganizationId}
                        onSave={saveExportTemplate}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer>
        <BuildInfo /> · {hosted ? "Hosted workspace" : "Local development preview"} · lead files never leave this browser ·{" "}
        <a href={publicPageHref("terms", window.location.pathname)}>Terms</a> ·{" "}
        <a href={publicPageHref("privacy", window.location.pathname)}>Privacy</a>
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
