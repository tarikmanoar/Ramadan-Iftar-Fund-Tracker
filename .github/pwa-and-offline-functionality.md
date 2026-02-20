# PWA & Offline Functionality

## Overview

The app is a **Progressive Web App (PWA)** that works fully offline for navigation and data viewing, and partially offline for data entry. It uses a **network-first** caching strategy with an **IndexedDB offline queue** for add operations, and a **localStorage data cache** so existing data is always shown even without a network connection.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│                                                              │
│  ┌─────────────────────┐   ┌──────────────────────────────┐ │
│  │  React App (UI)      │   │  localStorage (data cache)   │ │
│  │  App.tsx             │   │  iftar_cache_{uid}_{yr}_*    │ │
│  │  ↕ state             │   │  iftar_cache_{uid}_years     │ │
│  │  dbService.ts        │   └──────────────────────────────┘ │
│  │  (API client)        │                                    │
│  └────────┬────────────┘   ┌──────────────────────────────┐ │
│           │                │  IndexedDB (offline queue)    │ │
│           │                │  iftar-offline-queue          │ │
│           │                │  offlineQueue.ts              │ │
│           │                └──────────────────────────────┘ │
│  ┌────────▼────────────────────────────────────────────────┐ │
│  │  Service Worker (public/sw.js)                           │ │
│  │  • caches JS/CSS/HTML assets (network-first)             │ │
│  │  • passes API calls straight through                     │ │
│  └────────┬────────────────────────────────────────────────┘ │
└───────────│─────────────────────────────────────────────────┘
            │ (network not always available)
     ┌──────▼──────┐
     │  Cloudflare │
     │  Worker API │
     └─────────────┘
