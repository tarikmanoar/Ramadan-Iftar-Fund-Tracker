# 🌙 Ramadan Iftar Fund Tracker

A Progressive Web App for tracking Ramadan Iftar donations and expenses with real Google OAuth authentication. Built with React frontend and Cloudflare Workers backend, featuring beautiful emerald and gold Islamic design.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)
![React](https://img.shields.io/badge/React-19.2-blue.svg)

## ✨ Features

- 📊 **Real-time Dashboard** - Track pledged amounts, collected funds, expenses, and current balance
- 💰 **Donation Management** - Track donor pledges with partial payment support
- 📝 **Expense Tracking** - Categorize and monitor all expenses
- 📈 **Visual Analytics** - Charts and graphs for financial overview
- 🔐 **Google OAuth** - Secure authentication with Google
- 💾 **Cloud Database** - Cloudflare D1 for persistent data storage
- 📱 **Progressive Web App** - Install on mobile devices
- 🌙 **Beautiful UI** - Emerald and gold themed Islamic design
- 📅 **Year-based Tracking** - Track multiple Ramadan campaigns with explicit year field
- 🔒 **Read-only History** - Current year editable, previous years read-only

## Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling (via CDN)
- **Recharts** - Data visualization
- **Lucide React** - Icon library

### Backend
- **Cloudflare Workers** - Serverless API
- **Cloudflare D1** - SQLite-based database
- **Google OAuth 2.0** - Authentication

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier works)
- Google Cloud Console account

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Create `.env.local` file:
```bash
VITE_API_URL=http://localhost:8787
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Update `.dev.vars` file:
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_SECRET=your-random-secret
```

3. **Create D1 Database:**

```bash
npm run db:create
```

Copy the database ID and update `wrangler.toml`.

4. **Run migrations:**

```bash
npm run db:migrate:local
```

5. **Start development servers:**

```bash
npm run dev:all
```

This starts:
- Frontend: http://localhost:3000
- API Worker: http://localhost:8787

## 🔐 Google OAuth Setup

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** (APIs & Services → Library)
4. Navigate to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth 2.0 Client ID**
6. Configure:
   - Application type: **Web application**
   - Name: `Ramadan Iftar Fund Tracker`
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (development)
     - `https://your-production-domain.com/auth/callback` (production)
7. Copy **Client ID** and **Client Secret**

### 2. Update Environment Variables

Add to `.env.local`:
```bash
VITE_GOOGLE_CLIENT_ID=your-client-id-here
```

Add to `.dev.vars`:
```bash
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

## 🚀 Deployment

### Deploy to Production

1. **Set production secrets:**
```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put SESSION_SECRET
```

2. **Apply database migrations:**
```bash
npm run db:migrate
```

3. **Deploy Worker API:**
```bash
npm run deploy:worker
```

4. **Build and deploy frontend:**
```bash
npm run build
npm run deploy:frontend
```

### Production URLs

After deployment you'll get:
- **Frontend**: `https://iftar-tracker.pages.dev`
- **Worker API**: `https://ramadan-iftar-fund-tracker.manoar.workers.dev`

### Update OAuth Redirect URI

**IMPORTANT**: Add your production URL to Google OAuth:
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   ```
   https://iftar-tracker.pages.dev/auth/callback
   ```
4. Save changes

### Monitor Deployment

```bash
# View worker logs
wrangler tail

# Check database data
wrangler d1 execute iftar-fund-db --command "SELECT * FROM users LIMIT 10"

# View deployment info
wrangler deployments list
```

## Project Structure

```
├── components/          # React components
│   ├── Dashboard.tsx
│   ├── DonationSection.tsx
│   ├── ExpenseSection.tsx
│   └── Layout.tsx
├── services/           # Frontend services
│   ├── authContext.tsx
│   └── dbService.ts    # API client
├── worker/            # Cloudflare Worker (API)
│   ├── src/
│   │   ├── index.ts   # Main entry point
│   │   ├── auth.ts    # Session management
│   │   ├── oauth.ts   # Google OAuth
│   │   ├── handlers.ts # API endpoints
│   │   └── types.ts
│   └── migrations/    # Database migrations
├── types.ts           # TypeScript types
├── constants.ts       # App constants
└── wrangler.toml     # Cloudflare config
```

## API Endpoints

All endpoints require Bearer token authentication (except `/api/auth/callback`):

### Authentication
- `GET /api/auth/callback?code=xxx` - OAuth callback
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/verify` - Verify session

### Donations
- `GET /api/donations?year=2026` - Get donations
- `POST /api/donations` - Create donation
- `PUT /api/donations` - Update donation
- `DELETE /api/donations` - Delete donation

### Expenses
- `GET /api/expenses?year=2026` - Get expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses` - Update expense
- `DELETE /api/expenses` - Delete expense

### Categories
- `GET /api/categories` - Get categories
- `POST /api/categories` - Create category
- `PUT /api/categories` - Update category
- `DELETE /api/categories` - Delete category

## Development Commands

```bash
npm run dev              # Start frontend dev server
npm run dev:worker       # Start worker dev server
npm run dev:all          # Start both frontend and worker
npm run build            # Build frontend
npm run build:worker     # Build worker
npm run preview          # Preview production build
npm run deploy:worker    # Deploy worker to Cloudflare
npm run deploy:frontend  # Deploy frontend to Cloudflare Pages
npm run db:create        # Create D1 database
npm run db:migrate       # Run migrations (production)
npm run db:migrate:local # Run migrations (local)
```

## 📊 Database Schema

