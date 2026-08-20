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
      .toThrow("Un compte existe déjà");
  });

  it("does not silently create an unknown account from the login page", () => {
    const repository = new LocalAccountWorkspaceRepository(new MemoryStorage());
    expect(() => repository.signIn("unknown@company.com"))
      .toThrow("Aucun compte n’existe");
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
    expect(repository.listMembers(second.session.activeOrganizationId as string)).toHaveLength(2);
  });
});
