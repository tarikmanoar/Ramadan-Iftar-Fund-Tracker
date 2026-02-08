import { Env } from './types';
import { createSession, jsonResponse } from './auth';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export async function handleGoogleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return jsonResponse({ error: 'No authorization code provided' }, 400);
  }

  try {
    // Exchange code for access token
    const redirectUri = `${env.FRONTEND_URL}/auth/callback`;
    console.log('OAuth token exchange:', {
      redirect_uri: redirectUri,
      client_id: env.GOOGLE_CLIENT_ID.substring(0, 20) + '...',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Google token exchange failed:', {
        status: tokenResponse.status,
        error: errorData,
      });
      throw new Error(`Failed to exchange code for token: ${JSON.stringify(errorData)}`);
    }

    const tokenData: GoogleTokenResponse = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userInfo: GoogleUserInfo = await userInfoResponse.json();

    // Check if user exists in database
    let user = await env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(userInfo.email).first();

    if (!user) {
      // Create new user
      const userId = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)'
      ).bind(userId, userInfo.email, userInfo.name, userInfo.picture).run();

      user = {
        id: userId,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      };
    }

    // Create session
    const sessionId = await createSession(user.id as string, env);

    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      sessionId,
    });
  } catch (error) {
    console.error('OAuth error:', error);
    return jsonResponse({ error: 'Authentication failed' }, 500);
  }
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ success: true });
  }

  const sessionId = authHeader.substring(7);

  await env.DB.prepare(
    'DELETE FROM sessions WHERE id = ?'
  ).bind(sessionId).run();

  return jsonResponse({ success: true });
}

export async function handleVerifySession(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'No session provided' }, 401);
  }

  const sessionId = authHeader.substring(7);

  const session = await env.DB.prepare(
    'SELECT s.*, u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime("now")'
  ).bind(sessionId).first();

  if (!session) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401);
  }

  return jsonResponse({
    user: {
      id: session.user_id,
      email: session.email,
      name: session.name,
      picture: session.picture,
    },
  });
}
