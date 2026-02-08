# Ramadan Iftar Fund Tracker - AI Agent Instructions

## Project Overview
A Progressive Web App for tracking Ramadan Iftar donations and expenses. Built as a demo SPA with localStorage persistence simulating a backend database, designed for potential Cloudflare D1 backend integration.

## Architecture & Data Flow

### State Management
- **Global state lives in [App.tsx](../App.tsx)**: `donations`, `expenses`, `selectedYear`, and `user` are managed here
- Data flows down to child components ([Dashboard.tsx](../components/Dashboard.tsx), [DonationSection.tsx](../components/DonationSection.tsx), [ExpenseSection.tsx](../components/ExpenseSection.tsx))
- All CRUD handlers are defined in App.tsx and passed as props to child components

### Data Persistence Layer
**CRITICAL**: [services/dbService.ts](../services/dbService.ts) is an abstraction layer:
- Currently uses localStorage with simulated 200-300ms async delays
- Designed to be swapped with Cloudflare Worker API calls for production
- All methods are async and filter data by `userId` and `year`
- When extending functionality, always add methods here rather than calling localStorage directly

### Authentication
[services/authContext.tsx](../services/authContext.tsx) uses a mock Google OAuth flow:
- Uses `MOCK_USER` from [constants.ts](../constants.ts) for immediate development
- Session stored in localStorage key `iftar_user_session`
- To integrate real Google OAuth: replace login() logic and set valid `GOOGLE_CLIENT_ID` in constants.ts

### Year-Based Filtering & Read-Only Mode
**Pattern**: Current year is editable, previous years are read-only
- `isReadOnly = selectedYear !== currentYear` (see [App.tsx](../App.tsx) line 22)
- All mutation handlers check `isReadOnly` before executing
- When adding new features with data modification, always respect this flag

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
npm run dev          # Starts Vite dev server on port 3000 (0.0.0.0)
npm run build        # Production build
npm run preview      # Preview production build
```

### Key Files to Modify
- **Add new entity types**: Update [types.ts](../types.ts), then extend [dbService.ts](../services/dbService.ts)
- **New UI sections**: Create component in `components/`, add tab to [App.tsx](../App.tsx) navigation
- **Styling changes**: Modify Tailwind config in [index.html](../index.html) (lines 20-47)
- **App metadata**: Update [manifest.json](../manifest.json) and [metadata.json](../metadata.json)

### PWA & Offline Support
[sw.js](../sw.js) implements:
- App shell caching for static assets
- Network-first strategy for API/data calls
- Manual service worker registration in [index.html](../index.html)

## Common Code Patterns

### Adding a New Data Type
1. Define interface in [types.ts](../types.ts) with `id`, `userId`, and domain fields
2. Add localStorage key constant in [dbService.ts](../services/dbService.ts)
3. Implement CRUD operations in dbService following existing async/timeout pattern
4. Add state and handlers in [App.tsx](../App.tsx) matching donations/expenses pattern
5. Create UI component in `components/` folder

### Computed Values
Use `useMemo` for derived state (see [App.tsx](../App.tsx) lines 54-63):
```tsx
const summary = useMemo(() => {
  // expensive calculations from donations/expenses
}, [donations, expenses]);
```

### Category Management
[dbService.ts](../services/dbService.ts) includes special category operations:
- `updateCategory()` cascades changes to all related expenses
- `deleteCategory()` only removes from list, doesn't delete expenses
- Default categories defined in [constants.ts](../constants.ts)

### UUID Generation
Use native `crypto.randomUUID()` for IDs (see App.tsx line 78):
```tsx
id: crypto.randomUUID()
```

## Data Validation & Business Rules

- **Partial Payments**: Donations have `pledgedAmount` vs `paidAmount` - always allow paidAmount ≤ pledgedAmount
- **Year Filtering**: Database queries filter by `new Date(item.date).getFullYear()` 
- **User Scoping**: All queries filter by `userId` to isolate user data
- **Currency Formatting**: Use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` consistently

## Testing & Debugging
- No test suite currently exists
- Use browser DevTools localStorage inspection for debugging data
- Service Worker debugging: Chrome DevTools → Application → Service Workers

## Future Backend Integration
When migrating to Cloudflare Workers + D1:
1. Replace dbService methods with `fetch()` calls to Worker endpoints
2. Keep method signatures identical for drop-in replacement
3. Implement proper error handling for network failures
4. Consider moving simulated delays (setTimeout) to Worker responses for consistency
