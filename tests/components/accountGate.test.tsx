import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountGate } from "../../src/components/AccountGate";

describe("AccountGate", () => {
  it("renders the required professional-email error title and message", () => {
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
        loginHref="/auth?mode=login"
        signupHref="/auth"
        termsHref="/terms"
        privacyHref="/privacy"
      />,
    );

    expect(html).toContain("Professional email required");
    expect(html).toContain("DemandLint is available for business accounts only.");
    expect(html).toContain('href="/auth?mode=login"');
    expect(html).not.toContain("?page=");
  });
});
