# Atproto OAuth Research

Research findings for implementing Atproto OAuth authentication in 1000words.

## Overview

AT Protocol (atproto) uses a decentralized OAuth 2.1 profile for authentication. This is the recommended authentication mechanism, replacing the deprecated username/password (App Password) flow.

## Key Characteristics

### OAuth Profile
- Based on OAuth 2.1 draft specification
- Only "authorization code" grant type (no implicit grants)
- Mandatory PKCE (RFC 7636) with S256 method
- DPoP (with mandatory server-issued nonces) required for token binding
- No shared client_secret - uses public client metadata documents

### Decentralized Design
- No pre-registration with servers required
- Client ID is a URL pointing to public client metadata JSON
- Automatic Authorization Server discovery from user's handle/DID
- Works across many independent PDS instances

## Available Libraries

### Official Packages
| Package | Environment | Description |
|---------|-------------|-------------|
| `@atproto/oauth-client` | Core | Base library for all implementations |
| `@atproto/oauth-client-browser` | Browser/SPA | For frontend-only applications |
| `@atproto/oauth-client-node` | Node.js | For server-side or Electron apps |
| `@atproto/oauth-client-expo` | React Native | For mobile apps |
| `@atproto/api` | Universal | API client with OAuth session support |

### Recommended for 1000words
Use `@atproto/oauth-client-browser` for the SPA frontend with `@atproto/api` for making authenticated API calls.

## Implementation Requirements

### 1. Client Metadata Document
Host a JSON file at an HTTPS URL (this becomes your `client_id`):

```json
{
  "client_id": "https://1000words.app/oauth/client-metadata.json",
  "client_name": "1000 Words",
  "client_uri": "https://1000words.app",
  "redirect_uris": ["https://1000words.app/oauth/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "scope": "atproto",
  "dpop_bound_access_tokens": true,
  "response_types": ["code"]
}
```

### 2. Browser Implementation

```typescript
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';

// Initialize client
const oauthClient = await BrowserOAuthClient.load({
  clientId: 'https://1000words.app/oauth/client-metadata.json',
  handleResolver: 'https://bsky.social/',
});

// Check for existing session
const result = await oauthClient.init();
if (result?.session) {
  // User is authenticated
  const agent = new Agent(result.session);
}

// Start login flow
const handle = 'user.bsky.social';
const authUrl = await oauthClient.authorize(handle);
window.location.href = authUrl;

// After callback, session is automatically restored by init()
```

### 3. Key Security Requirements

1. **PKCE**: Automatically handled by the client library
2. **DPoP**: Automatically handled - unique ES256 keypairs per session
3. **Token Storage**: Browser client uses IndexedDB
4. **HTTPS Required**: All redirect URIs must use HTTPS
5. **Nonce Rotation**: Client handles 401 responses with new nonces

## Authorization Flow

1. **Initiate**: Call `oauthClient.authorize(handle)` with user's handle
2. **Redirect**: User is sent to their PDS authorization endpoint
3. **Consent**: User approves access on their PDS
4. **Callback**: User returns to your redirect_uri with auth code
5. **Exchange**: Client automatically exchanges code for tokens
6. **Session**: OAuthSession object created for API calls

## Scopes

- `atproto` - Base scope for AT Protocol access
- Additional scopes can be requested for specific permissions

## Session Management

```typescript
// Get user DID
const did = session.did;

// Make API calls
const agent = new Agent(session);
const profile = await agent.getProfile({ actor: did });

// Sign out
await session.signOut();
```

## Privacy Considerations

- Using Bluesky's handle resolver (`bsky.social`) shares user IP with Bluesky
- Consider self-hosting handle resolution for better privacy
- User's PDS handles the actual authentication

## SvelteKit Integration Notes

1. Client metadata JSON must be served as a static file
2. OAuth callback route needed at `/oauth/callback`
3. Use SvelteKit's `$app/navigation` for redirects
4. Store session state in Svelte stores for reactivity
5. Consider server-side session verification for protected routes

## Next Steps

1. Install packages: `npm install @atproto/oauth-client-browser @atproto/api`
2. Create client metadata JSON static file
3. Implement OAuth callback route
4. Create auth store for session state
5. Add login/logout UI components

## References

- [OAuth Specification](https://atproto.com/specs/oauth)
- [OAuth Guide](https://atproto.com/guides/oauth)
- [OAuth Client Implementation](https://docs.bsky.app/docs/advanced-guides/oauth-client)
- [OAuth for AT Protocol Blog](https://docs.bsky.app/blog/oauth-atproto)
- [@atproto/api OAUTH.md](https://github.com/bluesky-social/atproto/blob/main/packages/api/OAUTH.md)
