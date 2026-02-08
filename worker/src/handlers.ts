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
      'INSERT INTO expenses (id, user_id, description, amount, category, date, year) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      user.id,
      body.description,
      body.amount,
      body.category,
      body.date,
      body.year
    ).run();

    return jsonResponse({ id, ...body }, 201);
  }

  if (request.method === 'PUT') {
    const body = await request.json<any>();

    await env.DB.prepare(
      'UPDATE expenses SET description = ?, amount = ?, category = ?, date = ?, year = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
    ).bind(
      body.description,
      body.amount,
      body.category,
      body.date,
      body.year,
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
