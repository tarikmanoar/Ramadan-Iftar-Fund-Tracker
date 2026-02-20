# Authentication Flow & Google Console Setup

## Overview

This app uses **Google OAuth 2.0 Authorization Code Flow**. The frontend never touches your Google Client Secret — only the Cloudflare Worker holds and uses it during the server-side token exchange.

---

## Full Authentication Flow

```
User                  Frontend (React)           Cloudflare Worker         Google
 │                          │                          │                      │
 │── click "Sign in" ──────>│                          │                      │
 │                          │── redirect to Google ───────────────────────────>│
 │                          │   (auth URL with client_id, redirect_uri, scope) │
 │                          │                          │                      │
 │<─────── Google consent screen ─────────────────────────────────────────────│
 │── approve ──────────────────────────────────────────────────────────────── >│
 │                          │                          │                      │
 │                          │<── redirect to /auth/callback?code=AUTH_CODE ───│
 │                          │                          │                      │
 │                          │── GET /api/auth/callback?code=AUTH_CODE ──────> │
 │                          │                          │                      │
 │                          │                          │── POST token exchange >│
 │                          │                          │   (code + secret)    │
 │                          │                          │<── { access_token } ──│
 │                          │                          │                      │
 │                          │                          │── GET /userinfo ─────>│
 │                          │                          │<── { id, email, name, picture } ─│
 │                          │                          │                      │
 │                          │                          │── INSERT/SELECT users (D1)
 │                          │                          │── INSERT sessions (D1)
 │                          │                          │
 │                          │<── { user, sessionId } ──│
 │                          │                          │
 │                          │── store in localStorage  │
 │                          │   iftar_session_token    │
 │                          │   iftar_user_session     │
 │                          │                          │
 │<── redirect to / (dashboard) ──│                   │
```

---

## Step-by-Step Code Walkthrough

### 1. Login Redirect (`services/authContext.tsx`)

When the user clicks "Sign In", `login()` builds a Google OAuth URL and redirects the browser:

```typescript
const login = () => {
  const redirectUri = `${window.location.origin}/auth/callback`;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth`
    + `?client_id=${GOOGLE_CLIENT_ID}`
    + `&redirect_uri=${encodeURIComponent(redirectUri)}`
    + `&response_type=code`
    + `&scope=${encodeURIComponent('email profile')}`;

  window.location.href = authUrl;
};
```

- `response_type=code` — requests an authorization code (not a token directly)
- `scope=email profile` — requests access to the user's email and basic profile
- `redirect_uri` must exactly match what you registered in Google Console

### 2. Google Redirects Back (`/auth/callback`)

Google redirects the browser to `/auth/callback?code=4/0AXxx...`. The Vite SPA serves `index.html` for this route (no 404), and the React app boots. In `AuthProvider`'s `useEffect`, the code is detected:

```typescript
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code && !isProcessingCallback) {
  // Clear the ?code= from the URL immediately (prevent double-execution)
  window.history.replaceState({}, document.title, window.location.pathname);
  setIsProcessingCallback(true);
  handleOAuthCallback(code);
}
```

### 3. Frontend Forwards Code to Worker (`services/authContext.tsx`)

The frontend does **not** exchange the code itself. It passes it to the Worker:

```typescript
const response = await fetch(`${API_BASE_URL}/api/auth/callback?code=${code}`);
const data = await response.json();
// data = { user: { id, email, name, picture }, sessionId: "uuid" }
```

### 4. Worker Token Exchange (`worker/src/oauth.ts`)

The Worker performs the secure server-side exchange using the `GOOGLE_CLIENT_SECRET`:

```typescript
// Step 1 — Exchange code → access_token
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,   // ← never sent to browser
    redirect_uri: `${env.FRONTEND_URL}/auth/callback`,
    grant_type: 'authorization_code',
  }),
});

// Step 2 — Fetch user profile
const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
  headers: { Authorization: `Bearer ${tokenData.access_token}` },
}).then(r => r.json());
```

### 5. User Upsert & Session Creation (Worker + D1)

```typescript
// Check if user already exists (match by email)
let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
  .bind(userInfo.email).first();

if (!user) {
  // First-time user: create row
  const userId = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)'
  ).bind(userId, userInfo.email, userInfo.name, userInfo.picture).run();
}

