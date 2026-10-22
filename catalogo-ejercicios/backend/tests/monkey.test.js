import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '..');

const ITERATIONS = Number(process.env.MONKEY_ITERATIONS || 400);
const TIMEOUT_MS = Number(process.env.MONKEY_TIMEOUT_MS || 8000);
// MONKEY_STRICT=1 convierte los hallazgos conocidos en fallos de test.
const STRICT = process.env.MONKEY_STRICT === '1';
const REPORT_FILE = process.env.MONKEY_REPORT || path.join(os.tmpdir(), 'monkey-report.json');

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !@#$%^&*()[]{}<>,.;:/\\|`~\'"<>';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(maxLen = 64) {
  const len = randomInt(0, maxLen);
  let out = '';
  for (let i = 0; i < len; i++) out += CHARS[randomInt(0, CHARS.length - 1)];
  return out;
}

function randomValue(depth = 0) {
  if (depth > 3) return randomString(12);
  const roll = Math.random();
  if (roll < 0.10) return null;
  if (roll < 0.16) return undefined;
  if (roll < 0.32) return randomString(randomInt(0, 120));
  if (roll < 0.44) return randomInt(-100000, 100000);
  if (roll < 0.52) return randomInt(-5, 5) / 7;
  if (roll < 0.58) return Math.random() > 0.5;
  if (roll < 0.66) return [];
  if (roll < 0.76) return [randomValue(depth + 1), randomValue(depth + 1)];
  if (roll < 0.88) {
    const obj = {};
    const keys = randomInt(0, 6);
    for (let i = 0; i < keys; i++) obj[randomString(randomInt(1, 10))] = randomValue(depth + 1);
    return obj;
  }
  return {};
}

// Rutas publicas del backend: no requieren credenciales ni escriben en Firestore.
const PUBLIC_ROUTES = [
  { method: 'GET', path: '/api/health' },
  { method: 'GET', path: '/api/exercises' },
  { method: 'GET', path: '/api/exercises/1' },
  { method: 'GET', path: '/api/exercises/999999' },
  { method: 'GET', path: '/api/exercises/abc' },
  { method: 'GET', path: '/api/exercises/-1' },
  { method: 'GET', path: '/api/exercises/search/Pecho' },
  { method: 'GET', path: '/api/exercises/search/%20' },
  { method: 'GET', path: '/api/exercises/difficulty/beginner' },
  { method: 'GET', path: '/api/exercises/difficulty/UNKNOWN' },
  { method: 'GET', path: '/api/exercises/category/Pecho' },
  { method: 'GET', path: '/api/categories' },
  { method: 'GET', path: '/api/categories/stats' },
  { method: 'GET', path: '/api/nutrition' },
  { method: 'GET', path: '/api/nutrition/1' },
  { method: 'GET', path: '/api/nutrition/abc' },
  { method: 'GET', path: '/api/nutrition/search/Pollo' },
  { method: 'GET', path: '/api/storeitems' },
  { method: 'GET', path: '/api/recommendations/test-user' },
  { method: 'GET', path: '/api/user/test-user/favorites' },
  { method: 'GET', path: '/api/user/test-user/workouts' },
  { method: 'GET', path: '/api/user/test-user/stats' },
  { method: 'GET', path: '/api/user/test-user/routines' },
  { method: 'POST', path: '/api/user/test-user/favorites/1' },
  { method: 'DELETE', path: '/api/user/test-user/favorites/1' },
  { method: 'POST', path: '/api/user/test-user/workout' },
  { method: 'POST', path: '/api/user/test-user/routines' },
];

// Rutas protegidas: sin Firebase configurado responden 503 de forma controlada.
const PROTECTED_ROUTES = [
  { method: 'GET', path: '/api/profile' },
  { method: 'PUT', path: '/api/profile' },
  { method: 'GET', path: '/api/profile/cart' },
  { method: 'PUT', path: '/api/profile/cart' },
  { method: 'GET', path: '/api/profile/favorites' },
  { method: 'PUT', path: '/api/profile/favorites' },
  { method: 'POST', path: '/api/orders' },
  { method: 'GET', path: '/api/orders/abc' },
  { method: 'GET', path: '/api/admin/overview' },
  { method: 'GET', path: '/api/admin/users' },
  { method: 'GET', path: '/api/admin/storeitems' },
  { method: 'POST', path: '/api/ai/chat' },
  { method: 'POST', path: '/api/ai/generate-plan' },
  { method: 'POST', path: '/api/stripe/create-checkout-session' },
  { method: 'POST', path: '/api/stripe/webhook' },
];

function pickRoute() {
  const pool = Math.random() < 0.3 ? PROTECTED_ROUTES : PUBLIC_ROUTES;
  return pool[randomInt(0, pool.length - 1)];
}

