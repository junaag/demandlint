import type { AuthSession, CreateAccountInput } from "../accounts/domain";

export type SignInMethod = "password" | "google" | "microsoft" | "oidc" | "saml";

export interface AuthGateway {
  getSession(): Promise<AuthSession | null>;
  beginSignIn(method: SignInMethod): Promise<void>;
  createAccount?(input: CreateAccountInput): Promise<AuthSession>;
  signOut(): Promise<void>;
}
