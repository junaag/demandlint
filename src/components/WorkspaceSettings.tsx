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
  onResendInvitation: (memberId: string) => Promise<void>;
  onCancelInvitation: (memberId: string) => Promise<void>;
  onRevokeMember: (memberId: string) => Promise<void>;
  onUpdateMemberRole: (
    memberId: string,
    role: Exclude<MembershipRole, "owner">,
  ) => Promise<void>;
  onTransferOwnership: (newOwnerId: string) => Promise<void>;
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
  onResendInvitation,
  onCancelInvitation,
  onRevokeMember,
  onUpdateMemberRole,
  onTransferOwnership,
  onDeleteAccount,
}: WorkspaceSettingsProps) {
  const [organizationName, setOrganizationName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<MembershipRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [memberAction, setMemberAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);
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
    setNotice(null);
    setBusy(true);
    try {
      await onAddMember(memberEmail, memberRole);
      setNotice(`Invitation sent to ${memberEmail.trim().toLowerCase()}.`);
      setMemberEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The member could not be added.");
    } finally {
      setBusy(false);
    }
  }

  async function manageMember(
    action: "resend" | "cancel" | "revoke",
    member: OrganizationMember,
  ) {
    if (action === "cancel" && !window.confirm(`Cancel the invitation for ${member.user.email}?`)) return;
    if (action === "revoke" && !window.confirm(`Revoke workspace access for ${member.user.email}?`)) return;
    const actionKey = `${action}:${member.user.id}`;
    setError(null);
    setNotice(null);
    setMemberAction(actionKey);
    try {
      if (action === "resend") {
        await onResendInvitation(member.user.id);
        setNotice(`Invitation resent to ${member.user.email}.`);
      } else if (action === "cancel") {
        await onCancelInvitation(member.user.id);
        setNotice(`Invitation cancelled for ${member.user.email}.`);
      } else {
        await onRevokeMember(member.user.id);
        setNotice(`Workspace access revoked for ${member.user.email}.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The member action could not be completed.");
    } finally {
      setMemberAction(null);
    }
  }

  async function changeMemberRole(
    member: OrganizationMember,
    role: Exclude<MembershipRole, "owner">,
  ) {
    if (member.membership.role === role) return;
    const actionLabel = role === "admin" ? "promote to admin" : "change to member";
    if (!window.confirm(`${actionLabel.charAt(0).toUpperCase()}${actionLabel.slice(1)} for ${member.user.email}?`)) return;
    const actionKey = `role:${member.user.id}`;
    setError(null);
    setNotice(null);
    setMemberAction(actionKey);
    try {
      await onUpdateMemberRole(member.user.id, role);
      setNotice(`${member.user.email} is now ${role === "admin" ? "an admin" : "a member"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The member role could not be changed.");
    } finally {
      setMemberAction(null);
    }
  }

  async function transferOwnership(member: OrganizationMember) {
    if (!window.confirm(
      `Transfer ownership to ${member.user.email}? You will become an admin of this workspace.`,
    )) return;
    const actionKey = `ownership:${member.user.id}`;
    setError(null);
    setNotice(null);
    setMemberAction(actionKey);
    try {
      await onTransferOwnership(member.user.id);
      setNotice(`${member.user.email} is now the workspace owner. Your role is now admin.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ownership could not be transferred.");
    } finally {
      setMemberAction(null);
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
        <strong>{hosted ? "V0.2.3 hosted workspace" : "Local development preview"}</strong>
        <span>
          {hosted
            ? "Your account, organizations, preferences and mapping templates are synchronized securely across devices. Lead files still remain in this browser."
            : "Accounts, members, preferences and templates persist only in this browser."}
        </span>
      </div>

      {error && <div className="alert error-alert" role="alert">{error}</div>}
      {notice && <div className="alert success-alert" role="status">{notice}</div>}

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
          {(activeMembership?.role === "owner" || activeMembership?.role === "admin") && (
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
          {members.map((member) => {
            const { user, membership, status } = member;
            const currentRole = activeMembership?.role;
            const canManage = currentRole === "owner" || currentRole === "admin";
            const isCurrentUser = user.id === workspace.session.user.id;
            const canRevoke = status === "active" && !isCurrentUser && (
              (currentRole === "owner" && membership.role !== "owner")
              || (currentRole === "admin" && membership.role === "member")
            );
            const ownerCanEditRole = currentRole === "owner"
              && status === "active"
              && membership.role !== "owner";
            const adminCanPromote = currentRole === "admin"
              && status === "active"
              && membership.role === "member";
            const adminCanSelfDemote = currentRole === "admin"
              && status === "active"
              && isCurrentUser;
            const canTransferOwnership = currentRole === "owner"
              && status === "active"
              && membership.role === "admin";
            return (
              <div className="member-item" key={`${membership.organizationId}:${user.id}`}>
                <span className="avatar" aria-hidden="true">
                  {(user.displayName || user.email).slice(0, 1).toUpperCase()}
                </span>
                <div><strong>{user.displayName || user.email}</strong><span>{user.email}</span></div>
                <div className="member-management">
                  <div className="member-badges">
                    {status === "invited" && <span className="status-badge invited">invited</span>}
                    <span className="role-badge">{membership.role}</span>
                  </div>
                  {ownerCanEditRole && (
                    <div className="member-actions role-actions">
                      <select
                        aria-label={`Role for ${user.email}`}
                        value={membership.role}
                        disabled={memberAction !== null}
                        onChange={(event) => void changeMemberRole(
                          member,
                          event.target.value as Exclude<MembershipRole, "owner">,
                        )}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      {canTransferOwnership && (
                        <button
                          className="text-button ownership-button"
                          type="button"
                          disabled={memberAction !== null}
                          onClick={() => void transferOwnership(member)}
                        >{memberAction === `ownership:${user.id}` ? "Transferring…" : "Make owner"}</button>
                      )}
                    </div>
                  )}
                  {adminCanPromote && (
                    <div className="member-actions role-actions">
                      <button
                        className="text-button"
                        type="button"
                        disabled={memberAction !== null}
                        onClick={() => void changeMemberRole(member, "admin")}
                      >{memberAction === `role:${user.id}` ? "Promoting…" : "Promote to admin"}</button>
                    </div>
                  )}
                  {adminCanSelfDemote && (
                    <div className="member-actions role-actions">
                      <button
                        className="text-button destructive-text-button"
                        type="button"
                        disabled={memberAction !== null}
                        onClick={() => void changeMemberRole(member, "member")}
                      >{memberAction === `role:${user.id}` ? "Updating…" : "Step down to member"}</button>
                    </div>
                  )}
                  {canManage && status === "invited" && (
                    <div className="member-actions">
                      <button
                        className="text-button"
                        type="button"
                        disabled={memberAction !== null}
                        onClick={() => void manageMember("resend", member)}
                      >{memberAction === `resend:${user.id}` ? "Sending…" : "Resend invite"}</button>
                      <button
                        className="text-button destructive-text-button"
                        type="button"
                        disabled={memberAction !== null}
                        onClick={() => void manageMember("cancel", member)}
                      >Cancel invite</button>
                    </div>
                  )}
                  {canRevoke && (
                    <div className="member-actions">
                      <button
                        className="text-button destructive-text-button"
                        type="button"
                        disabled={memberAction !== null}
                        onClick={() => void manageMember("revoke", member)}
                      >{memberAction === `revoke:${user.id}` ? "Revoking…" : "Revoke access"}</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
            <p className="section-label danger-label">DANGER ZONE</p>
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
