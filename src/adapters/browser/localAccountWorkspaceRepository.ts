import type {
  AccountUser,
  AccountWorkspace,
  CreateAccountInput,
  MembershipRole,
  Organization,
  OrganizationMember,
  OrganizationMembership,
} from "../../application/accounts/domain";
import {
  assertProfessionalEmail,
  PERSONAL_GMAIL_EXCEPTION,
  PERSONAL_GMAIL_WORKSPACE_NAME,
} from "../../application/auth/emailEligibility";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface AccountDatabase {
  version: 2;
  currentUserId?: string;
  users: AccountUser[];
  organizations: Organization[];
  memberships: OrganizationMembership[];
  memberStatusByKey: Record<string, "active" | "invited">;
  activeOrganizationByUser: Record<string, string>;
}

const STORAGE_KEY = "demandlint.account-workspaces.v1";

function emptyDatabase(): AccountDatabase {
  return {
    version: 2,
    users: [],
    organizations: [],
    memberships: [],
    memberStatusByKey: {},
    activeOrganizationByUser: {},
  };
}

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function titleCase(value: string): string {
  return value
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function profileNameFromEmail(email: string): string {
  return titleCase(email.split("@")[0] ?? "") || email;
}

function organizationNameFromEmail(email: string): string {
  if (email === PERSONAL_GMAIL_EXCEPTION) return PERSONAL_GMAIL_WORKSPACE_NAME;
  const domain = email.split("@")[1]?.split(".")[0] ?? "";
  return `${titleCase(domain) || "My"} workspace`;
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
}

function nextId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function memberKey(organizationId: string, userId: string): string {
  return `${organizationId}:${userId}`;
}

export class LocalAccountWorkspaceRepository {
  constructor(private readonly storage: StorageLike | undefined = browserStorage()) {}

  loadWorkspace(): AccountWorkspace | null {
    const database = this.read();
    if (!database.currentUserId) return null;
    return this.workspaceFor(database, database.currentUserId);
  }

  createAccount(input: CreateAccountInput): AccountWorkspace {
    const email = assertProfessionalEmail(input.email);
    const database = this.read();
    if (database.users.some((candidate) => candidate.email === email)) {
      throw new Error("An account already exists with this email. Use the sign-in page.");
    }

    const user: AccountUser = {
      id: stableId("usr", email),
      email,
      displayName: profileNameFromEmail(email),
    };
    database.users.push(user);

    const organization: Organization = {
      id: nextId("org"),
      name: organizationNameFromEmail(email),
    };
    database.organizations.push(organization);
    const membership: OrganizationMembership = {
      userId: user.id,
      organizationId: organization.id,
      role: "owner",
    };
    database.memberships.push(membership);
    database.activeOrganizationByUser[user.id] = organization.id;

    database.currentUserId = user.id;
    this.write(database);
    return this.workspaceFor(database, user.id);
  }

  signIn(emailValue: string): AccountWorkspace {
    const email = assertProfessionalEmail(emailValue);
    const database = this.read();
    const user = database.users.find((candidate) => candidate.email === email);
    if (!user) {
      throw new Error("No account exists with this email. Create your account first.");
    }
    database.currentUserId = user.id;
    const memberships = database.memberships.filter((item) => item.userId === user.id);
    if (!database.activeOrganizationByUser[user.id]) {
      database.activeOrganizationByUser[user.id] = memberships[0]?.organizationId ?? "";
    }
    this.write(database);
    return this.workspaceFor(database, user.id);
  }

  signOut(): void {
    const database = this.read();
    delete database.currentUserId;
    this.write(database);
  }

  createOrganization(name: string): AccountWorkspace {
    const database = this.read();
    const userId = this.requireCurrentUser(database);
    const cleanName = name.trim();
    if (!cleanName) throw new Error("Enter an organization name.");

    const organization: Organization = { id: nextId("org"), name: cleanName };
    database.organizations.push(organization);
    database.memberships.push({ userId, organizationId: organization.id, role: "owner" });
    database.activeOrganizationByUser[userId] = organization.id;
    this.write(database);
    return this.workspaceFor(database, userId);
  }

  switchOrganization(organizationId: string): AccountWorkspace {
    const database = this.read();
    const userId = this.requireCurrentUser(database);
    const allowed = database.memberships.some(
      (item) => item.userId === userId && item.organizationId === organizationId,
    );
    if (!allowed) throw new Error("You do not belong to this organization.");
    database.activeOrganizationByUser[userId] = organizationId;
    this.write(database);
    return this.workspaceFor(database, userId);
  }

  listMembers(organizationId: string): OrganizationMember[] {
    const database = this.read();
    const userId = this.requireCurrentUser(database);
    const allowed = database.memberships.some(
      (item) => item.userId === userId && item.organizationId === organizationId,
    );
    if (!allowed) return [];

    return database.memberships
      .filter((membership) => membership.organizationId === organizationId)
      .flatMap((membership) => {
        const user = database.users.find((candidate) => candidate.id === membership.userId);
        return user ? [{
          user,
          membership,
          status: database.memberStatusByKey[memberKey(organizationId, user.id)] ?? "active",
        }] : [];
      });
  }

  addMember(organizationId: string, emailValue: string, role: MembershipRole): OrganizationMember {
    const database = this.read();
    const currentUserId = this.requireCurrentUser(database);
    const currentMembership = database.memberships.find(
      (item) => item.userId === currentUserId && item.organizationId === organizationId,
    );
    if (!currentMembership || currentMembership.role === "member") {
      throw new Error("Only owners and admins can add members.");
    }

    const email = normalizeEmail(emailValue);
    if (!email || !email.includes("@")) throw new Error("Enter a valid member email.");
    const existingUser = database.users.find((candidate) => candidate.email === email);
    const user: AccountUser = existingUser ?? {
      id: stableId("usr", email),
      email,
      displayName: email.split("@")[0] ?? email,
    };
    if (!existingUser) {
      database.users.push(user);
    }

    let membership = database.memberships.find(
      (item) => item.userId === user.id && item.organizationId === organizationId,
    );
    if (!membership) {
      membership = { userId: user.id, organizationId, role };
      database.memberships.push(membership);
    } else if (membership.role === "owner") {
      throw new Error("An organization owner cannot be reassigned from this preview.");
    } else {
      membership.role = role;
    }
    const status = existingUser ? "active" : "invited";
    database.memberStatusByKey[memberKey(organizationId, user.id)] = status;
    this.write(database);
    return { user, membership, status };
  }

  resendInvitation(organizationId: string, memberId: string): void {
    const database = this.read();
    this.requireManager(database, organizationId);
    const membership = database.memberships.find(
      (item) => item.organizationId === organizationId && item.userId === memberId,
    );
    if (!membership || database.memberStatusByKey[memberKey(organizationId, memberId)] !== "invited") {
      throw new Error("Only pending invitations can be resent.");
    }
  }

  cancelInvitation(organizationId: string, memberId: string): void {
    const database = this.read();
    this.requireManager(database, organizationId);
    const key = memberKey(organizationId, memberId);
    if (database.memberStatusByKey[key] !== "invited") {
      throw new Error("Only pending invitations can be cancelled.");
    }
    database.memberships = database.memberships.filter(
      (item) => item.organizationId !== organizationId || item.userId !== memberId,
    );
    delete database.memberStatusByKey[key];
    if (!database.memberships.some((item) => item.userId === memberId)) {
      database.users = database.users.filter((item) => item.id !== memberId);
    }
    this.write(database);
  }

  revokeMember(organizationId: string, memberId: string): void {
    const database = this.read();
    const currentUserId = this.requireManager(database, organizationId);
    const currentMembership = database.memberships.find(
      (item) => item.organizationId === organizationId && item.userId === currentUserId,
    );
    const membership = database.memberships.find(
      (item) => item.organizationId === organizationId && item.userId === memberId,
    );
    if (!membership || database.memberStatusByKey[memberKey(organizationId, memberId)] === "invited") {
      throw new Error("Only active members can be revoked.");
    }
    if (membership.role === "owner") throw new Error("The workspace owner cannot be revoked.");
    if (memberId === currentUserId) throw new Error("You cannot revoke your own access.");
    if (currentMembership?.role === "admin" && membership.role !== "member") {
      throw new Error("Admins can only revoke members.");
    }
    database.memberships = database.memberships.filter(
      (item) => item.organizationId !== organizationId || item.userId !== memberId,
    );
    delete database.memberStatusByKey[memberKey(organizationId, memberId)];
    this.write(database);
  }

  updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: Exclude<MembershipRole, "owner">,
  ): void {
    const database = this.read();
    const currentUserId = this.requireManager(database, organizationId);
    const currentMembership = database.memberships.find(
      (item) => item.organizationId === organizationId && item.userId === currentUserId,
    );
    const targetMembership = database.memberships.find(
      (item) => item.organizationId === organizationId && item.userId === memberId,
    );
    if (!targetMembership) throw new Error("The workspace member could not be found.");
    if (database.memberStatusByKey[memberKey(organizationId, memberId)] === "invited") {
      throw new Error("Accept the invitation before changing this role.");
    }
    if (targetMembership.role === "owner") {
      throw new Error("The owner role can only be changed by transferring ownership.");
    }

    if (currentMembership?.role === "owner") {
      targetMembership.role = newRole;
    } else if (
      currentMembership?.role === "admin"
      && memberId === currentUserId
      && targetMembership.role === "admin"
      && newRole === "member"
    ) {
      targetMembership.role = "member";
    } else if (
      currentMembership?.role === "admin"
      && targetMembership.role === "member"
      && newRole === "admin"
    ) {
      targetMembership.role = "admin";
    } else {
      throw new Error("Admins can promote members and demote only their own account.");
    }
    this.write(database);
  }

  transferOwnership(organizationId: string, newOwnerId: string): void {
    const database = this.read();
    const currentUserId = this.requireManager(database, organizationId);
    const currentMembership = database.memberships.find(
      (item) => item.organizationId === organizationId && item.userId === currentUserId,
    );
    if (currentMembership?.role !== "owner") {
      throw new Error("Only the workspace owner can transfer ownership.");
    }
    const newOwnerMembership = database.memberships.find(
      (item) => item.organizationId === organizationId && item.userId === newOwnerId,
    );
    if (!newOwnerMembership || newOwnerMembership.role !== "admin") {
      throw new Error("Ownership can only be transferred to an active admin.");
    }
    if (database.memberStatusByKey[memberKey(organizationId, newOwnerId)] === "invited") {
      throw new Error("The admin must accept the invitation before becoming owner.");
    }
    currentMembership.role = "admin";
    newOwnerMembership.role = "owner";
    this.write(database);
  }

  private workspaceFor(database: AccountDatabase, userId: string): AccountWorkspace {
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!user) throw new Error("The saved account could not be loaded.");
    const memberships = database.memberships.filter((item) => item.userId === userId);
    const organizationIds = new Set(memberships.map((item) => item.organizationId));
    const organizations = database.organizations.filter((item) => organizationIds.has(item.id));
    const requestedActiveId = database.activeOrganizationByUser[userId];
    const activeOrganizationId = organizations.some((item) => item.id === requestedActiveId)
      ? requestedActiveId
      : organizations[0]?.id;

    const session = activeOrganizationId
      ? { user, memberships, activeOrganizationId }
      : { user, memberships };
    return { session, organizations };
  }

  private requireCurrentUser(database: AccountDatabase): string {
    if (!database.currentUserId) throw new Error("Sign in before managing organizations.");
    return database.currentUserId;
  }

  private read(): AccountDatabase {
    if (!this.storage) return emptyDatabase();
    try {
      const value = this.storage.getItem(STORAGE_KEY);
      if (!value) return emptyDatabase();
      const parsed = JSON.parse(value) as Partial<AccountDatabase>;
      return {
        version: 2,
        ...(parsed.currentUserId ? { currentUserId: parsed.currentUserId } : {}),
        users: Array.isArray(parsed.users) ? parsed.users : [],
        organizations: Array.isArray(parsed.organizations) ? parsed.organizations : [],
        memberships: Array.isArray(parsed.memberships) ? parsed.memberships : [],
        memberStatusByKey: parsed.memberStatusByKey ?? {},
        activeOrganizationByUser: parsed.activeOrganizationByUser ?? {},
      };
    } catch {
      return emptyDatabase();
    }
  }

  private write(database: AccountDatabase): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(database));
    } catch {
      // The current in-memory UI remains usable when browser storage is restricted.
    }
  }

  private requireManager(database: AccountDatabase, organizationId: string): string {
    const currentUserId = this.requireCurrentUser(database);
    const membership = database.memberships.find(
      (item) => item.organizationId === organizationId && item.userId === currentUserId,
    );
    if (!membership || membership.role === "member") {
      throw new Error("Only owners and admins can manage members.");
    }
    return currentUserId;
  }
}

export const localAccountWorkspaceRepository = new LocalAccountWorkspaceRepository();
