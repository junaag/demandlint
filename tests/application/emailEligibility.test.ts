import { describe, expect, it } from "vitest";
import {
  assertProfessionalEmail,
  CONSUMER_EMAIL_MESSAGE,
  DISPOSABLE_EMAIL_MESSAGE,
  EmailEligibilityError,
  evaluateProfessionalEmail,
} from "../../src/application/auth/emailEligibility";

describe("professional email eligibility", () => {
  it("allows professional email domains, including domains hosted by Google or Microsoft", () => {
    expect(evaluateProfessionalEmail("alex@company.com")).toEqual({
      email: "alex@company.com",
      eligible: true,
    });
    expect(assertProfessionalEmail(" admin@workspace-company.co.uk ")).toBe(
      "admin@workspace-company.co.uk",
    );
  });

  it.each(["person@gmail.com", "person@yahoo.fr", "person@gmx.de", "person@hotmail.co.uk"])(
    "rejects consumer provider %s",
    (email) => {
      expect(evaluateProfessionalEmail(email).reason).toBe("consumer");
      expect(() => assertProfessionalEmail(email)).toThrow(CONSUMER_EMAIL_MESSAGE);
    },
  );

  it("rejects disposable domains and their subdomains", () => {
    expect(evaluateProfessionalEmail("user@mailinator.com").reason).toBe("disposable");
    expect(() => assertProfessionalEmail("user@sub.yopmail.com")).toThrow(DISPOSABLE_EMAIL_MESSAGE);
  });

  it("allows only the exact normalized personal Gmail exception", () => {
    expect(assertProfessionalEmail("  JU.IMBERT@GMAIL.COM ")).toBe("ju.imbert@gmail.com");
    expect(() => assertProfessionalEmail("ju.imbert+anything@gmail.com"))
      .toThrow(EmailEligibilityError);
    expect(() => assertProfessionalEmail("another.user@gmail.com"))
      .toThrow(CONSUMER_EMAIL_MESSAGE);
  });
});
