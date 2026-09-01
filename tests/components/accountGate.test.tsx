import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AccountGate } from "../../src/components/AccountGate";

const routeProps = {
  loginHref: "/auth?mode=login",
  signupHref: "/auth",
  termsHref: "/terms",
  privacyHref: "/privacy",
};

describe("AccountGate", () => {
  it("renders the required professional-email error title and clean legal routes", () => {
    const html = renderToStaticMarkup(
      <AccountGate
        mode="signup"
        hosted
        googleEnabled
        microsoftEnabled
        onRequestAccess={async () => true}
        onVerifyCode={async () => undefined}
        onProviderSignIn={async () => undefined}
        errorTitle="Professional email required"
        error="DemandLint is available for business accounts only. Please sign in with your work email address."
        {...routeProps}
      />,
    );

    expect(html).toContain("Professional email required");
    expect(html).toContain("DemandLint is available for business accounts only.");
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
    expect(html).not.toContain("?page=");
  });

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
        {...routeProps}
      />,
    );

    expect(html).toContain("Send me a secure code");
    expect(html).toContain('aria-label="Continue with Google"');
    expect(html).toContain('aria-label="Continue with Microsoft"');
    expect(html).toContain(">Google</span>");
    expect(html).toContain(">Microsoft</span>");
    expect(html.match(/class="auth-provider-button"/g)).toHaveLength(2);
    expect(html.match(/class="auth-provider-icon"/g)).toHaveLength(2);
    expect(html).not.toContain("Organization");
    expect(html).not.toContain("Continue with email");
    expect(html).not.toContain("Login");
    expect(html).not.toContain("Sign up");
  });
});
