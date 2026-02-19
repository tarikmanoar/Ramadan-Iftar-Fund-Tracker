import { Env, User } from './types';
import { verifySession, jsonResponse } from './auth';

export async function handleDonations(request: Request, env: Env, user: User): Promise<Response> {
  const url = new URL(request.url);
  const year = url.searchParams.get('year');

  if (request.method === 'GET') {
    let query = 'SELECT * FROM donations WHERE user_id = ?';
    const params: any[] = [user.id];

    if (year) {
      query += ' AND year = ?';
      params.push(year);
    }

    query += ' ORDER BY date DESC';

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse(results);
  }

  if (request.method === 'POST') {
    const body = await request.json<any>();
    const id = crypto.randomUUID();

    await env.DB.prepare(
      'INSERT INTO donations (id, user_id, donor_name, pledged_amount, paid_amount, date, year, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      user.id,
      body.donorName,
      body.pledgedAmount,
      body.paidAmount || 0,
      body.date,
      body.year,
      body.notes || null
    ).run();

    return jsonResponse({ id, ...body }, 201);
  }

  if (request.method === 'PUT') {
    const body = await request.json<any>();

    await env.DB.prepare(
      'UPDATE donations SET donor_name = ?, pledged_amount = ?, paid_amount = ?, date = ?, year = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
    ).bind(
      body.donorName,
      body.pledgedAmount,
      body.paidAmount,
      body.date,
      body.year,
      body.notes || null,
      body.id,
      user.id
    ).run();

    return jsonResponse(body);
  }

  if (request.method === 'DELETE') {
    const body = await request.json<any>();

    await env.DB.prepare(
      'DELETE FROM donations WHERE id = ? AND user_id = ?'
    ).bind(body.id, user.id).run();

    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

export async function handleExpenses(request: Request, env: Env, user: User): Promise<Response> {
  const url = new URL(request.url);
  const year = url.searchParams.get('year');

  if (request.method === 'GET') {
    let query = 'SELECT * FROM expenses WHERE user_id = ?';
    const params: any[] = [user.id];

    if (year) {
      query += ' AND year = ?';
      params.push(year);
    }

    query += ' ORDER BY date DESC';

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse(results);
  }

  if (request.method === 'POST') {
    const body = await request.json<any>();
    const id = crypto.randomUUID();

    await env.DB.prepare(
      'INSERT INTO expenses (id, user_id, description, amount, category, date, year, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      user.id,
      body.description,
      body.amount,
      body.category,
      body.date,
      body.year,
      body.quantity ?? null,
      body.unit ?? null
    ).run();

    return jsonResponse({ id, ...body }, 201);
  }

  if (request.method === 'PUT') {
    const body = await request.json<any>();

    await env.DB.prepare(
      'UPDATE expenses SET description = ?, amount = ?, category = ?, date = ?, year = ?, quantity = ?, unit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
    ).bind(
      body.description,
      body.amount,
      body.category,
      body.date,
      body.year,
      body.quantity ?? null,
      body.unit ?? null,
      body.id,
      user.id
    ).run();

    return jsonResponse(body);
  }

  if (request.method === 'DELETE') {
    const body = await request.json<any>();

    await env.DB.prepare(
      'DELETE FROM expenses WHERE id = ? AND user_id = ?'
    ).bind(body.id, user.id).run();

    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

export async function handleCategories(request: Request, env: Env, user: User): Promise<Response> {
  if (request.method === 'GET') {
    // Get user-specific categories and default categories
    const { results } = await env.DB.prepare(
      'SELECT name FROM categories WHERE user_id = ? OR user_id = "default" ORDER BY name'
    ).bind(user.id).all();

    const categories = results.map((r: any) => r.name);
    return jsonResponse(categories);
  }

  if (request.method === 'POST') {
    const body = await request.json<any>();

    try {
      await env.DB.prepare(
        'INSERT INTO categories (user_id, name) VALUES (?, ?)'
      ).bind(user.id, body.category).run();

      const { results } = await env.DB.prepare(
        'SELECT name FROM categories WHERE user_id = ? OR user_id = "default" ORDER BY name'
      ).bind(user.id).all();

      return jsonResponse(results.map((r: any) => r.name));
    } catch (e) {
      // Category already exists
      return jsonResponse({ error: 'Category already exists' }, 400);
    }
  }

  if (request.method === 'PUT') {
    const body = await request.json<any>();

    // Update category name
    await env.DB.prepare(
      'UPDATE categories SET name = ? WHERE user_id = ? AND name = ?'
    ).bind(body.newName, user.id, body.oldName).run();

    // Update all expenses with old category name
    await env.DB.prepare(
      'UPDATE expenses SET category = ? WHERE user_id = ? AND category = ?'
    ).bind(body.newName, user.id, body.oldName).run();

    const { results } = await env.DB.prepare(
      'SELECT name FROM categories WHERE user_id = ? OR user_id = "default" ORDER BY name'
    ).bind(user.id).all();

    return jsonResponse(results.map((r: any) => r.name));
  }

  if (request.method === 'DELETE') {
    const body = await request.json<any>();

    await env.DB.prepare(
      'DELETE FROM categories WHERE user_id = ? AND name = ?'
    ).bind(user.id, body.category).run();

    const { results } = await env.DB.prepare(
      'SELECT name FROM categories WHERE user_id = ? OR user_id = "default" ORDER BY name'
    ).bind(user.id).all();

    return jsonResponse(results.map((r: any) => r.name));
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

export async function handleUserPreferences(request: Request, env: Env, user: User): Promise<Response> {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT available_years FROM users WHERE id = ?'
    ).bind(user.id).all();

    if (results.length === 0) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    const storedYears = (results[0] as any).available_years as string | null;
    let availableYears;

    if (storedYears) {
      try {
        const parsed = JSON.parse(storedYears);
        // Normalize old number[] format to RamadanYear[]
        availableYears = parsed.map((y: any) =>
          typeof y === 'number' ? { year: y, startDate: '' } : y
        );
      } catch (e) {
        // Invalid JSON, return defaults
        const currentYear = new Date().getFullYear();
        availableYears = [
          { year: currentYear - 2, startDate: '' },
          { year: currentYear - 1, startDate: '' },
          { year: currentYear, startDate: '' },
          { year: currentYear + 1, startDate: '' },
        ];
      }
    } else {
      // No years stored, return defaults
      const currentYear = new Date().getFullYear();
      availableYears = [
        { year: currentYear - 2, startDate: '' },
        { year: currentYear - 1, startDate: '' },
        { year: currentYear, startDate: '' },
        { year: currentYear + 1, startDate: '' },
      ];
    }

    return jsonResponse({ availableYears });
  }

  if (request.method === 'PUT') {
    const body = await request.json<any>();
    
    if (!Array.isArray(body.availableYears)) {
      return jsonResponse({ error: 'availableYears must be an array' }, 400);
    }

    // Validate years are RamadanYear objects { year: number, startDate: string }
    const validYears = body.availableYears.every((y: any) =>
      typeof y === 'object' &&
      typeof y.year === 'number' && y.year >= 2020 && y.year <= 2050 &&
      typeof y.startDate === 'string'
    );
    if (!validYears) {
      return jsonResponse({ error: 'Each year must be an object with year (2020-2050) and startDate fields' }, 400);
    }

    const yearsJson = JSON.stringify(body.availableYears);

    await env.DB.prepare(
      'UPDATE users SET available_years = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(yearsJson, user.id).run();

    return jsonResponse({ availableYears: body.availableYears });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
