// Re-export auth module
export {
  initAuthClient,
  initSession,
  getSession,
  isAuthenticated,
  login,
  logout,
  getAgent,
  getCurrentUser,
  type AuthClientConfig,
  type AuthInitResult,
  type AuthUser,
} from "./client";
