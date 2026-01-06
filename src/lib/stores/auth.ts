/**
 * Auth store for reactive session state management.
 * Integrates with Atproto OAuth client for authentication.
 */

import { writable, derived, type Readable } from "svelte/store";
import type { OAuthSession } from "@atproto/oauth-client-browser";
import {
  initAuthClient,
  initSession,
  login as authLogin,
  logout as authLogout,
  getCurrentUser,
  type AuthUser,
  type AuthClientConfig,
} from "$lib/auth";

/**
 * Auth state for the application.
 */
export interface AuthState {
  /** Whether auth is initializing */
  loading: boolean;
  /** Whether user is authenticated */
  authenticated: boolean;
  /** Current user info (null if not authenticated) */
  user: AuthUser | null;
  /** Error message if auth failed */
  error: string | null;
}

const initialState: AuthState = {
  loading: true,
  authenticated: false,
  user: null,
  error: null,
};

/**
 * Create the auth store.
 */
function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  let session: OAuthSession | null = null;

  return {
    subscribe,

    /**
     * Initialize the auth system.
     * Call this on app startup.
     */
    async init(config: AuthClientConfig): Promise<void> {
      try {
        update((state) => ({ ...state, loading: true, error: null }));

        await initAuthClient(config);
        const result = await initSession();

        if (result.session) {
          session = result.session;
          const user = await getCurrentUser();

          set({
            loading: false,
            authenticated: true,
            user,
            error: null,
          });
        } else {
          set({
            loading: false,
            authenticated: false,
            user: null,
            error: null,
          });
        }
      } catch (error) {
        set({
          loading: false,
          authenticated: false,
          user: null,
          error: error instanceof Error ? error.message : "Authentication failed",
        });
      }
    },

    /**
     * Start the login flow.
     * @param handle - User's handle (e.g., user.bsky.social)
     */
    async login(handle: string): Promise<void> {
      try {
        update((state) => ({ ...state, loading: true, error: null }));
        await authLogin(handle);
        // User will be redirected to PDS for authorization
      } catch (error) {
        update((state) => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : "Login failed",
        }));
      }
    },

    /**
     * Log out the current user.
     */
    async logout(): Promise<void> {
      try {
        update((state) => ({ ...state, loading: true }));
        await authLogout();
        session = null;

        set({
          loading: false,
          authenticated: false,
          user: null,
          error: null,
        });
      } catch (error) {
        update((state) => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : "Logout failed",
        }));
      }
    },

    /**
     * Refresh user data from the API.
     */
    async refreshUser(): Promise<void> {
      if (!session) return;

      try {
        const user = await getCurrentUser();
        update((state) => ({ ...state, user }));
      } catch (error) {
        update((state) => ({
          ...state,
          error: error instanceof Error ? error.message : "Failed to refresh user",
        }));
      }
    },

    /**
     * Clear any error state.
     */
    clearError(): void {
      update((state) => ({ ...state, error: null }));
    },
  };
}

/**
 * The auth store instance.
 */
export const auth = createAuthStore();

/**
 * Derived store for checking if user is authenticated.
 */
export const isAuthenticatedStore: Readable<boolean> = derived(
  auth,
  ($auth) => $auth.authenticated,
);

/**
 * Derived store for the current user.
 */
export const currentUser: Readable<AuthUser | null> = derived(auth, ($auth) => $auth.user);

/**
 * Derived store for loading state.
 */
export const authLoading: Readable<boolean> = derived(auth, ($auth) => $auth.loading);