// Create 30-day session
const sessionId = crypto.randomUUID();
await env.DB.prepare(
  'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
).bind(sessionId, user.id, expiresAt.toISOString()).run();
```

The Worker returns `{ user, sessionId }` — the `sessionId` is a UUID that acts as a bearer token.

### 6. Frontend Stores Session (`services/authContext.tsx`)

```typescript
setUser(data.user);
localStorage.setItem('iftar_user_session', JSON.stringify(data.user));
localStorage.setItem('iftar_session_token', data.sessionId);
```

On every subsequent page load, `AuthProvider` reads these from localStorage immediately — no network call needed to restore the logged-in state.

### 7. Authenticated API Calls (`services/dbService.ts`)

Every API call sends the session token as a Bearer token:

```typescript
headers['Authorization'] = `Bearer ${sessionToken}`;
```

The Worker's `verifySession()` in `worker/src/auth.ts` checks this on every protected route:

```typescript
const session = await env.DB.prepare(
  `SELECT s.*, u.*
   FROM sessions s
   JOIN users u ON s.user_id = u.id
   WHERE s.id = ? AND s.expires_at > datetime("now")`
).bind(sessionId).first();
```

If the session is expired or missing, the Worker returns `401`. The frontend then clears localStorage and reloads:

```typescript
if (response.status === 401) {
  localStorage.removeItem('iftar_session_token');
  localStorage.removeItem('iftar_user_session');
  window.location.reload();
}
```

### 8. Logout

```typescript
// Frontend calls Worker to delete session from D1
await fetch(`${API_BASE_URL}/api/auth/logout`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${sessionToken}` },
});

// Then clears local state
localStorage.removeItem('iftar_session_token');
localStorage.removeItem('iftar_user_session');
```

---

## Google Console Setup

### Step 1 — Create a Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown (top-left) → **New Project**
3. Name it (e.g. `Iftar Fund Tracker`) → **Create**

### Step 2 — Enable the Google People API

1. In the left sidebar go to **APIs & Services → Library**
2. Search for `Google People API` → **Enable**
3. Also search for `Google+ API` or `Google Identity** → the OAuth userinfo endpoint (`/oauth2/v2/userinfo`) works without explicit API enablement, but enabling it avoids quota surprises.

### Step 3 — Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** (for personal/testing use) → **Create**
3. Fill in:
   - **App name**: Iftar Fund Tracker
   - **User support email**: your email
   - **Developer contact information**: your email
4. Click **Save and Continue**
5. **Scopes** → click **Add or Remove Scopes** → add:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
6. **Save and Continue** through the rest
7. Under **Test Users** (while in External/Testing mode), add the Gmail accounts you want to be able to log in

> **Note**: While in "Testing" mode, only explicitly added test users can log in. To allow anyone to log in, publish the app (click **Publish App** on the consent screen page).

### Step 4 — Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Iftar Fund Tracker Web`
5. Under **Authorized redirect URIs**, add ALL of these:
   ```
   http://localhost:3000/auth/callback          ← local frontend dev
   http://localhost:8787/auth/callback          ← only if testing directly via worker
   https://your-project.pages.dev/auth/callback ← Cloudflare Pages production URL
   https://your-custom-domain.com/auth/callback ← if you have a custom domain
   ```
6. Click **Create**
7. Copy the **Client ID** and **Client Secret** — you'll need both

> **Important**: The redirect URI in your code (`${window.location.origin}/auth/callback`) must exactly match one of the URIs listed here, including the protocol (`http` vs `https`). A mismatch causes `redirect_uri_mismatch` errors.

### Step 5 — Configure Environment Variables

**Local development** (`.env.local`):
```env
VITE_GOOGLE_CLIENT_ID=863590541870-xxxxx.apps.googleusercontent.com
VITE_API_URL=http://localhost:8787
```

**Worker local secrets** (`.dev.vars`):
```env
GOOGLE_CLIENT_ID=863590541870-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
SESSION_SECRET=any-random-secret-string-here
FRONTEND_URL=http://localhost:3000
```

**Worker production secrets** — run these in the terminal (never commit secrets):
```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

**Cloudflare Pages environment variables** (Dashboard → Pages → your project → Settings → Environment Variables):
```
VITE_GOOGLE_CLIENT_ID = 863590541870-xxxxx.apps.googleusercontent.com
VITE_API_URL          = https://your-worker.your-subdomain.workers.dev
```

---

## Database Schema for Auth

```sql
-- Users persisted from Google profile
CREATE TABLE users (
  id           TEXT PRIMARY KEY,                  -- crypto.randomUUID()
  email        TEXT UNIQUE NOT NULL,              -- matched on re-login
  name         TEXT NOT NULL,
  picture      TEXT,                              -- Google profile image URL
  available_years TEXT,                           -- JSON array e.g. [2024,2025,2026]
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Session tokens (Bearer tokens)
CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,                  -- the sessionId returned to frontend
  user_id      TEXT NOT NULL,
  expires_at   TEXT NOT NULL,                     -- 30 days from creation
  created_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Security Notes

| Concern | How it's handled |
|---|---|
| Client Secret | Stored only in Worker secrets — never shipped to the browser |
| Session token | UUID stored in localStorage; no JWT signing needed because validity is checked in D1 |
| Session expiry | 30 days, enforced server-side with `expires_at > datetime("now")` |
| CORS | Worker only allows requests from `FRONTEND_URL` |
| 401 handling | Frontend auto-clears session and reloads when token is rejected |
| Re-login deduplication | `isProcessingCallback` flag prevents double-execution if the effect re-runs |
| URL code leakage | `window.history.replaceState` removes `?code=` from the URL immediately after reading it |
