import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReport, detectReportRequest, parseRange } from './adminReports.js';
import { createReportPdf } from './adminReportPdf.js';

const LOCAL = (year, month, day, hour = 12) => new Date(year, month, day, hour, 0, 0, 0);

// ─────────────────────────────────────────────────────────────
// Firestore simulado: solo lo que usan los informes
// ─────────────────────────────────────────────────────────────

function createFirestore(collections = {}) {
  const state = new Map(Object.entries(collections).map(([name, docs]) => [
    name,
    docs.map((document, index) => ({ id: document.id || `${name}-${index}`, ...document }))
  ]));

  const asTime = (value) => (value instanceof Date ? value.getTime() : new Date(value).getTime());

  const matches = (document, filters) => filters.every(([field, operator, expected]) => {
    const value = document[field];
    if (operator === '>=') return asTime(value) >= asTime(expected);
    if (operator === '<=') return asTime(value) <= asTime(expected);
    if (operator === '==') return value === expected;
    return false;
  });

  const collection = (name) => {
    const filters = [];
    let max = Number.POSITIVE_INFINITY;
    const api = {
      where(field, operator, expected) {
        filters.push([field, operator, expected]);
        return api;
      },
      limit(count) {
        max = count;
        return api;
      },
      async get() {
        const documents = (state.get(name) || []).filter((document) => matches(document, filters)).slice(0, max);
        return { docs: documents.map((document) => ({ id: document.id, data: () => document })) };
      },
      doc(id) {
        return {
          id,
          get: async () => {
            const found = (state.get(name) || []).find((document) => document.id === id);
            return { exists: Boolean(found), id, data: () => found };
          }
        };
      }
    };
    return api;
  };

  return { collection };
}

function createAuth(users = []) {
  return {
    listUsers: async () => ({ users })
  };
}

const MARCH = {
  from: LOCAL(2026, 2, 1, 0),
  to: new Date(2026, 2, 31, 23, 59, 59, 999),
  label: 'Marzo de 2026'
};

function spec(overrides = {}) {
  return {
    type: 'stock-movements',
    from: MARCH.from.toISOString(),
    to: MARCH.to.toISOString(),
    label: MARCH.label,
    limit: 50,
    users: 10,
    ...overrides
  };
}

const STORE_ITEMS = [
  { id: 'p1', name: 'Whey Protein', stock: 8, price: 25, category: 'Proteína' },
  { id: 'p2', name: 'Creatina', stock: 40, price: 18, category: 'Proteína' }
];

// ─────────────────────────────────────────────────────────────
// Periodos
// ─────────────────────────────────────────────────────────────

test('interpreta "este mes" desde el día 1 hasta hoy', () => {
  const now = LOCAL(2026, 9, 22);
  const range = parseRange('ventas de este mes', now);
  assert.equal(range.from.getMonth(), 9);
  assert.equal(range.from.getDate(), 1);
  assert.equal(range.to.getDate(), 22);
  assert.equal(range.explicit, true);
});

test('interpreta un mes con nombre y año', () => {
  const range = parseRange('dame el informe de marzo de 2025');
  assert.equal(range.from.getFullYear(), 2025);
  assert.equal(range.from.getMonth(), 2);
  assert.equal(range.from.getDate(), 1);
  assert.equal(range.to.getMonth(), 2);
  assert.equal(range.to.getDate(), 31);
});

test('interpreta un rango de días dentro de un mes', () => {
  const range = parseRange('movimientos del 1 al 15 de marzo de 2026');
  assert.equal(range.from.getDate(), 1);
  assert.equal(range.to.getDate(), 15);
  assert.equal(range.from.getMonth(), 2);
  assert.equal(range.to.getFullYear(), 2026);
});

test('interpreta "los últimos 7 días" y "mes pasado"', () => {
  const now = LOCAL(2026, 9, 22);
  const week = parseRange('los últimos 7 días', now);
  assert.equal(Math.round((week.to - week.from) / 86400000), 7);
  assert.equal(week.explicit, true);

  const previous = parseRange('el mes pasado', now);
  assert.equal(previous.from.getMonth(), 8);
  assert.equal(previous.to.getMonth(), 8);
});

test('sin periodo reconocible usa 30 días y lo marca como no explícito', () => {
  const range = parseRange('pdf con las actualizaciones del stock');
  assert.equal(range.explicit, false);
  assert.equal(range.label, 'los últimos 30 días');
});

// ─────────────────────────────────────────────────────────────
// Detección de informes
// ─────────────────────────────────────────────────────────────

