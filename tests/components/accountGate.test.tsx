import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AccountGate } from "../../src/components/AccountGate";

describe("AccountGate", () => {
  it("keeps one OTP-first auth screen with only Google and Microsoft alternatives", () => {
    const html = renderToStaticMarkup(
      <AccountGate
        mode="signup"
        hosted
        googleEnabled={false}
        microsoftEnabled={false}
        onRequestAccess={vi.fn(async () => true)}
        onVerifyCode={vi.fn(async () => undefined)}
        onProviderSignIn={vi.fn(async () => undefined)}
      />,
    );

    expect(html).toContain("Send me a secure code");
    expect(html).toContain("Google");
    expect(html).toContain("Microsoft");
    expect(html).not.toContain("Organization");
    expect(html).not.toContain("Continue with email");
    expect(html).not.toContain("Login");
    expect(html).not.toContain("Sign up");
  });
});
