import { Hono } from 'hono';
import { resolveUser } from './auth';

type Env = {
  DB: D1Database;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  DEV_USER_EMAIL?: string;
};

const RECORD_COLUMNS = [
  'month_str',
  'salary_income',
  'side_hustle_income',
  'child_allowance_income',
  'nursery_expense',
  'credit_card_expense',
  'pocket_money_expense',
  'investment_trust',
  'total_cash_snapshot',
  'total_investment_snapshot',
  'note',
  'calculated_cash_flow',
  'total_assets',
] as const;

const SETTING_KEYS = new Set(['profile', 'lifeplan', 'config']);
const SHARED_SCOPES = new Set(['public', 'financial']);
const MONTH_ID = /^\d{4}-\d{2}$/;

const app = new Hono<{ Bindings: Env }>().basePath('/api');

// すべての API は Access を通ったリクエストだけに応える
app.use('*', async (c, next) => {
  const email = await resolveUser(c.req.raw, c.env);
  if (!email) return c.json({ error: 'unauthorized' }, 401);
  await next();
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal error' }, 500);
});

const readJson = async (req: Request): Promise<Record<string, unknown> | null> => {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

// ---- 月次記録 ----

app.get('/records', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM monthly_records ORDER BY id').all();
  return c.json(results);
});

app.put('/records/:id', async (c) => {
  const id = c.req.param('id');
  if (!MONTH_ID.test(id)) return c.json({ error: 'id must be YYYY-MM' }, 400);
  const body = await readJson(c.req.raw);
  if (!body) return c.json({ error: 'invalid JSON' }, 400);

  const values = RECORD_COLUMNS.map((col) => {
    const v = body[col];
    if (col === 'month_str') return typeof v === 'string' ? v : id;
    if (col === 'note') return typeof v === 'string' ? v : '';
    if (v === null || v === undefined) return null;
    return typeof v === 'number' && Number.isFinite(v) ? v : Number.NaN;
  });
  if (values.some((v) => typeof v === 'number' && Number.isNaN(v))) {
    return c.json({ error: 'amounts must be numbers' }, 400);
  }
  // 必須の金額列は未入力なら 0
  const filled = values.map((v, i) => {
    const col = RECORD_COLUMNS[i];
    const nullable = col.startsWith('total_') || col === 'calculated_cash_flow';
    return v === null && !nullable ? 0 : v;
  });

  const now = new Date().toISOString();
  const row = await c.env.DB.prepare(
    `INSERT INTO monthly_records (id, ${RECORD_COLUMNS.join(', ')}, updated_at)
     VALUES (?, ${RECORD_COLUMNS.map(() => '?').join(', ')}, ?)
     ON CONFLICT(id) DO UPDATE SET ${RECORD_COLUMNS.map((col) => `${col} = excluded.${col}`).join(', ')}, updated_at = excluded.updated_at
     RETURNING *`,
  )
    .bind(id, ...filled, now)
    .first();
  return c.json(row);
});

app.delete('/records/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM monthly_records WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ---- 設定（profile / lifeplan / config）----

app.get('/settings', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT key, value FROM app_settings').all<{ key: string; value: string }>();
  const out: Record<string, unknown> = {};
  for (const r of results) out[r.key] = JSON.parse(r.value);
  return c.json(out);
});

app.put('/settings/:key', async (c) => {
  const key = c.req.param('key');
  if (!SETTING_KEYS.has(key)) return c.json({ error: 'unknown key' }, 400);
  const body = await readJson(c.req.raw);
  if (!body || !('value' in body)) return c.json({ error: 'value is required' }, 400);
  await c.env.DB.prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  )
    .bind(key, JSON.stringify(body.value), new Date().toISOString())
    .run();
  return c.json({ ok: true });
});

// ---- 共有プロフィール（他エージェント向けの要約）----

app.put('/shared-profile', async (c) => {
  const body = await readJson(c.req.raw);
  if (!body) return c.json({ error: 'invalid JSON' }, 400);
  const now = new Date().toISOString();
  const stmts = Object.entries(body)
    .filter(([scope]) => SHARED_SCOPES.has(scope))
    .map(([scope, data]) =>
      c.env.DB.prepare(
        `INSERT INTO shared_profile (scope, data, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(scope) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      ).bind(scope, JSON.stringify(data), now),
    );
  if (stmts.length === 0) return c.json({ error: 'no known scope' }, 400);
  await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

app.get('/shared-profile', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT scope, data, updated_at FROM shared_profile').all<{
    scope: string;
    data: string;
    updated_at: string;
  }>();
  return c.json(results.map((r) => ({ ...r, data: JSON.parse(r.data) })));
});

app.all('*', (c) => c.json({ error: 'not found' }, 404));

export default app;