test('detecta el informe de stock con PDF', () => {
  const request = detectReportRequest('dame un PDF con las actualizaciones del stock');
  assert.equal(request.type, 'stock-movements');
  assert.equal(request.wantsPdf, true);
});

test('detecta el informe de movimientos de usuarios y el número de usuarios', () => {
  const request = detectReportRequest('dame otro con los últimos movimientos de los últimos 10 usuarios');
  assert.equal(request.type, 'user-movements');
  assert.equal(request.usersLimit, 10);
});

test('no convierte una consulta de conteo en un informe', () => {
  assert.equal(detectReportRequest('¿cuántos usuarios hay?'), null);
  assert.equal(detectReportRequest('¿cuántos administradores hay?'), null);
});

test('detecta ventas de un periodo', () => {
  const request = detectReportRequest('ventas e ingresos de este mes');
  assert.equal(request.type, 'sales');
});

// ─────────────────────────────────────────────────────────────
// Informes con datos reales simulados
// ─────────────────────────────────────────────────────────────

test('el informe de stock agrega entradas, salidas y variación neta', async () => {
  const firestore = createFirestore({
    stockMovements: [
      {
        productId: 'p1',
        productName: 'Whey Protein',
        type: 'manual',
        before: 5,
        after: 15,
        delta: 10,
        units: 10,
        actorEmail: 'admin@titan.com',
        createdAt: LOCAL(2026, 2, 4)
      },
      {
        productId: 'p1',
        productName: 'Whey Protein',
        type: 'reserva',
        before: 15,
        after: 13,
        delta: -2,
        units: 2,
        orderId: 'order-123456789',
        createdAt: LOCAL(2026, 2, 6)
      },
      {
        productId: 'p2',
        productName: 'Creatina',
        type: 'manual',
        before: 35,
        after: 40,
        delta: 5,
        units: 5,
        actorEmail: 'admin@titan.com',
        createdAt: LOCAL(2026, 2, 9)
      }
    ]
  });

  const report = await buildReport(spec(), {
    firestore,
    auth: createAuth(),
    getStoreItems: async () => STORE_ITEMS
  });

  const metric = (label) => report.metrics.find((entry) => entry.label === label)?.value;
  assert.equal(metric('Movimientos'), '3');
  assert.equal(metric('Entradas'), '+15');
  assert.equal(metric('Salidas'), '-2');
  assert.equal(metric('Variación neta'), '+13');
  assert.equal(report.sections[0].rows.length, 2);
  assert.equal(report.totalRows, 3);
  assert.match(report.summary, /Actualizaciones de stock/);
});

test('el informe de stock avisa cuando aún no hay historial detallado', async () => {
  const firestore = createFirestore({
    storeitems: [
      { id: 'p1', name: 'Whey Protein', stock: 8, price: 25, updatedAt: LOCAL(2026, 2, 3) }
    ]
  });

  const report = await buildReport(spec(), {
    firestore,
    auth: createAuth(),
    getStoreItems: async () => STORE_ITEMS
  });

  assert.equal(report.type, 'stock-movements');
  assert.ok(report.notes.some((note) => note.includes('historial detallado')));
  assert.ok(report.sections[0].rows.length >= 1);
});

test('el informe de ventas solo suma pedidos pagados', async () => {
  const firestore = createFirestore({
    orders: [
      { userId: 'u1', email: 'ana@example.com', status: 'paid', total: 30, items: [{ id: 'p1', name: 'Whey', quantity: 1, price: 30 }], createdAt: LOCAL(2026, 2, 5) },
      { userId: 'u2', email: 'luis@example.com', status: 'pending', total: 99, items: [{ id: 'p2', name: 'Creatina', quantity: 1, price: 99 }], createdAt: LOCAL(2026, 2, 7) },
      { userId: 'u1', email: 'ana@example.com', status: 'completed', total: 20, items: [{ id: 'p2', name: 'Creatina', quantity: 2, price: 10 }], createdAt: LOCAL(2026, 2, 12) }
    ]
  });

  const report = await buildReport(spec({ type: 'sales' }), {
    firestore,
    auth: createAuth(),
    getStoreItems: async () => STORE_ITEMS
  });

  const metric = (label) => report.metrics.find((entry) => entry.label === label)?.value;
  assert.equal(metric('Pedidos pagados'), '2');
  assert.match(metric('Ingresos'), /50,00/);
  assert.equal(metric('Pendientes'), '1');
  assert.equal(report.totalRows, 3);
});