// Se generan varios tipos de cuerpo a proposito:
//  - JSON valido con valores aleatorios (tipos incorrectos, arrays, null, cadenas largas)
//  - texto que NO es JSON (payload corrupto)
//  - JSON primitivo (string, number, boolean, null)
//
// express.json() trabaja en modo strict: solo acepta objetos y arrays como raiz.
// Un cuerpo primitivo o corrupto hace que el parser lance SyntaxError (status 400).
// El hallazgo documentado es que el handler global de errores ignora error.status
// y responde 500 en lugar de 400.
function pickBody() {
  const roll = Math.random();
  if (roll < 0.15) {
    // Texto que no es JSON: el parser lo rechaza.
    return { raw: randomString(randomInt(0, 200)), parserRejected: true };
  }
  if (roll < 0.20) {
    // Cuerpo vacio: el parser lo acepta (lo trata como {}).
    return { raw: '', parserRejected: false };
  }
  const value = randomValue();
  const serialized = JSON.stringify(value);
  if (serialized === undefined) return { raw: '', parserRejected: false };
  const isPrimitive = serialized === 'null' || serialized === 'true' || serialized === 'false'
    || !serialized.startsWith('{') && !serialized.startsWith('[');
  return { raw: serialized, parserRejected: isPrimitive };
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function request(baseUrl, route, body, timeoutMs) {
  return new Promise((resolve) => {
    const payload = body === undefined ? undefined : Buffer.from(body);
    const headers = { 'User-Agent': 'monkey-test/1.0', Accept: '*/*' };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = payload.length;
    }
    const req = http.request(
      `${baseUrl}${route.path}`,
      { method: route.method, headers, timeout: timeoutMs },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForHealth(baseUrl, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request(baseUrl, { method: 'GET', path: '/api/health' }, undefined, 3000);
    if (res.status === 200) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

test('monkey test: el backend resiste entradas aleatorias sin caerse', async (t) => {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const server = spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  server.stdout.on('data', (d) => { serverOutput += d.toString(); });
  server.stderr.on('data', (d) => { serverOutput += d.toString(); });

  let serverExited = false;
  server.on('exit', (code, signal) => {
    serverExited = true;
    serverOutput += `\n[monkey] el servidor termino con codigo ${code} senal ${signal}`;
  });

  t.after(() => {
    if (!serverExited) server.kill('SIGKILL');
  });

  const healthy = await waitForHealth(baseUrl);
  assert.ok(healthy, `El backend no arranco. Salida:\n${serverOutput}`);

  const crashes = [];       // fallos graves: el servidor cayo o dejo de responder
  const unexpected5xx = []; // 5xx que no son un hallazgo ya conocido
  const knownFindings = []; // 5xx explicados y reproducibles (ver README)
  const statusCounts = new Map();
  const routeHits = new Map();
  let completed = 0;

  for (let i = 0; i < ITERATIONS && !serverExited; i++) {
    const route = pickRoute();
    let body;
    let parserRejected = false;
    if (route.method !== 'GET' && route.method !== 'DELETE') {
      const picked = pickBody();
      body = picked.raw;
      parserRejected = picked.parserRejected;
    }

    const res = await request(baseUrl, route, body, TIMEOUT_MS);
    completed++;

    const key = `${route.method} ${route.path}`;
    routeHits.set(key, (routeHits.get(key) || 0) + 1);
    statusCounts.set(res.status, (statusCounts.get(res.status) || 0) + 1);

    if (res.status === 0) {
      crashes.push(`${key} -> fallo de conexion: ${res.error}`);
      continue;
    }

    if (res.status === 500 && parserRejected) {
      // Hallazgo conocido: express.json() lanza SyntaxError con status 400, pero el
      // handler global ignora error.status y responde 500 en lugar de 400.
      knownFindings.push(`${key} -> HTTP 500 por cuerpo rechazado por el parser (deberia ser 400)`);
      continue;
    }

    if (res.status >= 500 && res.status !== 503) {
      unexpected5xx.push(`${key} -> HTTP ${res.status}: ${res.body.slice(0, 300)}`);
      continue;
    }

    if (res.status >= 400 && res.status < 500) {
      if (!/error|message|detail/i.test(res.body)) {
        unexpected5xx.push(`${key} -> HTTP ${res.status} sin mensaje de error: ${res.body.slice(0, 200)}`);
      }
    }
  }

  const stillAlive = await request(baseUrl, { method: 'GET', path: '/api/health' }, undefined, 5000);

  const report = {
    generatedAt: new Date().toISOString(),
    iterations: completed,
    distinctRoutes: routeHits.size,
    statusCounts: Object.fromEntries([...statusCounts.entries()].sort((a, b) => a[0] - b[0])),
    crashes,
    unexpected5xx,
    knownFindings: [...new Set(knownFindings)],
  };
  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`\n[monkey] peticiones ejecutadas      : ${completed}`);
  console.log(`[monkey] rutas distintas atacadas   : ${report.distinctRoutes}`);
  console.log(`[monkey] reparto de codigos         : ${JSON.stringify(report.statusCounts)}`);
  console.log(`[monkey] caidas del servidor        : ${crashes.length}`);
  console.log(`[monkey] 5xx inesperados            : ${unexpected5xx.length}`);
  console.log(`[monkey] hallazgos conocidos         : ${report.knownFindings.length}`);
  console.log(`[monkey] informe escrito en         : ${REPORT_FILE}`);

  assert.ok(!serverExited, `El servidor se Caixo durante el monkey test.\n${serverOutput}`);
  assert.equal(stillAlive.status, 200, `El backend dejo de responder correctamente.\n${serverOutput}`);
  assert.equal(completed, ITERATIONS, `Solo se completaron ${completed} de ${ITERATIONS} peticiones`);
  assert.deepEqual(crashes, [], `El servidor no respondio correctamente:\n${crashes.join('\n')}`);
  assert.deepEqual(unexpected5xx, [], `El backend devolvio respuestas no controladas:\n${unexpected5xx.join('\n')}`);
  if (STRICT) {
    assert.deepEqual(
      report.knownFindings,
      [],
      `Hallazgos conocidos sin resolver (MONKEY_STRICT=1):\n${report.knownFindings.join('\n')}`
    );
  }
});
