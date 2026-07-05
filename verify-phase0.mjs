/**
 * Phase 0 smoke tests — run while backend is on PORT (default 5000).
 * Usage: node scripts/verify-phase0.mjs
 */
const BASE = process.env.API_BASE || 'http://localhost:5000';
const ts = Date.now();
const email = `phase0-${ts}@careersync.test`;
const password = 'TestPass123!';

let passed = 0;
let failed = 0;

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
  if (!res.ok) {
    throw new Error(body.error || body.message || res.statusText);
  }
  return body;
}

async function main() {
  console.log(`\nPhase 0 verification → ${BASE}\n`);

  let mongoReady = false;

  await test('GET /api/health', async () => {
    const res = await fetch(`${BASE}/api/health`);
    const body = await json(res);
    if (body.status !== 'OK') throw new Error('unexpected health payload');
    mongoReady = !!body.environment?.mongodbConfigured;
  });

  if (!mongoReady) {
    console.warn('\n⚠️  MongoDB is not connected — skipping database integration tests.');
    console.warn('   Set MONGODB_URI in backend/.env and ensure Atlas network access.\n');
  }

  let token;

  await test('POST /api/auth/register returns 503 when DB down', async () => {
    if (mongoReady) return;
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Phase0' }),
    });
    if (res.status !== 503) throw new Error(`expected 503, got ${res.status}`);
  });

  await test('POST /api/auth/register', async () => {
    if (!mongoReady) return;
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Phase0 Tester' }),
    });
    const body = await json(res);
    token = body.token;
    if (!token) throw new Error('no token returned');
  });

  await test('GET /api/auth/me with Bearer token', async () => {
    if (!mongoReady) return;
    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await json(res);
    if (!body.user?.email) throw new Error('user missing from /me');
  });

  await test('POST /api/courses/save requires auth', async () => {
    const res = await fetch(`${BASE}/api/courses/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Should Fail' }),
    });
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  await test('POST /api/courses/save with auth', async () => {
    if (!mongoReady) return;
    const res = await fetch(`${BASE}/api/courses/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: `Phase0 Course ${ts}`,
        description: 'Verification course',
        modules: [],
      }),
    });
    const body = await json(res);
    if (!body.courseId && !body.data?._id) throw new Error('course not saved');
  });

  await test('POST /api/profile/enroll/course with auth', async () => {
    if (!mongoReady) return;
    const res = await fetch(`${BASE}/api/profile/enroll/course`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        courseTitle: `Enrolled ${ts}`,
        courseModules: 3,
      }),
    });
    await json(res);
  });

  let userId;

  await test('GET /api/profile/:id with own user id', async () => {
    if (!mongoReady) return;
    const meRes = await fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = await json(meRes);
    userId = me.user.id;
    const res = await fetch(`${BASE}/api/profile/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await json(res);
    if (!body.profile) throw new Error('profile missing');
  });

  await test('GET /api/profile/:id forbidden for other user', async () => {
    if (!mongoReady) return;
    const res = await fetch(`${BASE}/api/profile/000000000000000000000001`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Verification crashed:', err);
  process.exit(1);
});
