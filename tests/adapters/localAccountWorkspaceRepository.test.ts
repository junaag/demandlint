import { describe, expect, it } from "vitest";
import { LocalAccountWorkspaceRepository } from "../../src/adapters/browser/localAccountWorkspaceRepository";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("local account workspace repository", () => {
  it("creates a profile from work email only and reopens it through login", () => {
    const repository = new LocalAccountWorkspaceRepository(new MemoryStorage());
    const created = repository.createAccount({ email: "Alex.Martin@Company.com" });

    expect(created.session.user.email).toBe("alex.martin@company.com");
    expect(created.session.user.displayName).toBe("Alex Martin");
    expect(created.organizations[0]?.name).toBe("Company workspace");
    expect(created.session.memberships[0]?.role).toBe("owner");

    repository.signOut();
    expect(repository.loadWorkspace()).toBeNull();
    const reopened = repository.signIn("alex.martin@company.com");
    expect(reopened.organizations).toHaveLength(1);
    expect(reopened.organizations[0]?.name).toBe("Company workspace");
    expect(() => repository.createAccount({ email: "alex.martin@company.com" }))
      .toThrow("An account already exists");
  });

  it("does not silently create an unknown account from the login page", () => {
    const repository = new LocalAccountWorkspaceRepository(new MemoryStorage());
    expect(() => repository.signIn("unknown@company.com"))
      .toThrow("No account exists");
  });

  it("keeps multiple organizations and allows owners to add members", () => {
    const repository = new LocalAccountWorkspaceRepository(new MemoryStorage());
    const first = repository.createAccount({ email: "alex@company.com" });
    const second = repository.createOrganization("Spain");

    expect(second.organizations.map((item) => item.name)).toEqual(["Company workspace", "Spain"]);
    expect(second.session.activeOrganizationId).not.toBe(first.session.activeOrganizationId);

    const member = repository.addMember(
      second.session.activeOrganizationId as string,
      "sam@company.com",
      "admin",
    );
    expect(member.membership.role).toBe("admin");
    expect(member.status).toBe("invited");
    expect(repository.listMembers(second.session.activeOrganizationId as string)).toHaveLength(2);
  });

  it("resends and cancels invitations, then revokes active members", () => {
    const repository = new LocalAccountWorkspaceRepository(new MemoryStorage());
    const ownerWorkspace = repository.createAccount({ email: "owner@company.com" });
    const organizationId = ownerWorkspace.session.activeOrganizationId as string;

    const invited = repository.addMember(organizationId, "pending@company.com", "member");
    expect(invited.status).toBe("invited");
    expect(() => repository.resendInvitation(organizationId, invited.user.id)).not.toThrow();
    repository.cancelInvitation(organizationId, invited.user.id);
    expect(repository.listMembers(organizationId).map((item) => item.user.email))
      .not.toContain("pending@company.com");

    repository.signOut();
    const teammate = repository.createAccount({ email: "active@company.com" });
    repository.signOut();
    repository.signIn("owner@company.com");
    const active = repository.addMember(organizationId, teammate.session.user.email, "admin");
    expect(active.status).toBe("active");
    repository.revokeMember(organizationId, active.user.id);
    expect(repository.listMembers(organizationId).map((item) => item.user.email))
      .not.toContain("active@company.com");
  });

  it("enforces role hierarchy and transfers ownership atomically", () => {
    const repository = new LocalAccountWorkspaceRepository(new MemoryStorage());
    const owner = repository.createAccount({ email: "owner@company.com" });
    const organizationId = owner.session.activeOrganizationId as string;

    repository.signOut();
    const firstAdmin = repository.createAccount({ email: "admin.one@company.com" }).session.user;
    repository.signOut();
    const secondAdmin = repository.createAccount({ email: "admin.two@company.com" }).session.user;
    repository.signOut();
    const member = repository.createAccount({ email: "member@company.com" }).session.user;
    repository.signOut();
    repository.signIn(owner.session.user.email);

    repository.addMember(organizationId, firstAdmin.email, "admin");
    repository.addMember(organizationId, secondAdmin.email, "admin");
    repository.addMember(organizationId, member.email, "member");
    expect(() => repository.updateMemberRole(organizationId, owner.session.user.id, "member"))
      .toThrow("transferring ownership");

    repository.signOut();
    repository.signIn(firstAdmin.email);
    expect(() => repository.updateMemberRole(organizationId, secondAdmin.id, "member"))
      .toThrow("demote only their own");
    expect(() => repository.revokeMember(organizationId, secondAdmin.id))
      .toThrow("only revoke members");
    repository.updateMemberRole(organizationId, member.id, "admin");
    repository.updateMemberRole(organizationId, firstAdmin.id, "member");

    repository.signOut();
    repository.signIn(owner.session.user.email);
    repository.transferOwnership(organizationId, member.id);
    const roles = Object.fromEntries(
      repository.listMembers(organizationId).map((item) => [item.user.email, item.membership.role]),
    );
    expect(roles[owner.session.user.email]).toBe("admin");
    expect(roles[member.email]).toBe("owner");
  });
});
