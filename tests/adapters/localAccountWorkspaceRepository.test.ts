import { describe, expect, it } from "vitest";
import { LocalAccountWorkspaceRepository } from "../../src/adapters/browser/localAccountWorkspaceRepository";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("local account workspace repository", () => {
  it("creates a profile with an owner workspace and reopens it by email", () => {
    const repository = new LocalAccountWorkspaceRepository(new MemoryStorage());
    const created = repository.signInOrCreate({
      displayName: "Alex Martin",
      email: "Alex@Company.com",
      organizationName: "Acme Marketing",
    });

    expect(created.session.user.email).toBe("alex@company.com");
    expect(created.organizations[0]?.name).toBe("Acme Marketing");
    expect(created.session.memberships[0]?.role).toBe("owner");

    repository.signOut();
    expect(repository.loadWorkspace()).toBeNull();
    const reopened = repository.signInOrCreate({
      displayName: "Alex Martin",
      email: "alex@company.com",
      organizationName: "Ignored duplicate workspace",
    });
    expect(reopened.organizations).toHaveLength(1);
    expect(reopened.organizations[0]?.name).toBe("Acme Marketing");
  });

  it("keeps multiple organizations and allows owners to add members", () => {
    const repository = new LocalAccountWorkspaceRepository(new MemoryStorage());
    const first = repository.signInOrCreate({
      displayName: "Alex",
      email: "alex@company.com",
      organizationName: "France",
    });
    const second = repository.createOrganization("Spain");

    expect(second.organizations.map((item) => item.name)).toEqual(["France", "Spain"]);
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
