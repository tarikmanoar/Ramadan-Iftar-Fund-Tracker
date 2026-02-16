# Cloudflare Full-Stack Architecture - Generic Instructions

## Tech Stack Overview

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (PostCSS)
- **Build Tool**: Vite
- **PWA**: Service Worker for offline support
- **Authentication**: Google OAuth 2.0

### Backend
- **Runtime**: Cloudflare Workers (serverless API)
- **Database**: Cloudflare D1 (SQLite)
- **Deployment**: Cloudflare Pages (frontend) + Workers (API)

### Key Libraries
- `lucide-react` - Icon library
- `clsx` - Conditional className composition

## Architecture & Communication Flow

### 1. Frontend-Backend Communication Pattern

**API Client Layer** (`services/dbService.ts`):
- Centralized service that makes authenticated fetch calls to Worker endpoints
- All methods are async and include Bearer token authentication
- Handles data transformation (camelCase ↔ snake_case conversion)
- Session token stored in localStorage

```typescript
// Example API client structure
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const apiClient = {
  async get(endpoint: string) {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },
  
  async post(endpoint: string, data: any) {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
  // PUT, DELETE methods follow same pattern
};
```

### 2. State Management Pattern

**Global State** (`App.tsx`):
- State lives at the top level (App component)
- Data flows down to child components via props
- All CRUD handlers defined in App.tsx and passed as props
- Child components are presentational/controlled

```typescript
// App.tsx pattern - State at top level
const [data, setData] = useState<Entity[]>([]);
const [user, setUser] = useState<User | null>(null);

// Handlers passed down to children
const handleCreate = async (entity: Entity) => {
  const created = await apiClient.post('/api/entities', entity);
  setData([...data, created]);
};

const handleUpdate = async (id: string, updates: Partial<Entity>) => {
  await apiClient.put(`/api/entities/${id}`, updates);
  setData(data.map(item => item.id === id ? {...item, ...updates} : item));
};

const handleDelete = async (id: string) => {
  await apiClient.delete(`/api/entities/${id}`);
  setData(data.filter(item => item.id !== id));
};

// Pass to children
<ChildComponent 
  data={data}
  onCreate={handleCreate}
  onUpdate={handleUpdate}
  onDelete={handleDelete}
/>
```

### 3. Backend API Structure

**Worker Entry Point** (`worker/src/index.ts`):
```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        headers: {
          'Access-Control-Allow-Origin': env.FRONTEND_URL,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Auth endpoints (no authentication required)
    if (url.pathname === '/api/auth/callback') {
      return handleOAuthCallback(request, env);
    }

    // Protected endpoints - verify session
    const user = await verifySession(request, env);
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Route to handlers
    if (url.pathname === '/api/entities') {
      return handleEntities(request, env, user);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};
```

**Authentication Module** (`worker/src/auth.ts`):
```typescript
export async function verifySession(request: Request, env: Env): Promise<User | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  
  // Check session in D1
  const session = await env.DB.prepare(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first();
  
  if (!session) return null;
  
  // Get user
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(session.user_id).first();
  
  return user;
}
```

**CRUD Handlers** (`worker/src/handlers.ts`):
```typescript
export async function handleEntities(request: Request, env: Env, user: User): Promise<Response> {
  const url = new URL(request.url);
  
  if (request.method === 'GET') {
    // List all entities for user
    const results = await env.DB.prepare(
      'SELECT * FROM entities WHERE user_id = ?'
    ).bind(user.id).all();
    
    return Response.json(results.results);
  }
  
  if (request.method === 'POST') {
    // Create new entity
    const data = await request.json();
    await env.DB.prepare(
      'INSERT INTO entities (id, user_id, name, created_at) VALUES (?, ?, ?, datetime("now"))'
    ).bind(crypto.randomUUID(), user.id, data.name).run();
    
    return Response.json({ success: true });
  }
  
  if (request.method === 'PUT') {
    // Update entity
    const data = await request.json();
    await env.DB.prepare(
      'UPDATE entities SET name = ? WHERE id = ? AND user_id = ?'
    ).bind(data.name, data.id, user.id).run();
    
    return Response.json({ success: true });
  }
  
  if (request.method === 'DELETE') {
    // Delete entity
    const data = await request.json();
    await env.DB.prepare(
      'DELETE FROM entities WHERE id = ? AND user_id = ?'
    ).bind(data.id, user.id).run();
    
    return Response.json({ success: true });
  }
  
  return new Response('Method not allowed', { status: 405 });
}
```

