import type {
  AccountUser,
  AccountWorkspace,
  CreateAccountInput,
  MembershipRole,
  Organization,
  OrganizationMember,
  OrganizationMembership,
} from "../../application/accounts/domain";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface AccountDatabase {
  version: 1;
  currentUserId?: string;
  users: AccountUser[];
  organizations: Organization[];
  memberships: OrganizationMembership[];
  activeOrganizationByUser: Record<string, string>;
}

const STORAGE_KEY = "demandlint.account-workspaces.v1";

function emptyDatabase(): AccountDatabase {
  return {
    version: 1,
    users: [],
    organizations: [],
    memberships: [],
    activeOrganizationByUser: {},
  };
}

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
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

export class LocalAccountWorkspaceRepository {
  constructor(private readonly storage: StorageLike | undefined = browserStorage()) {}

  loadWorkspace(): AccountWorkspace | null {
    const database = this.read();
    if (!database.currentUserId) return null;
    return this.workspaceFor(database, database.currentUserId);
  }

  signInOrCreate(input: CreateAccountInput): AccountWorkspace {
    const email = normalizeEmail(input.email);
    if (!email || !email.includes("@")) throw new Error("Enter a valid email address.");
    if (!input.displayName.trim()) throw new Error("Enter your name.");

    const database = this.read();
    let user = database.users.find((candidate) => candidate.email === email);

    if (!user) {
      user = {
        id: stableId("usr", email),
        email,
        displayName: input.displayName.trim(),
      };
      database.users.push(user);
    } else if (input.displayName.trim() !== user.displayName) {
      user.displayName = input.displayName.trim();
    }

    let memberships = database.memberships.filter((item) => item.userId === user.id);
    if (memberships.length === 0) {
      const organization: Organization = {
        id: nextId("org"),
        name: input.organizationName.trim() || `${user.displayName}'s workspace`,
      };
      database.organizations.push(organization);
      const membership: OrganizationMembership = {
        userId: user.id,
        organizationId: organization.id,
        role: "owner",
      };
      database.memberships.push(membership);
      memberships = [membership];
      database.activeOrganizationByUser[user.id] = organization.id;
    }

    database.currentUserId = user.id;
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
        return user ? [{ user, membership }] : [];
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
    this.write(database);
    return { user, membership };
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
        version: 1,
        ...(parsed.currentUserId ? { currentUserId: parsed.currentUserId } : {}),
        users: Array.isArray(parsed.users) ? parsed.users : [],
        organizations: Array.isArray(parsed.organizations) ? parsed.organizations : [],
        memberships: Array.isArray(parsed.memberships) ? parsed.memberships : [],
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
}

export const localAccountWorkspaceRepository = new LocalAccountWorkspaceRepository();
