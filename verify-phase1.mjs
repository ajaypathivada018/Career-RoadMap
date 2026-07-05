/**
 * Phase 1 smoke tests — ownership + Mongo-required writes.
 * Run with backend up: npm run test:phase1
 */
import { spawn } from 'node:child_process';

const BASE = process.env.API_BASE || 'http://localhost:5000';
const ts = Date.now();
const email = `phase1-${ts}@careersync.test`;
const password = 'TestPass123!';

let passed = 0;
let failed = 0;
let mongoReady = false;
let token;
let userId;
let courseId;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`❌ ${name}:`, err.message);
    failed += 1;
  }
}

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || body.message || `${res.status} ${res.statusText}`);
  return body;
}

async function main() {
  console.log(`\nPhase 1 verification → ${BASE}\n`);

  await test('health reports mongo connection state', async () => {
    const res = await fetch(`${BASE}/api/health`);
    const body = await json(res);
    mongoReady = !!body.environment?.mongodbConfigured;
    if (!mongoReady) {
      console.warn('⚠️  MongoDB not connected — integration tests will be skipped.');
    }
  });

  await test('GET /api/courses without auth returns 401', async () => {
    const res = await fetch(`${BASE}/api/courses`);
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  if (!mongoReady) {
    console.log(`\nResults: ${passed} passed, ${failed} failed (mongo offline)\n`);
    process.exit(failed > 0 ? 1 : 0);
    return;
  }

  await test('register + login flow', async () => {
    const reg = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Phase1' }),
    });
    const regBody = await json(reg);
    token = regBody.token;

    const me = await json(
      await fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    );
    userId = me.user.id;
  });

  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  await test('save course with clientRequestId deduplicates', async () => {
    const body = {
      title: `Phase1 Dedup ${ts}`,
      modules: [],
      clientRequestId: `dedup-${ts}`,
    };
    const first = await json(
      await fetch(`${BASE}/api/courses/save`, { method: 'POST', headers: auth, body: JSON.stringify(body) })
    );
    const second = await json(
      await fetch(`${BASE}/api/courses/save`, { method: 'POST', headers: auth, body: JSON.stringify(body) })
    );
    if (first.courseId !== second.courseId) throw new Error('dedup failed');
    if (!second.deduplicated) throw new Error('expected deduplicated flag');
    courseId = first.courseId;
  });

  await test('another user cannot read private course', async () => {
    const other = await json(
      await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `other-${ts}@careersync.test`,
          password,
          name: 'Other',
        }),
      })
    );
    const res = await fetch(`${BASE}/api/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${other.token}` },
    });
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
  });

  await test('owner can list own courses only', async () => {
    const list = await json(await fetch(`${BASE}/api/courses`, { headers: { Authorization: `Bearer ${token}` } }));
    if (!list.data?.length) throw new Error('expected courses');
    const foreign = list.data.find((c) => c.userId && c.userId !== userId && c.user?.toString() !== userId);
    if (foreign) throw new Error('list included foreign course');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
