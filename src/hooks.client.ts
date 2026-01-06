/**
 * Client-side hooks for SvelteKit.
 * Initializes authentication on app startup.
 */

import { auth } from "$lib/stores";

// Initialize auth on client-side app startup
// Note: This runs once when the app loads in the browser
const clientId =
  typeof window !== "undefined"
    ? `${window.location.origin}/oauth/client-metadata.json`
    : "http://localhost:5173/oauth/client-metadata.json";

auth.init({
  clientId,
  handleResolver: "https://bsky.social/",
});