test('el informe de movimientos lista usuarios y eventos del periodo', async () => {
  const firestore = createFirestore({
    profiles: [
      { id: 'u1', name: 'Ana', lastName: 'Ruiz' },
      { id: 'u2', name: 'Luis' },
      { id: 'u3', name: 'Marta' }
    ],
    workouts: [
      { userId: 'u1', date: LOCAL(2026, 2, 5), duration: 30, calories: 200 },
      { userId: 'u2', date: LOCAL(2026, 2, 8), duration: 45, calories: 300 }
    ],
    orders: [
      { userId: 'u1', email: 'ana@example.com', status: 'paid', total: 30, items: [{ id: 'p1', quantity: 1, price: 30 }], createdAt: LOCAL(2026, 2, 6) }
    ],
    generatedPlans: [
      { userId: 'u3', type: 'training', createdAt: LOCAL(2026, 2, 10) }
    ]
  });

  const auth = createAuth([
    { uid: 'u1', email: 'ana@example.com', disabled: false, metadata: { creationTime: '2026-01-02T10:00:00.000Z' } },
    { uid: 'u2', email: 'luis@example.com', disabled: false, metadata: { creationTime: '2026-02-03T10:00:00.000Z' } },
    { uid: 'u3', email: 'marta@example.com', disabled: false, metadata: { creationTime: '2026-02-04T10:00:00.000Z' } }
  ]);

  const report = await buildReport(spec({ type: 'user-movements', users: 2 }), {
    firestore,
    auth,
    getStoreItems: async () => STORE_ITEMS
  });

  assert.equal(report.totalRows, 4);
  assert.equal(report.sections[0].rows.length, 2);
  // Ordenado por actividad más reciente: Marta (plan, día 10), Luis (entreno, día 8).
  assert.equal(report.sections[0].rows[0].user, 'Marta');
  assert.equal(report.sections[0].rows[1].user, 'Luis');
  assert.ok(report.notes.some((note) => note.includes('usuario(s) más con actividad')));
});

test('el informe de actividad cuenta altas y actividad del periodo', async () => {
  const firestore = createFirestore({
    profiles: [{ id: 'u1', name: 'Ana' }],
    workouts: [{ userId: 'u1', date: LOCAL(2026, 2, 5), duration: 30, calories: 200 }],
    orders: [{ userId: 'u1', status: 'paid', total: 12, items: [{ id: 'p1', quantity: 1, price: 12 }], createdAt: LOCAL(2026, 2, 6) }],
    generatedPlans: []
  });

  const auth = createAuth([
    { uid: 'u1', email: 'ana@example.com', metadata: { creationTime: '2026-03-03T10:00:00.000Z' } },
    { uid: 'u9', email: 'viejo@example.com', metadata: { creationTime: '2025-11-03T10:00:00.000Z' } }
  ]);

  const report = await buildReport(spec({ type: 'activity' }), {
    firestore,
    auth,
    getStoreItems: async () => STORE_ITEMS
  });

  const metric = (label) => report.metrics.find((entry) => entry.label === label)?.value;
  assert.equal(metric('Cuentas nuevas'), '1');
  assert.equal(metric('Entrenamientos'), '1');
  assert.match(metric('Ingresos'), /12,00/);
});

// ─────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────

test('genera un PDF válido con el informe', async () => {
  const firestore = createFirestore({
    orders: [
      { userId: 'u1', email: 'ana@example.com', status: 'paid', total: 30, items: [{ id: 'p1', name: 'Whey', quantity: 1, price: 30 }], createdAt: LOCAL(2026, 2, 5) }
    ]
  });

  const report = await buildReport(spec({ type: 'sales' }), {
    firestore,
    auth: createAuth([{ uid: 'u1', email: 'ana@example.com', metadata: { creationTime: '2026-02-03T10:00:00.000Z' } }]),
    getStoreItems: async () => STORE_ITEMS
  });

  const pdf = await createReportPdf(report, 'es');
  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 2000, `el PDF es demasiado pequeño: ${pdf.length} bytes`);
});

test('el PDF reparte en varias páginas los informes largos', async () => {
  const items = Array.from({ length: 90 }, (_, index) => ({
    id: `p${index}`,
    name: `Producto ${index}`,
    stock: index,
    price: 10,
    category: 'Proteína'
  }));

  const report = await buildReport(spec({ type: 'stock-status', limit: 120 }), {
    firestore: createFirestore({}),
    auth: createAuth(),
    getStoreItems: async () => items
  });

  const pdf = await createReportPdf(report, 'es');
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  assert.ok(pages >= 3, `se esperaban varias páginas y salieron ${pages}`);
});
