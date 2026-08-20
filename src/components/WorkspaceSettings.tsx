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
  onPreferencesChange: (preferences: ContactPreferences) => void;
  onCreateOrganization: (name: string) => void;
  onAddMember: (email: string, role: MembershipRole) => void;
}

export function WorkspaceSettings({
  workspace,
  members,
  preferences,
  onPreferencesChange,
  onCreateOrganization,
  onAddMember,
}: WorkspaceSettingsProps) {
  const [organizationName, setOrganizationName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<MembershipRole>("member");
  const [error, setError] = useState<string | null>(null);
  const activeOrganization = workspace.organizations.find(
    (item) => item.id === workspace.session.activeOrganizationId,
  );
  const activeMembership = workspace.session.memberships.find(
    (item) => item.organizationId === workspace.session.activeOrganizationId,
  );

  function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      onCreateOrganization(organizationName);
      setOrganizationName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The organization could not be created.");
    }
  }

  function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      onAddMember(memberEmail, memberRole);
      setMemberEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The member could not be added.");
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
        <strong>V0.2 local account preview</strong>
        <span>
          Accounts, members, preferences and templates persist in this browser. Cross-device sync
          and secure invitations require the hosted authentication backend planned next.
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
          <form className="inline-form" onSubmit={createOrganization}>
            <input
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Organization name"
            />
            <button className="button ghost" type="submit" disabled={!organizationName.trim()}>
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
            <p>Test roles and team membership before secure email invitations are connected.</p>
          </div>
          {activeMembership?.role !== "member" && (
            <form className="member-form" onSubmit={addMember}>
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
              <button className="button ghost" type="submit" disabled={!memberEmail.trim()}>
                Add member
              </button>
            </form>
          )}
        </div>
        <div className="member-list">
          {members.map(({ user, membership }) => (
            <div className="member-item" key={`${membership.organizationId}:${user.id}`}>
              <span className="avatar" aria-hidden="true">
                {(user.displayName || user.email).slice(0, 1).toUpperCase()}
              </span>
              <div><strong>{user.displayName || user.email}</strong><span>{user.email}</span></div>
              <span className="role-badge">{membership.role}</span>
            </div>
          ))}
        </div>
      </section>

      <ContactPreferencesPanel
        preferences={preferences}
        onChange={onPreferencesChange}
        storageDescription="Preferences are saved for the active organization in this browser."
      />
    </div>
  );
}
