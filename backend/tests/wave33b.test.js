process.env.JWT_SECRET = 'wave33b-test-secret-with-at-least-32-chars!!';
process.env.OPENROUTER_API_KEY = '';
process.env.OPENAI_API_KEY = '';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import auth from '../middleware/auth.js';
import * as wave from '../routes/wave33b.js';

function sign(payload) {
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

const records = [
  { id: 1, title: 'Flying over water', mood: 'calm', category: 'adventure', is_lucid: false, sleep_quality: 0, tags: ['water', 'flying'], note: '' },
  { id: 2, title: 'Chased in a city', mood: 'anxious', category: 'nightmare', is_lucid: true, sleep_quality: 4, tags: ['city'], note: 'check' },
];

const app = wave.createApp({ authenticate: auth, fetchRecords: async () => records });
let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const asUser = (id) => ({ Authorization: `Bearer ${sign({ id, email: `u${id}@example.com` })}`, 'Content-Type': 'application/json' });

test('tasks require authentication', async () => {
  const res = await fetch(`${base}/api/tasks`);
  assert.equal(res.status, 401);
});

test('tasks create, list, update preserve empty and false values and stay user-scoped', async () => {
  const created = await fetch(`${base}/api/tasks`, { method: 'POST', headers: asUser(1), body: JSON.stringify({ title: 'Log morning dream', notes: '', flagged: false }) });
  assert.equal(created.status, 201);
  const task = await created.json();
  assert.equal(task.notes, '');
  assert.equal(task.flagged, false);

  const listed = await (await fetch(`${base}/api/tasks`, { headers: asUser(1) })).json();
  assert.equal(listed.total, 1);

  const updated = await (await fetch(`${base}/api/tasks/${task.id}`, { method: 'PUT', headers: asUser(1), body: JSON.stringify({ status: 'done', notes: '' }) })).json();
  assert.equal(updated.status, 'done');
  assert.equal(updated.notes, '');

  const otherUser = await fetch(`${base}/api/tasks/${task.id}`, { method: 'PUT', headers: asUser(2), body: JSON.stringify({ status: 'open' }) });
  assert.equal(otherUser.status, 404);
});

test('search filter matches text and exact fields; CSV helper preserves 0 and false', () => {
  assert.equal(wave.filterRecords(records, { q: 'water' }).length, 1);
  assert.equal(wave.filterRecords(records, { mood: 'anxious' }).length, 1);
  assert.equal(wave.filterRecords(records, { category: 'nightmare' }).length, 1);
  const csv = wave.toCSV(records);
  assert.match(csv, /sleep_quality/);
  assert.match(csv, /"false"/);
  assert.match(csv, /"0"/);
});

test('AI features fall back deterministically with labelled sections and zero counts preserved', async () => {
  for (const feature of wave.AI_FEATURES) {
    const res = await fetch(`${base}/api/ai/${feature}`, { method: 'POST', headers: asUser(1), body: '{}' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.aiGenerated, false);
    assert.equal(body.provider, null);
    assert.ok(body.sections.length >= 3);
    assert.ok(body.sections.every((s) => s.label && typeof s.content === 'string'));
  }
  const empty = wave.buildAiResult('dream-pattern-summary', []);
  assert.equal(empty.summary.total, 0);
  assert.equal(wave.hasProviderKey({}), false);
  assert.equal(wave.hasProviderKey({ OPENROUTER_API_KEY: ' set ' }), true);
});
