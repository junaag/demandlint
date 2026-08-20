import { useState, type FormEvent } from "react";
import type {
  AccountWorkspace,
  ContactPreferences,
  MembershipRole,
  OrganizationMember,
} from "../application/public";
import { ContactPreferencesPanel } from "./ContactPreferencesPanel";

interface WorkspaceSettingsProps {
  workspace: AccountWorkspace;
  members: OrganizationMember[];
  preferences: ContactPreferences;
  hosted: boolean;
  onPreferencesChange: (preferences: ContactPreferences) => Promise<void>;
  onCreateOrganization: (name: string) => Promise<void>;
  onAddMember: (email: string, role: MembershipRole) => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}

export function WorkspaceSettings({
  workspace,
  members,
  preferences,
  hosted,
  onPreferencesChange,
  onCreateOrganization,
  onAddMember,
  onDeleteAccount,
}: WorkspaceSettingsProps) {
  const [organizationName, setOrganizationName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<MembershipRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const activeOrganization = workspace.organizations.find(
    (item) => item.id === workspace.session.activeOrganizationId,
  );
  const activeMembership = workspace.session.memberships.find(
    (item) => item.organizationId === workspace.session.activeOrganizationId,
  );

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onCreateOrganization(organizationName);
      setOrganizationName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The organization could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onAddMember(memberEmail, memberRole);
      setMemberEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The member could not be added.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onDeleteAccount || deleteConfirmation !== "DELETE") return;
    setError(null);
    setBusy(true);
    try {
      await onDeleteAccount();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The account could not be deleted.");
      setBusy(false);
    }
  }

  return (
    <div className="settings-stack">
      <section className="settings-hero">
        <p className="eyebrow">WORKSPACE SETTINGS</p>
        <h1>{activeOrganization?.name ?? "Organization"}</h1>
        <p>Manage the preferences and reusable configuration shared by this workspace.</p>
      </section>

      <div className="preview-notice">
        <strong>{hosted ? "V0.2.2 hosted workspace" : "Local development preview"}</strong>
        <span>
          {hosted
            ? "Your account, organizations, preferences and mapping templates are synchronized securely across devices. Lead files still remain in this browser."
            : "Accounts, members, preferences and templates persist only in this browser."}
        </span>
      </div>

      {error && <div className="alert error-alert" role="alert">{error}</div>}

      <section className="settings-grid">
        <article className="panel settings-card">
          <p className="section-label">PROFILE</p>
          <h2>{workspace.session.user.displayName}</h2>
          <p>{workspace.session.user.email}</p>
          <span className="role-badge">{activeMembership?.role ?? "member"}</span>
        </article>

        <article className="panel settings-card">
          <p className="section-label">NEW ORGANIZATION</p>
          <h2>Create another workspace</h2>
          <form className="inline-form" onSubmit={(event) => void createOrganization(event)}>
            <input
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Organization name"
            />
            <button className="button ghost" type="submit" disabled={busy || !organizationName.trim()}>
              Create
            </button>
          </form>
        </article>
      </section>

      <section className="panel members-panel">
        <div className="section-heading compact-heading">
          <div>
            <p className="section-label">MEMBERS</p>
            <h2>Organization access</h2>
            <p>
              {hosted
                ? "Invite colleagues by work email and manage their workspace role."
                : "Test roles and team membership in this browser."}
            </p>
          </div>
          {activeMembership?.role !== "member" && (
            <form className="member-form" onSubmit={(event) => void addMember(event)}>
              <input
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="colleague@company.com"
              />
              <select
                aria-label="Member role"
                value={memberRole}
                onChange={(event) => setMemberRole(event.target.value as MembershipRole)}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button className="button ghost" type="submit" disabled={busy || !memberEmail.trim()}>
                {hosted ? "Send invite" : "Add member"}
              </button>
            </form>
          )}
        </div>
        <div className="member-list">
          {members.map(({ user, membership, status }) => (
            <div className="member-item" key={`${membership.organizationId}:${user.id}`}>
              <span className="avatar" aria-hidden="true">
                {(user.displayName || user.email).slice(0, 1).toUpperCase()}
              </span>
              <div><strong>{user.displayName || user.email}</strong><span>{user.email}</span></div>
              <div className="member-badges">
                {status === "invited" && <span className="status-badge invited">invited</span>}
                <span className="role-badge">{membership.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ContactPreferencesPanel
        preferences={preferences}
        onChange={onPreferencesChange}
        storageDescription={hosted
          ? " Preferences are synchronized for the active organization."
          : " Preferences are saved for the active organization in this browser."}
      />

      {onDeleteAccount && (
        <section className="panel danger-zone">
          <div>
            <p className="section-label">DANGER ZONE</p>
            <h2>Delete my account</h2>
            <p>This permanently removes your profile and memberships. Lead files are not stored by DemandLint.</p>
          </div>
          {!deleteOpen ? (
            <button className="button danger-button" type="button" onClick={() => setDeleteOpen(true)}>
              Delete account
            </button>
          ) : (
            <form className="delete-account-form" onSubmit={(event) => void deleteAccount(event)}>
              <label>
                <span>Type DELETE to confirm</span>
                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  autoComplete="off"
                />
              </label>
              <div>
                <button className="button ghost" type="button" disabled={busy} onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirmation("");
                }}>Cancel</button>
                <button className="button danger-button" type="submit" disabled={busy || deleteConfirmation !== "DELETE"}>
                  {busy ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
