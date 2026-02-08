# Ramadan Iftar Fund Tracker - AI Agent Instructions

## Project Overview
A Progressive Web App for tracking Ramadan Iftar donations and expenses. Built with React frontend and Cloudflare Workers backend using D1 database for persistence, featuring real Google OAuth authentication.

## Architecture & Data Flow

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS (CDN)
- **Backend**: Cloudflare Workers (serverless API)
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: Google OAuth 2.0

### State Management
- **Global state lives in [App.tsx](../App.tsx)**: `donations`, `expenses`, `selectedYear`, and `user` are managed here
- Data flows down to child components ([Dashboard.tsx](../components/Dashboard.tsx), [DonationSection.tsx](../components/DonationSection.tsx), [ExpenseSection.tsx](../components/ExpenseSection.tsx))
- All CRUD handlers are defined in App.tsx and passed as props to child components

### Data Persistence Layer
**CRITICAL**: [services/dbService.ts](../services/dbService.ts) is an API client layer:
- Makes authenticated fetch calls to Cloudflare Worker endpoints at `API_BASE_URL`
- All methods are async and include Bearer token authentication
- Handles camelCase (frontend) ↔ snake_case (database) conversion
- Session token stored in localStorage as `iftar_session_token`

### Backend API Structure
**Worker entry point**: [worker/src/index.ts](../worker/src/index.ts)
- Routes requests to appropriate handlers
- Enforces authentication via `verifySession()` for protected routes
- Implements CORS headers for cross-origin requests

**Key modules**:
- [worker/src/auth.ts](../worker/src/auth.ts) - Session verification and helpers
- [worker/src/oauth.ts](../worker/src/oauth.ts) - Google OAuth flow
- [worker/src/handlers.ts](../worker/src/handlers.ts) - CRUD operations for donations/expenses/categories

### Database Schema
[worker/migrations/0001_initial_schema.sql](../worker/migrations/0001_initial_schema.sql):
- `users` - Google OAuth user data
- `donations` - Pledges with partial payment tracking and **year field** for Ramadan campaign tracking
- `expenses` - Categorized expenses with **year field** for Ramadan campaign tracking
- `categories` - User-specific and default categories
- `sessions` - OAuth session tokens with expiration

[worker/migrations/0002_add_year_field.sql](../worker/migrations/0002_add_year_field.sql):
- Added explicit `year` field to donations and expenses tables
- Created indexes on year fields for efficient querying
- Ensures data is explicitly associated with specific Ramadan campaigns, not just inferred from dates

### Authentication Flow
[services/authContext.tsx](../services/authContext.tsx) implements real Google OAuth:
1. User clicks login → Redirects to Google OAuth consent page
2. Google redirects back to `/auth/callback?code=xxx`
3. Worker exchanges code for access token and fetches user info
4. Worker creates/updates user in D1 and generates session token
5. Frontend stores session token and user data in localStorage
6. All API calls include `Authorization: Bearer {sessionToken}` header

### Year-Based Filtering & Read-Only Mode
**Pattern**: Current year is editable, previous years are read-only
- `isReadOnly = selectedYear !== currentYear` (see [App.tsx](../App.tsx) line 22)
- All mutation handlers check `isReadOnly` before executing
- Database uses explicit `year` column for filtering: `WHERE year = ?`
- Year field is automatically set to `selectedYear` when creating/updating donations or expenses
- When adding new features with data modification, always respect this flag and include the year field

## UI Patterns & Styling

