import { Env } from './types';
import { verifySession, corsHeaders, jsonResponse } from './auth';
import { handleDonations, handleExpenses, handleCategories, handleUserPreferences } from './handlers';
import { handleGoogleCallback, handleLogout, handleVerifySession } from './oauth';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || env.FRONTEND_URL;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin),
      });
    }

    const headers = corsHeaders(origin);

    try {
      // Only handle API routes - return 404 for everything else
      if (!url.pathname.startsWith('/api/')) {
        return jsonResponse({ error: 'Not found' }, 404, headers);
      }

      // Public routes (no authentication required)
      if (url.pathname === '/api/auth/callback') {
        const response = await handleGoogleCallback(request, env);
        return new Response(response.body, {
          status: response.status,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Protected routes (authentication required)
      const user = await verifySession(request, env);

      if (!user) {
        return jsonResponse({ error: 'Unauthorized' }, 401, headers);
      }

      // Auth routes
      if (url.pathname === '/api/auth/logout') {
        const response = await handleLogout(request, env);
        return new Response(response.body, {
          status: response.status,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/api/auth/verify') {
        const response = await handleVerifySession(request, env);
        return new Response(response.body, {
          status: response.status,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Data routes
      if (url.pathname === '/api/donations') {
        const response = await handleDonations(request, env, user);
        return new Response(response.body, {
          status: response.status,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/api/expenses') {
        const response = await handleExpenses(request, env, user);
        return new Response(response.body, {
          status: response.status,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/api/categories') {
        const response = await handleCategories(request, env, user);
        return new Response(response.body, {
          status: response.status,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/api/user/preferences') {
        const response = await handleUserPreferences(request, env, user);
        return new Response(response.body, {
          status: response.status,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      return jsonResponse({ error: 'Not found' }, 404, headers);
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: 'Internal server error' }, 500, headers);
    }
  },
};