### Users
- `id` (TEXT PRIMARY KEY) - Unique user ID from Google
- `email` (TEXT UNIQUE NOT NULL) - User email
- `name` (TEXT NOT NULL) - User full name
- `picture` (TEXT) - Profile picture URL
- `created_at` (TEXT) - Account creation timestamp

### Donations
- `id` (TEXT PRIMARY KEY) - Unique donation ID
- `user_id` (TEXT NOT NULL) - Foreign key to users
- `donor_name` (TEXT NOT NULL) - Name of donor
- `pledged_amount` (REAL NOT NULL) - Amount pledged
- `paid_amount` (REAL NOT NULL) - Amount actually paid
- `date` (TEXT NOT NULL) - Donation date
- `year` (INTEGER NOT NULL) - Ramadan campaign year (e.g., 2026)
- `notes` (TEXT) - Optional notes

### Expenses
- `id` (TEXT PRIMARY KEY) - Unique expense ID
- `user_id` (TEXT NOT NULL) - Foreign key to users
- `description` (TEXT NOT NULL) - Expense description
- `amount` (REAL NOT NULL) - Expense amount
- `category` (TEXT NOT NULL) - Expense category
- `date` (TEXT NOT NULL) - Expense date
- `year` (INTEGER NOT NULL) - Ramadan campaign year (e.g., 2026)

### Categories
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT) - Auto-increment ID
- `user_id` (TEXT NOT NULL) - User who created category (or 'default')
- `name` (TEXT NOT NULL) - Category name

### Sessions
- `id` (TEXT PRIMARY KEY) - Session token
- `user_id` (TEXT NOT NULL) - Foreign key to users
- `expires_at` (TEXT NOT NULL) - Expiration timestamp

### Database Features
- **Year Tracking**: Explicit `year` field in donations and expenses for tracking multiple Ramadan campaigns
- **Indexed Queries**: Indexed `year` fields for efficient filtering
- **User Isolation**: All records tied to `user_id` for multi-tenant support
- **Cascading Deletes**: Foreign keys maintain referential integrity

## 🐛 Troubleshooting

### OAuth "Network error" or login fails

**Issue**: Service worker intercepting API calls or CORS errors

**Solutions**:
1. Clear service worker cache:
   - Chrome/Edge: F12 → Application → Service Workers → Unregister
   - Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. Verify `FRONTEND_URL` in `.dev.vars` matches your frontend URL
3. Check redirect URI in Google Cloud Console matches exactly
4. Ensure both servers are running: `npm run dev:all`

### Database connection issues

**Issue**: "Failed to query database" or empty data

**Solutions**:
```bash
# Verify database exists
wrangler d1 list

# Run migrations
npm run db:migrate:local

# Check database ID in wrangler.toml matches
wrangler d1 info iftar-fund-db
```

### CORS errors in production

**Issue**: "Access-Control-Allow-Origin" errors

**Solutions**:
1. Update `FRONTEND_URL` in `wrangler.toml`
2. Redeploy worker: `npm run deploy:worker`
3. Clear browser cache

### Worker deployment fails

**Issue**: Build or deployment errors

**Solutions**:
```bash
# Build locally first to check for errors
npm run build:worker

# Check wrangler authentication
wrangler whoami

# Deploy with verbose logging
npx wrangler deploy --config wrangler.toml --verbose
```

### PWA not installing

**Issue**: "Add to Home Screen" option not appearing

**Solutions**:
1. Must use HTTPS (works on localhost or production)
2. Ensure `manifest.json` is accessible
3. Check service worker is registered: F12 → Application → Service Workers
4. Verify `sw.js` has no errors in console

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.

## 💰 Cost & Performance

### Cloudflare Free Tier Limits
- **Workers**: 100,000 requests/day (1ms CPU time/invocation)
- **D1 Database**: 5GB storage, 5 million reads/day, 100,000 writes/day
- **Pages**: Unlimited requests, 500 builds/month

**This app runs entirely on free tier for most use cases.**

### Performance
- **Worker Response Time**: ~50-200ms (depends on query complexity)
- **Cold Start**: ~100ms (first request after idle)
- **Database Queries**: <10ms (SQLite is fast!)

## 📝 Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React + Vite)                │
│  https://iftar-tracker.pages.dev        │
└────────────┬────────────────────────────┘
             │ HTTPS + Bearer Token
             ↓
┌─────────────────────────────────────────┐
│  Cloudflare Workers (API)                │
│  https://ramadan-iftar-fund-tracker...  │
│  - OAuth: /api/auth/*                   │
│  - CRUD: /api/donations                 │
│           /api/expenses                  │
│           /api/categories                │
└────────────┬────────────────────────────┘
             │ SQL Queries
             ↓
┌─────────────────────────────────────────┐
│  Cloudflare D1 (SQLite)                 │
│  - users, donations, expenses           │
│  - categories, sessions                  │
└─────────────────────────────────────────┘
```

### Data Flow
1. User logs in → Google OAuth → Session token stored in localStorage
2. Frontend makes API calls with Bearer token
3. Worker verifies session → Queries D1 database
4. Results cached briefly in browser
5. Service worker provides offline support

## 🎉 Success Checklist

- ✅ D1 database created and migrated
- ✅ Google OAuth credentials configured
- ✅ Environment variables set (`.env.local` and `.dev.vars`)
- ✅ Local development servers running
- ✅ Login working with Google account
- ✅ Production deployed to Cloudflare
- ✅ Production redirect URI added to Google OAuth
- ✅ PWA installable on mobile devices

## Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- Charts by [Recharts](https://recharts.org/)
- Hosted on [Cloudflare](https://cloudflare.com/)