### 4. Google OAuth Flow

**OAuth Handler** (`worker/src/oauth.ts`):
```typescript
export async function handleOAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return new Response('Missing code', { status: 400 });
  }
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${env.FRONTEND_URL}/auth/callback`,
      grant_type: 'authorization_code'
    })
  });
  
  const tokens = await tokenResponse.json();
  
  // Fetch user info
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  
  const googleUser = await userResponse.json();
  
  // Create/update user in database
  await env.DB.prepare(
    'INSERT OR REPLACE INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)'
  ).bind(googleUser.id, googleUser.email, googleUser.name, googleUser.picture).run();
  
  // Create session
  const sessionToken = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, datetime("now", "+30 days"))'
  ).bind(crypto.randomUUID(), googleUser.id, sessionToken, ).run();
  
  // Redirect to frontend with session token
  return Response.redirect(`${env.FRONTEND_URL}?session=${sessionToken}`);
}
```

**Frontend Auth Context** (`services/authContext.tsx`):
```typescript
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Check for session in URL (OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    
    if (session) {
      localStorage.setItem('session_token', session);
      window.history.replaceState({}, '', '/');
      // Fetch user data from API
      fetchUser();
    } else if (localStorage.getItem('session_token')) {
      fetchUser();
    }
  }, []);
  
  const login = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'email profile';
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=${scope}`;
  };
  
  const logout = () => {
    localStorage.removeItem('session_token');
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 5. Database Schema Pattern

**Migration Files** (`worker/migrations/XXXX_description.sql`):
```sql
-- Base tables structure
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entities_user_id ON entities(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
```

## Development Workflow

### Running Locally
```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev:all

# Or start separately:
npm run dev          # Frontend on :3000
npm run dev:worker   # Worker on :8787
```

### Database Setup
```bash
# Create D1 database (one-time)
npx wrangler d1 create your-database-name

# Update wrangler.toml with database ID
# [[d1_databases]]
# binding = "DB"
# database_name = "your-database-name"
# database_id = "xxxx-xxxx-xxxx-xxxx"

# Run migrations locally
npx wrangler d1 migrations apply your-database-name --local

# Run migrations in production
npx wrangler d1 migrations apply your-database-name

# Query database
npx wrangler d1 execute your-database-name --command "SELECT * FROM users"
```

### Environment Variables

**Frontend** (`.env.local`):
```env
VITE_API_URL=http://localhost:8787
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Worker** (`.dev.vars`):
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
SESSION_SECRET=your-session-secret
FRONTEND_URL=http://localhost:3000
```

**Worker Secrets (Production)**:
```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

### Deployment

**1. Deploy Worker API**:
```bash
npm run build:worker
npx wrangler deploy
```

**2. Deploy Frontend to Cloudflare Pages**:
```bash
# Build frontend
npm run build

# Deploy via Wrangler
npx wrangler pages deploy dist --project-name your-project-name

# Or connect Git repo through Cloudflare Dashboard
# - Go to Workers & Pages → Create application → Pages
# - Connect to Git repository
# - Build command: npm run build
# - Build output directory: dist
```

**3. Configure Environment Variables**:
- In Cloudflare Dashboard → Pages → Settings → Environment Variables
- Add production variables: `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`

**4. Update wrangler.toml for production**:
```toml
name = "your-api-worker"
main = "worker/src/index.ts"
compatibility_date = "2024-01-01"

[vars]
FRONTEND_URL = "https://your-project.pages.dev"

[[d1_databases]]
binding = "DB"
database_name = "your-database"
database_id = "your-database-id"
```

## Project Structure

```
├── src/
│   ├── App.tsx              # Main app component with state
│   ├── index.tsx            # React entry point
│   ├── types.ts             # TypeScript types
│   ├── components/          # React components
│   └── services/
│       ├── authContext.tsx  # Auth provider
│       └── dbService.ts     # API client layer
├── worker/
│   ├── src/
│   │   ├── index.ts         # Worker entry point
│   │   ├── auth.ts          # Session verification
│   │   ├── oauth.ts         # Google OAuth flow
│   │   ├── handlers.ts      # CRUD handlers
│   │   └── types.ts         # Worker types
│   └── migrations/          # D1 SQL migrations
├── public/                  # Static assets
├── .env.local               # Frontend env vars
├── .dev.vars                # Worker env vars
├── wrangler.toml            # Cloudflare config
├── vite.config.ts           # Vite config
└── package.json
```

## Key Patterns & Best Practices

### Data Flow
1. User interacts with UI component
2. Component calls handler from props (passed from App.tsx)
3. Handler calls dbService method
4. dbService makes authenticated fetch to Worker endpoint
5. Worker verifies session, processes request, queries D1
6. Response flows back up, state updates, UI re-renders

### Security
- All API endpoints (except OAuth callback) require valid session token
- Sessions expire after 30 days, checked on each request
- User-scoped queries: Always filter by `user_id` in SQL
- CORS headers configured to allow only frontend origin
- Never expose secrets in frontend code

### Performance
- Use `useMemo` for expensive computed values
- Batch independent API calls when possible
- D1 indexes on frequently queried columns
- Service Worker caching for static assets

### Error Handling
```typescript
// Frontend API client
try {
  const data = await apiClient.get('/api/entities');
  setData(data);
} catch (error) {
  console.error('Failed to fetch:', error);
  // Show user-friendly error message
}

// Worker handler
try {
  const result = await env.DB.prepare('...').run();
  return Response.json({ success: true });
} catch (error) {
  console.error('Database error:', error);
  return Response.json({ error: 'Internal error' }, { status: 500 });
}
```

### TypeScript Types
Define shared types for type safety across frontend and backend:
```typescript
// types.ts (shared)
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface Entity {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

// Worker types
export interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  FRONTEND_URL: string;
}
```

## Tailwind CSS v4 with PostCSS

**Configuration** (`postcss.config.js`):
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {}
  }
};
```

**Import in CSS** (`index.css`):
```css
@import "tailwindcss";

@theme {
  --color-primary: #047857;
  --color-accent: #f59e0b;
  /* Custom theme values */
}
```

## PWA Configuration

**Service Worker** (`sw.js`):
```javascript
const CACHE_NAME = 'app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

**Manifest** (`manifest.json`):
```json
{
  "name": "Your App Name",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#047857",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## Debugging & Monitoring

**Worker Logs**:
```bash
npx wrangler tail your-worker-name
```

**Database Inspection**:
```bash
# Local
npx wrangler d1 execute your-db-name --local --command "SELECT * FROM table"

# Production
npx wrangler d1 execute your-db-name --command "SELECT * FROM table"
```

**Frontend Debugging**:
- Chrome DevTools → Application → Local Storage (check session token)
- Network tab → Filter by /api/ (inspect API calls)
- Console → Check for errors

---

This architecture provides a scalable, serverless full-stack application with:
- ✅ Global edge deployment via Cloudflare
- ✅ Real authentication with Google OAuth
- ✅ Type-safe communication between frontend and backend
- ✅ Persistent data storage with D1
- ✅ PWA capabilities for offline support
- ✅ Modern React patterns with TypeScript
