/**
 * Atproto OAuth client for browser authentication.
 * Provides authentication with Bluesky/AT Protocol accounts.
 */

import { BrowserOAuthClient, type OAuthSession } from "@atproto/oauth-client-browser";
import { Agent } from "@atproto/api";

/**
 * Configuration for the OAuth client.
 */
export interface AuthClientConfig {
  /** URL to the client metadata JSON file */
  clientId: string;
  /** Handle resolver URL (default: https://bsky.social/) */
  handleResolver?: string;
}

/**
 * Result of session initialization.
 */
export interface AuthInitResult {
  /** The authenticated session, if any */
  session: OAuthSession | null;
  /** Whether the session was just created (from callback) */
  isNewSession: boolean;
}

/**
 * Authenticated user information.
 */
export interface AuthUser {
  /** User's DID (decentralized identifier) */
  did: string;
  /** User's handle (e.g., user.bsky.social) */
  handle: string;
  /** User's display name */
  displayName?: string;
  /** User's avatar URL */
  avatar?: string;
}

let oauthClient: BrowserOAuthClient | null = null;
let currentSession: OAuthSession | null = null;

/**
 * Initialize the OAuth client.
 * Must be called before any other auth operations.
 */
export async function initAuthClient(config: AuthClientConfig): Promise<BrowserOAuthClient> {
  if (oauthClient) {
    return oauthClient;
  }

  oauthClient = await BrowserOAuthClient.load({
    clientId: config.clientId,
    handleResolver: config.handleResolver ?? "https://bsky.social/",
  });

  return oauthClient;
}

/**
 * Check for existing session or handle OAuth callback.
 * Call this on app initialization to restore or complete authentication.
 */
export async function initSession(): Promise<AuthInitResult> {
  if (!oauthClient) {
    throw new Error("OAuth client not initialized. Call initAuthClient first.");
  }

  const result = await oauthClient.init();

  if (result?.session) {
    currentSession = result.session;
    return {
      session: result.session,
      isNewSession: result.state === "callback",
    };
  }

  return {
    session: null,
    isNewSession: false,
  };
}

/**
 * Get the current authenticated session.
 */
export function getSession(): OAuthSession | null {
  return currentSession;
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated(): boolean {
  return currentSession !== null;
}

/**
 * Start the OAuth login flow.
 * Redirects the user to their PDS authorization page.
 * @param handle - The user's handle (e.g., user.bsky.social)
 */
export async function login(handle: string): Promise<void> {
  if (!oauthClient) {
    throw new Error("OAuth client not initialized. Call initAuthClient first.");
  }

  const authUrl = await oauthClient.authorize(handle);
  window.location.href = authUrl.toString();
}

/**
 * Sign out the current user.
 */
export async function logout(): Promise<void> {
  if (currentSession) {
    await currentSession.signOut();
    currentSession = null;
  }
}

/**
 * Get an Agent instance for making authenticated API calls.
 */
export function getAgent(): Agent | null {
  if (!currentSession) {
    return null;
  }

  return new Agent(currentSession);
}

/**
 * Get the current user's information.
 * Fetches profile data from the API.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const agent = getAgent();
  if (!agent || !currentSession) {
    return null;
  }

  const profile = await agent.getProfile({ actor: currentSession.did });

  return {
    did: currentSession.did,
    handle: profile.data.handle,
    displayName: profile.data.displayName,
    avatar: profile.data.avatar,
  };
}