### Design System
- **Theme**: Emerald (#047857) primary, Gold (#f59e0b) accent
- **Tailwind via CDN**: Configured inline in [index.html](../index.html) with custom emerald/gold color extensions
- **Typography**: Inter (sans) for UI, Amiri (serif) for headings and emphasis
- **Icons**: `lucide-react` package (e.g., `<Moon />`, `<Wallet />`)

### Component Structure
All components in [components/](../components/):
- Accept typed props with explicit interfaces
- Use `clsx` for conditional className composition
- Follow card-based layout with rounded-xl borders and shadow-sm
- Forms use controlled inputs with local state

### Responsive Design
- Mobile-first approach with md: and lg: breakpoints
- Grid layouts: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` pattern
- Touch-optimized with `user-scalable=no` viewport setting

## Development Workflow

### Running the App
```bash
npm run dev:all       # Starts both frontend (3000) and worker (8787)
npm run dev           # Frontend only (Vite dev server)
npm run dev:worker    # Worker only (Wrangler dev)
npm run build         # Production build (frontend)
npm run build:worker  # Build worker TypeScript
```

### Database Operations
```bash
npm run db:create          # Create D1 database (one-time)
npm run db:migrate:local   # Run migrations locally
npm run db:migrate         # Run migrations in production
wrangler d1 execute iftar-fund-db --command "SELECT * FROM users"
```

### Deployment
```bash
npm run deploy:worker    # Deploy Worker API
npm run deploy:frontend  # Deploy frontend to Cloudflare Pages
```

### Key Files to Modify
- **Add new API endpoint**: Update [worker/src/handlers.ts](../worker/src/handlers.ts) and [worker/src/index.ts](../worker/src/index.ts)
- **Add new entity types**: Update [types.ts](../types.ts), create migration in `worker/migrations/`, extend [dbService.ts](../services/dbService.ts)
- **New UI sections**: Create component in `components/`, add tab to [App.tsx](../App.tsx) navigation
- **Styling changes**: Modify Tailwind config in [index.html](../index.html) (lines 20-47)
- **App metadata**: Update [manifest.json](../manifest.json)

### Environment Variables
**Frontend** (`.env.local`):
- `VITE_API_URL` - Worker API URL (default: http://localhost:8787)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth Client ID

**Worker** (`.dev.vars`):
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `SESSION_SECRET` - Session encryption secret
- `FRONTEND_URL` - Frontend URL for CORS

### PWA & Offline Support
[sw.js](../sw.js) implements:
- App shell caching for static assets
- Network-first strategy for API calls
- Manual service worker registration in [index.html](../index.html)

## Common Code Patterns

### Adding a New API Endpoint
1. Define handler in [worker/src/handlers.ts](../worker/src/handlers.ts):
```typescript
export async function handleNewEntity(request: Request, env: Env, user: User): Promise<Response> {
  // Handle GET, POST, PUT, DELETE
}
```
2. Add route in [worker/src/index.ts](../worker/src/index.ts):
```typescript
if (url.pathname === '/api/new-entity') {
  return handleNewEntity(request, env, user);
}
```
3. Update frontend [dbService.ts](../services/dbService.ts) with client methods

### Database Migrations
Create new file in `worker/migrations/` with incremental naming (e.g., `0002_add_field.sql`):
```sql
ALTER TABLE donations ADD COLUMN new_field TEXT;
```
Run: `npm run db:migrate:local` for testing

### Computed Values
Use `useMemo` for derived state (see [App.tsx](../App.tsx) lines 54-63):
```tsx
const summary = useMemo(() => {
  // expensive calculations from donations/expenses
}, [donations, expenses]);
```

### Category Management
[worker/src/handlers.ts](../worker/src/handlers.ts) includes cascading category operations:
- `updateCategory()` changes all related expenses
- `deleteCategory()` only removes from list, doesn't affect expenses
- Default categories for all users stored with `user_id = 'default'`

### UUID Generation
Use native `crypto.randomUUID()` for IDs (see App.tsx line 78):
```typescript
id: crypto.randomUUID()
```

## Data Validation & Business Rules
Ramadan Campaign Tracking**: All donations and expenses have a `year` field that explicitly associates them with a specific Ramadan campaign year
- **Partial Payments**: Donations have `pledgedAmount` vs `paidAmount` - always allow paidAmount ≤ pledgedAmount
- **Year Filtering**: Database queries filter using indexed `year` column: `WHERE year = ?`nt ≤ pledgedAmount
- **Year Filtering**: Database queries filter by `substr(date, 1, 4)` for SQLite compatibility
- **User Scoping**: All queries filter by `user_id` to isolate user data
- **Currency Formatting**: Use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` consistently
- **Session Expiration**: Sessions expire after 30 days, checked on each API call

## Testing & Debugging
- No test suite currently exists
- Use browser DevTools localStorage inspection for session/user data
- Worker logs: `wrangler tail` for real-time logging
- Database inspection: `wrangler d1 execute iftar-fund-db --command "..."`
- Service Worker debugging: Chrome DevTools → Application → Service Workers

## Security Considerations
- All API endpoints (except `/api/auth/callback`) require valid session token
- Sessions stored in D1 with expiration timestamps
- CORS headers configured to allow frontend origin only
- Google OAuth handles user authentication
- Never expose `GOOGLE_CLIENT_SECRET` in frontend code