```

---

## 1. Service Worker (`public/sw.js`)

### Installation & Cache Versioning

```javascript
const CACHE_VERSION = 'iftar-fund-v4';
const SHELL_URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL_URLS))
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});
```

- **`CACHE_VERSION`** — increment this string (e.g. `v5`) whenever you deploy UI changes. Changing it causes the new SW to activate and all old cached assets to be purged on the next visit.
- **`skipWaiting()`** — the new service worker takes control immediately instead of waiting for the user to close all tabs.

### Activation & Cache Purge

```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),   // take control of open tabs instantly
      caches.keys().then(keys =>
        Promise.all(keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))  // remove all old cache versions
        )
      ),
    ])
  );
});
```

- **`clients.claim()`** — makes the new SW control all currently open pages without a reload, so the user gets the update on current visit.

### Fetch Strategy: Network-First

```javascript
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Cross-origin (Google Fonts, API server, etc.) — pass through untouched
  if (url.origin !== self.location.origin) return;

  // 2. API calls — never cache, always network
  if (url.pathname.startsWith('/api/')) return;

  // 3. Non-GET requests — pass through untouched
  if (event.request.method !== 'GET') return;

  // 4. Same-origin GET: try network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Cache the fresh response for future offline use
        if (networkResponse.ok && networkResponse.type === 'basic') {
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          // SPA navigation fallback: serve index.html so React Router handles it
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        })
      )
  );
});
```

**What gets cached:** All same-origin GET responses — `index.html`, the JS bundle, CSS, icons, `manifest.json`. The browser's built-in aggressive caching is bypassed in favour of SW cache which you control explicitly via `CACHE_VERSION`.

**What never gets cached:** API calls (`/api/*`), cross-origin requests. These always go to the network.

**SPA navigation fallback:** If the user navigates to `/donations` while offline and that URL isn't in cache, the SW serves `index.html` instead. React then mounts and renders the donations page from in-memory state (populated from localStorage cache).

---

## 2. localStorage Data Cache (`App.tsx`)

The service worker only caches static assets (JS/CSS). The **API response data** (donations, expenses, years) is cached separately in localStorage by the React app itself.

### Cache Keys

```
iftar_cache_{userId}_{year}_donations   → Donation[]  (JSON)
iftar_cache_{userId}_{year}_expenses    → Expense[]   (JSON)
iftar_cache_{uid}_years                 → RamadanYear[] (JSON)
```

Keys are scoped by `userId` and `year` so users with multiple accounts or switching between Ramadan years always see the correct data.

### refreshData — Three-Step Pattern

Every time data is loaded (`App.tsx: refreshData`), this sequence runs:

```typescript
const refreshData = useCallback(async () => {
  if (!user) return;

  // ── Step 1: Seed from cache immediately ──────────────────────────────────
  // The UI shows real data within milliseconds, even before any network call.
  const cachedDonations = JSON.parse(
    localStorage.getItem(`iftar_cache_${user.id}_${selectedYear}_donations`) ?? 'null'
  );
  const cachedExpenses = JSON.parse(
    localStorage.getItem(`iftar_cache_${user.id}_${selectedYear}_expenses`) ?? 'null'
  );
  if (cachedDonations) setDonations(cachedDonations);
  if (cachedExpenses)  setExpenses(cachedExpenses);

  // ── Step 2: If offline, stop here ────────────────────────────────────────
  // Cached data is already displayed. No network error thrown.
  if (!navigator.onLine) return;

  // ── Step 3: Fetch fresh data from server ─────────────────────────────────
  const [fetchedDonations, fetchedExpenses] = await Promise.all([
    dbService.getDonations(user.id, selectedYear),
    dbService.getExpenses(user.id, selectedYear)
  ]);
  setDonations(fetchedDonations);
  setExpenses(fetchedExpenses);

  // Update the cache so offline users see this fresh data next visit
  localStorage.setItem(`iftar_cache_${user.id}_${selectedYear}_donations`, JSON.stringify(fetchedDonations));
  localStorage.setItem(`iftar_cache_${user.id}_${selectedYear}_expenses`,  JSON.stringify(fetchedExpenses));
}, [user, selectedYear]);
```

### Timeline: First Load While Offline

```
t=0ms   App boots, AuthProvider reads localStorage → user found, setUser()
t=5ms   refreshData() called
t=6ms   localStorage cache read → donations + expenses set → UI renders full data
t=7ms   navigator.onLine === false → return early (no network call)
t=7ms   User sees their full data with $0 differences (no flicker, no empty state)
```

### Timeline: First Load While Online

```
t=0ms   App boots, user restored from localStorage
t=5ms   refreshData() called
t=6ms   Cache seeds state → UI renders cached data (instant, no spinner)
t=7ms   navigator.onLine === true → network fetch begins
t=300ms API returns fresh data → state updated with latest records
t=300ms localStorage cache overwritten with fresh data
```

The cache-first seed means users never see an empty spinner — they see yesterday's data instantly, then the fresh data replaces it within milliseconds.

---

## 3. IndexedDB Offline Queue (`services/offlineQueue.ts`)

For **add operations** made while offline, data is stored in IndexedDB and replayed when the device reconnects.

### Why IndexedDB (not localStorage)?

- localStorage is synchronous and limited to ~5MB. IndexedDB is async and has no practical size limit for this use case.
- Queued items need a structured key-value store for individual item removal after sync.

### Queue Data Structure

```typescript
interface QueuedAction {
  id: string;           // same UUID as the record's client-side id
  type: 'ADD_DONATION' | 'ADD_EXPENSE';
  payload: any;         // the full Donation or Expense object
  timestamp: number;    // used to replay in chronological order
}
```

Database: `iftar-offline-queue` (IndexedDB)
Object store: `actions` (keyPath: `id`)

### Queue Operations

```typescript
offlineQueue.enqueue(type, payload)  // add item
offlineQueue.getAll()                // get all, sorted by timestamp
offlineQueue.remove(id)              // remove after successful sync
offlineQueue.count()                 // how many items pending
```

---

## 4. Offline Detection & Sync (`App.tsx`)

### Online/Offline State

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);
const [pendingCount, setPendingCount] = useState(0);
```

On mount, the initial pending count is loaded from IndexedDB:

```typescript
useEffect(() => {
  offlineQueue.count().then(setPendingCount);

  const handleOnline = async () => {
    setIsOnline(true);
    await processOfflineQueue();  // ← sync queued items immediately on reconnect
  };
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, [processOfflineQueue]);
```

### processOfflineQueue

Called automatically when `window` fires the `online` event:

```typescript
const processOfflineQueue = useCallback(async () => {
  if (!user) return;
  const queue = await offlineQueue.getAll();   // sorted by timestamp

  for (const action of queue) {
    try {
      if (action.type === 'ADD_DONATION') {
        await dbService.addDonation(action.payload as Donation);
      } else if (action.type === 'ADD_EXPENSE') {
        await dbService.addExpense(action.payload as Expense);
      }
      await offlineQueue.remove(action.id);    // only removed on success
    } catch (err) {
      console.error('Sync failed for', action.id, err);
      // Item stays in queue; retried on next reconnect
    }
  }

  const remaining = await offlineQueue.count();
  setPendingCount(remaining);
  await refreshData();   // always refresh from server after reconnect, with or without a queue
}, [user, refreshData]);
```

The final `refreshData()` call ensures the UI reflects what the server actually stored — it replaces any optimistic local state with authoritative server data.

---

## 5. Write Operations: What Works Offline

| Operation | Offline behaviour |
|---|---|
| **Add donation** | Queued in IndexedDB, appears in UI immediately with a temp UUID |
| **Add expense** | Queued in IndexedDB, appears in UI immediately with a temp UUID |
| **Edit donation** | Blocked — shows amber toast: *"You are offline. Edits and deletions are not available…"* |
| **Edit expense** | Blocked — shows amber toast |
| **Delete donation** | Blocked — shows amber toast |
| **Delete expense** | Blocked — shows amber toast |

This is the **Option B safety model**: only additive operations are allowed offline because they cannot conflict with server state. Mutations require the current server record and are therefore blocked.

### Add Path (offline)

```typescript
// dbService.ts
addDonation: async (donation: Donation) => {
  if (!navigator.onLine) {
    await offlineQueue.enqueue('ADD_DONATION', donation);
    return { ...donation, _queued: true };   // ← _queued flag
  }
  // ... normal API call
}
```

```typescript
// App.tsx handler
const result = await dbService.addDonation(newDonation);
setDonations(prev => [...prev, newDonation]);   // optimistic UI update
if ((result as any)._queued) {
  setPendingCount(await offlineQueue.count());   // bump badge in header
}
```

### Mutation Path (offline)

```typescript
// dbService.ts
updateDonation: async (donation: Donation) => {
  if (!navigator.onLine) throw new OfflineError();
  // ...
}
```

```typescript
// App.tsx handler
try {
  await dbService.updateDonation(updatedDonation);
  setDonations(prev => prev.map(...));
} catch (err) {
  if (err instanceof OfflineError) {
    setOfflineToast(err.message);   // shows amber toast for 4 seconds
  } else {
    throw err;
  }
}
```

---

## 6. UI Feedback Components (`components/Layout.tsx`)

### Offline Banner

Shown persistently at the top of every page when `!isOnline`:

```tsx
{!isOnline && (
  <div className="bg-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-2xl
                  flex items-center justify-between shadow-lg">
    <div className="flex items-center gap-2">
      <WifiOff size={14} />
      <span>You're offline — new entries will sync when reconnected</span>
    </div>
    {pendingCount > 0 && (
      <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs font-bold">
        {pendingCount} pending
      </span>
    )}
  </div>
)}
```

### Offline Action Toast

Shown for 4 seconds when the user attempts an edit/delete while offline (`App.tsx`):

```tsx
{offlineToast && (
  <div className="fixed top-4 left-4 right-4 z-[70] bg-amber-500 text-white
                  text-sm font-semibold px-4 py-3 rounded-2xl shadow-2xl
                  flex items-center gap-2">
    <WifiOff size={16} />
    <span>{offlineToast}</span>
  </div>
)}
```

---

## 7. PWA Manifest (`public/manifest.json`)

Enables "Add to Home Screen" on mobile:

```json
{
  "name": "Ramadan Iftar Fund Tracker",
  "short_name": "Iftar Fund",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f0fdf4",
  "theme_color": "#047857",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

`display: standalone` hides the browser address bar when launched from the home screen, making it feel like a native app.

### Service Worker Registration (`index.html`)

```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
</script>
```

The SW is registered at the root scope (`/`) so it controls all pages in the app.

---

## 8. Deploying UI Updates

When you change the UI (new CSS, JS changes), users with the app cached will see stale content until the SW updates. To force an immediate update:

1. **Increment `CACHE_VERSION`** in `public/sw.js`:
   ```javascript
   const CACHE_VERSION = 'iftar-fund-v5';  // was v4
   ```
2. **Build and deploy**:
   ```bash
   npm run build && npm run deploy:frontend
   ```

On next load, the browser detects a changed SW file, installs the new version, `skipWaiting()` activates it immediately, `clients.claim()` takes control of open tabs, old cache is purged, and users see the new UI — all without needing to manually clear their browser cache.

---

## Quick Reference: What's Stored Where

| Data | Storage | Key pattern | When written | When read |
|---|---|---|---|---|
| Session token | localStorage | `iftar_session_token` | After OAuth login | Every API call |
| User profile | localStorage | `iftar_user_session` | After OAuth login | On app boot |
| Donations cache | localStorage | `iftar_cache_{uid}_{yr}_donations` | After every fetch | On app boot / tab switch |
| Expenses cache | localStorage | `iftar_cache_{uid}_{yr}_expenses` | After every fetch | On app boot / tab switch |
| Available years | localStorage | `iftar_cache_{uid}_years` | After years loaded | While offline |
| Offline add queue | IndexedDB | `iftar-offline-queue` / `actions` | While offline | On reconnect |
| App shell (HTML/JS/CSS) | SW Cache | `iftar-fund-v4` | On SW install + network requests | While offline |
