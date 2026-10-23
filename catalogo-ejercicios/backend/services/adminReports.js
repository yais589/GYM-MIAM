// Informes administrativos de TITAN GYM.
//
// Este módulo hace tres cosas:
//  1. Entiende periodos escritos en lenguaje natural ("este mes", "los últimos
//     7 días", "en marzo", "del 1 al 15").
//  2. Agrega datos reales de Firestore (stock, usuarios, ventas, actividad).
//  3. Devuelve un modelo de informe que sirve tanto para responder en el chat
//     como para pintar un PDF idéntico, porque el PDF se reconstruye desde la
//     misma "spec" (tipo + fechas + límites) y no desde el texto de la charla.

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ROWS = 500;
const MAX_USER_LIMIT = 100;

export const REPORT_TYPES = ['stock-movements', 'stock-status', 'user-movements', 'sales', 'activity'];

const MONTHS = {
  enero: 0, ene: 0, january: 0, jan: 0,
  febrero: 1, feb: 1, february: 1,
  marzo: 2, mar: 2, march: 2,
  abril: 3, abr: 3, april: 3, apr: 3,
  mayo: 4, may: 4,
  junio: 5, jun: 5, june: 5,
  julio: 6, jul: 6, july: 6,
  agosto: 7, ago: 7, august: 7, aug: 7,
  septiembre: 8, setiembre: 8, sep: 8, sept: 8, september: 8,
  octubre: 9, oct: 9, october: 9,
  noviembre: 10, nov: 10, november: 10,
  diciembre: 11, dic: 11, december: 11, dec: 11
};

const NUMBER_WORDS = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
  quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
  noventa: 90, cien: 100, ciento: 100
};

// ─────────────────────────────────────────────────────────────
// Utilidades básicas
// ─────────────────────────────────────────────────────────────

const clean = (value) => String(value ?? '').trim();

/** Minúsculas y sin acentos: "Últimos DÍAS" → "ultimos dias". */
export function normalizeText(value) {
  return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'number') return new Date(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const startOfMonth = (year, month) => new Date(year, month, 1, 0, 0, 0, 0);
const endOfMonth = (year, month) => new Date(year, month + 1, 0, 23, 59, 59, 999);
const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

function startOfWeek(date) {
  const base = startOfDay(date);
  const offset = (base.getDay() + 6) % 7; // lunes = 0
  return addDays(base, -offset);
}

export function formatDate(value) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('es-ES');
}

function formatMoney(value) {
  return `${(Number(value) || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  })} €`;
}

function formatPercent(value) {
  return `${(Number(value) || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
}

function parseNumberToken(token) {
  const normalized = normalizeText(token);
  if (/^\d+$/.test(normalized)) return Number.parseInt(normalized, 10);
  return NUMBER_WORDS[normalized] ?? null;
}

function spanDays(from, to) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS));
}

/** Día a día para periodos cortos, semana o mes para periodos largos. */
export function granularityFor(from, to) {
  const days = spanDays(from, to);
  if (days <= 45) return 'day';
  if (days <= 400) return 'week';
  return 'month';
}

// ─────────────────────────────────────────────────────────────
// Periodos en lenguaje natural
// ─────────────────────────────────────────────────────────────

function monthRange(year, month) {
  return {
    from: startOfMonth(year, month),
    to: endOfMonth(year, month),
    granularity: 'day'
  };
}

/** Si no se indica año, se usa la ocurrencia más reciente que no esté en el futuro. */
function resolveYear(month, explicitYear, now) {
  if (explicitYear) return explicitYear;
  return month > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
}

function detectExplicitPeriod(text, now) {
  // "hoy", "ayer", "anteayer"
  if (/\b(hoy|today)\b/.test(text)) {
    return { from: startOfDay(now), to: endOfDay(now), granularity: 'day', periodLabel: 'hoy' };
  }
  if (/\b(ayer|yesterday)\b/.test(text)) {
    const day = addDays(now, -1);
    return { from: startOfDay(day), to: endOfDay(day), granularity: 'day', periodLabel: 'ayer' };
  }
  if (/\banteayer\b/.test(text)) {
    const day = addDays(now, -2);
    return { from: startOfDay(day), to: endOfDay(day), granularity: 'day', periodLabel: 'anteayer' };
  }

  // "esta semana" / "semana pasada"
  if (/\b(esta|la actual|current)\s+semana\b/.test(text)) {
    return { from: startOfWeek(now), to: endOfDay(now), granularity: 'day', periodLabel: 'esta semana' };
  }
  if (/\b(semana pasada|la semana pasada|previous week|last week)\b/.test(text)) {
    const start = addDays(startOfWeek(now), -7);
    return { from: start, to: endOfDay(addDays(start, 6)), granularity: 'day', periodLabel: 'la semana pasada' };
  }

  // "este mes" / "mes pasado"
  if (/\b(este|el actual|current)\s+mes\b/.test(text) || /\bmes en curso\b/.test(text)) {
    return { from: startOfMonth(now.getFullYear(), now.getMonth()), to: endOfDay(now), granularity: 'day', periodLabel: 'este mes' };
  }
  if (/\b(mes pasado|el mes pasado|previous month|last month)\b/.test(text)) {
    const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return { ...monthRange(year, month), periodLabel: 'el mes pasado' };
  }

  // Trimestres
  if (/\b(este|el actual)\s+trimestre\b/.test(text)) {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    return { from: startOfMonth(now.getFullYear(), quarterStart), to: endOfDay(now), granularity: 'week', periodLabel: 'este trimestre' };
  }
  if (/\b(trimestre pasado|el trimestre pasado)\b/.test(text)) {
    const currentQuarterStart = Math.floor(now.getMonth() / 3) * 3;
    const previousQuarterStart = currentQuarterStart - 3;
    const year = previousQuarterStart < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = previousQuarterStart < 0 ? previousQuarterStart + 12 : previousQuarterStart;
    return { from: startOfMonth(year, month), to: endOfMonth(year, month + 2), granularity: 'week', periodLabel: 'el trimestre pasado' };
  }

  // Años
  if (/\b(este|el actual)\s+ano\b/.test(text) || /\bano en curso\b/.test(text)) {
    return { from: startOfMonth(now.getFullYear(), 0), to: endOfDay(now), granularity: 'month', periodLabel: 'este año' };
  }
  if (/\b(ano pasado|el ano pasado|last year|previous year)\b/.test(text)) {
    return { from: startOfMonth(now.getFullYear() - 1, 0), to: endOfMonth(now.getFullYear() - 1, 11), granularity: 'month', periodLabel: 'el año pasado' };
  }

  // "del 1 al 15 de marzo [de 2026]" (un solo mes al final)
  const dayRangeSameMonth = text.match(
    /(?:del?|desde el?)\s+(\d{1,2})\s+(?:al|hasta el?)\s+(\d{1,2})\s+(?:de\s+)?([a-z]+)(?:\s+(?:de|del)\s+(\d{4}))?/
  );
  if (dayRangeSameMonth) {
    const month = MONTHS[dayRangeSameMonth[3]];
    if (month != null) {
      const year = Number(dayRangeSameMonth[4]) || resolveYear(month, null, now);
      const from = new Date(year, month, Number(dayRangeSameMonth[1]), 0, 0, 0, 0);
      const to = new Date(year, month, Number(dayRangeSameMonth[2]), 23, 59, 59, 999);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        return {
          from,
          to,
          granularity: granularityFor(from, to),
          explicit: true,
          periodLabel: `${formatDate(from)} – ${formatDate(to)}`
        };
      }
    }
  }

  // "del 1 de marzo al 15 de marzo"
  const sameMonthRange = text.match(
    /(?:del?|desde el?)\s+(\d{1,2})\s+(?:de\s+)?([a-z]+)(?:\s+(?:de|del)\s+(\d{4}))?\s+(?:al|hasta el?)\s+(\d{1,2})(?:\s+(?:de\s+)?([a-z]+))?(?:\s+(?:de|del)\s+(\d{4}))?/
  );
  if (sameMonthRange) {
    const firstMonth = MONTHS[sameMonthRange[2]];
    const secondMonth = sameMonthRange[5] ? MONTHS[sameMonthRange[5]] : firstMonth;
    const year = Number(sameMonthRange[3] || sameMonthRange[6]) || resolveYear(firstMonth ?? now.getMonth(), null, now);
    if (firstMonth != null && secondMonth != null) {
      const from = new Date(year, firstMonth, Number(sameMonthRange[1]), 0, 0, 0, 0);
      const to = new Date(year, secondMonth, Number(sameMonthRange[4]), 23, 59, 59, 999);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        return { from, to, granularity: granularityFor(from, to), periodLabel: `${formatDate(from)} – ${formatDate(to)}` };
      }
    }
  }

  // "del 1 de marzo al 15 de abril de 2026" (dos meses distintos)
  const crossMonthRange = text.match(
    /(?:del?|desde el?)\s+(\d{1,2})\s+(?:de\s+)?([a-z]+)(?:\s+(?:de|del)\s+(\d{4}))?\s+(?:al|hasta el?)\s+(\d{1,2})\s+(?:de\s+)?([a-z]+)(?:\s+(?:de|del)\s+(\d{4}))/
  );
  if (crossMonthRange) {
    const firstMonth = MONTHS[crossMonthRange[2]];
    const secondMonth = MONTHS[crossMonthRange[5]];
    if (firstMonth != null && secondMonth != null) {
      const year = Number(crossMonthRange[3] || crossMonthRange[6]) || now.getFullYear();
      const from = new Date(year, firstMonth, Number(crossMonthRange[1]), 0, 0, 0, 0);
      const to = new Date(year, secondMonth, Number(crossMonthRange[4]), 23, 59, 59, 999);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        return { from, to, granularity: granularityFor(from, to), periodLabel: `${formatDate(from)} – ${formatDate(to)}` };
      }
    }
  }

  // Fechas numéricas: "01/03/2026", "1/3", "2026-03-01"
  const numericDates = [...text.matchAll(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/g)]
    .map((match) => {
      const day = Number(match[1]);
      const month = Number(match[2]) - 1;
      let year = match[3] ? Number(match[3]) : now.getFullYear();
      if (year < 100) year += 2000;
      if (month < 0 || month > 11 || day < 1 || day > 31) return null;
      const date = new Date(year, month, day);
      return { date, explicitYear: Boolean(match[3]) };
    })
    .filter(Boolean);
  const isoDates = [...text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)]
    .map((match) => new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    .filter((date) => !Number.isNaN(date.getTime()));

  const numeric = numericDates.map((item) => item.date).concat(isoDates).sort((first, second) => first - second);
  if (numeric.length >= 2) {
    const from = startOfDay(numeric[0]);
    const to = endOfDay(numeric[numeric.length - 1]);
    return { from, to, granularity: granularityFor(from, to), periodLabel: `${formatDate(from)} – ${formatDate(to)}` };
  }
  if (numeric.length === 1) {
    return { from: startOfDay(numeric[0]), to: endOfDay(numeric[0]), granularity: 'day', periodLabel: formatDate(numeric[0]) };
  }

  // "en marzo", "marzo de 2025", "de marzo", "durante marzo"
  const monthName = text.match(/\b(?:en|de|durante|para|del?)\s+([a-z]+)(?:\s+(?:de|del)\s+(\d{4}))?\b/);
  const standaloneMonth = text.match(/\b([a-z]+)(?:\s+(?:de|del)\s+(\d{4}))?\b/);
  for (const candidate of [monthName, standaloneMonth]) {
    const month = candidate && MONTHS[candidate[1]];
    if (month != null) {
      const year = Number(candidate[2]) || resolveYear(month, null, now);
      return { ...monthRange(year, month), periodLabel: `${candidate[1][0].toUpperCase()}${candidate[1].slice(1)} de ${year}` };
    }
  }

  return null;
}

/**
 * Interpreta un periodo. Devuelve siempre un rango válido: si no reconoce
 * nada, usa los últimos 30 días.
 */
export function parseRange(rawText = '', now = new Date()) {
  const text = normalizeText(rawText);
  const explicit = detectExplicitPeriod(text, now);
  if (explicit) {
    return {
      ...explicit,
      explicit: true,
      label: explicit.periodLabel || `${formatDate(explicit.from)} – ${formatDate(explicit.to)}`
    };
  }

  // "últimas 24 horas"
  const hours = text.match(/(?:ultim[oa]s?|last)\s+(\d{1,3}|[a-z]+)\s*horas?/);
  if (hours) {
    const amount = parseNumberToken(hours[1]) || 24;
    const from = new Date(now.getTime() - amount * 60 * 60 * 1000);
    return { from, to: now, granularity: 'day', explicit: true, label: `las últimas ${amount} horas` };
  }

  // "últimos 7 días", "últimos 3 meses", "último año"
  const last = text.match(/(?:ultim[oa]s?|last)\s+(\d{1,3}|[a-z]+)\s*(dias?|semanas?|meses?|mes|anos?|years?|months?|weeks?)/);
  if (last) {
    const amount = parseNumberToken(last[1]) || 1;
    const unit = last[2];
    let from;
    if (/^horas?/.test(unit)) {
      from = new Date(now.getTime() - amount * 60 * 60 * 1000);
    } else if (/^dias?/.test(unit)) {
      from = startOfDay(addDays(now, -(amount - 1)));
    } else if (/^semanas?|weeks?/.test(unit)) {
      from = startOfDay(addDays(now, -(amount * 7 - 1)));
    } else if (/^meses?|mes$|months?/.test(unit)) {
      from = startOfMonth(now.getFullYear(), now.getMonth() - (amount - 1));
    } else {
      from = startOfMonth(now.getFullYear() - (amount - 1), 0);
    }
    const to = endOfDay(now);
    return {
      from,
      to,
      granularity: granularityFor(from, to),
      explicit: true,
      label: `los últimos ${amount} ${amount === 1 ? singularUnit(unit) : pluralUnit(unit)}`
    };
  }

  // "desde el 1 de marzo" (sin fin) → hasta hoy
  const since = text.match(/(?:desde|from)\s+(?:el\s+)?(\d{1,2})(?:\s+(?:de|del)\s+)?([a-z]+)(?:\s+(?:de|del)\s+(\d{4}))?/);
  if (since) {
    const month = MONTHS[since[2]];
    if (month != null) {
      const year = Number(since[3]) || resolveYear(month, null, now);
      const from = new Date(year, month, Number(since[1]), 0, 0, 0, 0);
      const to = endOfDay(now);
      return { from, to, granularity: granularityFor(from, to), explicit: true, label: `desde el ${formatDate(from)}` };
    }
  }

  const to = endOfDay(now);
  const from = startOfDay(addDays(now, -29));
  return { from, to, granularity: 'day', explicit: false, label: 'los últimos 30 días' };
}

function singularUnit(unit) {
  if (/^dias?/.test(unit)) return 'día';
  if (/^semanas?|weeks?/.test(unit)) return 'semana';
  if (/^meses?|mes$|months?/.test(unit)) return 'mes';
  return 'año';
}

function pluralUnit(unit) {
  if (/^dias?/.test(unit)) return 'días';
  if (/^semanas?|weeks?/.test(unit)) return 'semanas';
  if (/^meses?|mes$|months?/.test(unit)) return 'meses';
  return 'años';
}

// ─────────────────────────────────────────────────────────────
// Detección del tipo de informe
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve la petición de informe o null si el mensaje es una consulta normal
 * (esas siguen yendo a queryData para no romper el comportamiento actual).
 */
export function detectReportRequest(message, context = '', now = new Date()) {
  const raw = clean(message);
  const text = normalizeText(raw);
  const combinedRaw = `${raw} ${context}`.trim();
  if (!text) return null;

  const wantsPdf = /(pdf|informe|reporte|report|exporta|exportar|descarg|documento|dossier)/.test(text);
  const wantsReport = /(informe|reporte|report|movimiento|movimientos|actualizacion|actualizaciones|cambio|cambios|historial|evolucion|desglose|desglosame|desglosar|listado|detalle|detalles|resumen|ranking|top|comparativa|variacion)/.test(text);
  const periodish = /(hoy|ayer|esta semana|semana pasada|este mes|mes pasado|trimestre|este ano|ano pasado|ultim[oa]s?|entre|desde|del \d|\d{1,2}\/\d{1,2}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/.test(text);

  const stockWords = /(stock|inventario|producto|productos|almacen|existencias)/.test(text);
  const userWords = /(usuario|usuarios|cliente|clientes|cuenta|cuentas|gente|persona|personas)/.test(text);
  const salesWords = /(venta|ventas|ingreso|ingresos|facturacion|pedido|pedidos|compra|compras|orden|ordenes|revenue|cobro|cobros)/.test(text);
  const activityWords = /(actividad|activo|activa|entrenamiento|entrenamientos|rutina|rutinas|planes|plane|uso|engagement|movimiento)/.test(text);

  let type = null;
  if (stockWords && /(movimiento|actualizacion|cambio|historial|evolucion|entrada|entradas|salida|salidas|ajuste|variacion)/.test(text)) {
    type = 'stock-movements';
  } else if (stockWords) {
    type = 'stock-status';
  } else if (userWords && !salesWords && /(movimiento|movimientos|actividad|reciente|recientes|ultimo|ultimos|historial|han hecho|detalle)/.test(text)) {
    type = 'user-movements';
  } else if (salesWords) {
    type = 'sales';
  } else if (activityWords) {
    type = 'activity';
  } else if (userWords) {
    type = 'user-movements';
  }

  if (!type) return null;

  // Sin intención explícita de informe ni periodo, dejamos que queryData
  // responda los conteos de siempre.
  if (!wantsPdf && !wantsReport && !periodish) return null;

  const range = parseRange(combinedRaw, now);
  const usersMatch = text.match(/(?:ultim[oa]s?|top|primeros?)\s+(\d{1,3}|[a-z]+)\s+(?:usuarios?|clientes?|cuentas?|personas?)/);
  const users = usersMatch ? Math.min(MAX_USER_LIMIT, parseNumberToken(usersMatch[1]) || 10) : 10;

  const rowsMatch = text.match(/(?:ultim[oa]s?|top)\s+(\d{1,3}|[a-z]+)\s+(?:movimientos?|registros?|eventos?|pedidos?|productos?|filas?|lineas?)/);
  const explicitRows = rowsMatch ? parseNumberToken(rowsMatch[1]) : null;

  return {
    type,
    wantsPdf,
    usersLimit: users,
    rowLimit: Math.min(MAX_ROWS, explicitRows || defaultRowLimit(range)),
    range
  };
}

function defaultRowLimit(range) {
  const days = spanDays(range.from, range.to);
  if (days <= 7) return 40;
  if (days <= 31) return 120;
  return 300;
}

// ─────────────────────────────────────────────────────────────
// Specs: lo mínimo para reconstruir el mismo informe (y su PDF)
// ─────────────────────────────────────────────────────────────

export function toReportSpec({ type, range, rowLimit, usersLimit }) {
  return {
    type,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    label: range.label,
    limit: Math.min(MAX_ROWS, Math.max(1, Number(rowLimit) || 100)),
    users: Math.min(MAX_USER_LIMIT, Math.max(1, Number(usersLimit) || 10))
  };
}

export function validateReportSpec(raw) {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Falta la especificación del informe' };
  const type = REPORT_TYPES.includes(raw.type) ? raw.type : null;
  if (!type) return { ok: false, error: 'El tipo de informe no es válido' };

  const from = toDate(raw.from);
  const to = toDate(raw.to);
  if (!from || !to) return { ok: false, error: 'Las fechas del informe no son válidas' };

  const ordered = from <= to ? { from, to } : { from: to, to: from };
  const days = spanDays(ordered.from, ordered.to);
  if (days > 366 * 5) return { ok: false, error: 'El periodo del informe es demasiado amplio' };

  return {
    ok: true,
    spec: {
      type,
      from: ordered.from.toISOString(),
      to: ordered.to.toISOString(),
      label: clean(raw.label).slice(0, 120) || `${formatDate(ordered.from)} – ${formatDate(ordered.to)}`,
      limit: Math.min(MAX_ROWS, Math.max(1, Number.parseInt(raw.limit, 10) || 100)),
      users: Math.min(MAX_USER_LIMIT, Math.max(1, Number.parseInt(raw.users, 10) || 10))
    }
  };
}

// ─────────────────────────────────────────────────────────────
// Acceso a datos
// ─────────────────────────────────────────────────────────────

async function safe(operation, fallback) {
  try {
    return await (typeof operation === 'function' ? operation() : operation);
  } catch (error) {
    console.error(`Informe: no se pudo leer una fuente de datos (${error.message})`);
    return fallback;
  }
}

async function listAllAuthUsers(auth) {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

function rangeQuery(firestore, collection, from, to, { field = 'createdAt', limit = 500 } = {}) {
  return firestore.collection(collection)
    .where(field, '>=', from)
    .where(field, '<=', to)
    .limit(limit)
    .get();
}

async function loadOrderEvents(firestore, from, to, limit) {
  return safe(async () => {
    const snapshot = await rangeQuery(firestore, 'orders', from, to, { limit });
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  }, []);
}

async function loadWorkoutEvents(firestore, from, to, limit) {
  return safe(async () => {
    const snapshot = await rangeQuery(firestore, 'workouts', from, to, { field: 'date', limit });
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  }, []);
}

async function loadPlanEvents(firestore, from, to, limit) {
  return safe(async () => {
    const snapshot = await rangeQuery(firestore, 'generatedPlans', from, to, { limit });
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  }, []);
}

async function loadStoreItemDocs(firestore) {
  return safe(async () => {
    const snapshot = await firestore.collection('storeitems').limit(MAX_ROWS).get();
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  }, []);
}

function statusLabel(status) {
  const normalized = normalizeText(status);
  if (normalized === 'paid' || normalized === 'completed') return 'Pagado';
  if (normalized === 'pending') return 'Pendiente';
  if (normalized === 'expired') return 'Expirado';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'Cancelado';
  return status ? String(status) : '—';
}

function isPaidOrder(order) {
  const status = normalizeText(order?.status);
  return status === 'paid' || status === 'completed';
}

function orderUnits(order) {
  return (Array.isArray(order?.items) ? order.items : [])
    .reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
}

// ─────────────────────────────────────────────────────────────
// Modelo del informe
// ─────────────────────────────────────────────────────────────

function buildMetrics(entries) {
  return entries
    .filter((entry) => entry && entry.label)
    .map((entry) => ({ label: String(entry.label), value: String(entry.value ?? '—') }));
}

function buildSummary({ title, range, metrics, notes }) {
  const lines = [title];
  if (range?.label) lines.push(`Periodo: ${range.label}`);
  for (const metric of metrics || []) lines.push(`• ${metric.label}: ${metric.value}`);
  for (const note of notes || []) lines.push(note);
  return lines.join('\n');
}

function makeReport({ type, title, subtitle, range, metrics, sections, notes = [], totalRows = 0 }) {
  return {
    type,
    title,
    subtitle,
    range: { from: range.from.toISOString(), to: range.to.toISOString(), label: range.label },
    generatedAt: new Date().toISOString(),
    metrics,
    sections,
    notes,
    totalRows,
    summary: buildSummary({ title, range, metrics, notes })
  };
}

function bucketKey(date, granularity) {
  if (granularity === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  if (granularity === 'week') return `W${formatDate(startOfWeek(date))}`;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function bucketLabel(key, granularity) {
  if (granularity === 'month') {
    const [year, month] = key.split('-');
    const name = new Date(Number(year), Number(month) - 1, 1)
      .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return name[0].toUpperCase() + name.slice(1);
  }
  if (granularity === 'week') return `Semana del ${key.slice(1)}`;
  return key.split('-').reverse().join('/');
}

function listBuckets(from, to, granularity) {
  const buckets = [];
  let cursor = granularity === 'month'
    ? startOfMonth(from.getFullYear(), from.getMonth())
    : granularity === 'week'
      ? startOfWeek(from)
      : startOfDay(from);
  const guard = 400;
  for (let index = 0; index < guard && cursor <= to; index += 1) {
    const key = bucketKey(cursor, granularity);
    if (!buckets.includes(key)) buckets.push(key);
    if (granularity === 'month') {
      cursor = startOfMonth(cursor.getFullYear(), cursor.getMonth() + 1);
    } else if (granularity === 'week') {
      cursor = addDays(cursor, 7);
    } else {
      cursor = addDays(cursor, 1);
    }
  }
  return buckets;
}

// ─────────────────────────────────────────────────────────────
// Informe: movimientos de stock
// ─────────────────────────────────────────────────────────────

function movementTypeLabel(type) {
  const normalized = normalizeText(type);
  if (normalized === 'manual') return 'Ajuste manual';
  if (normalized === 'reserva') return 'Reserva web';
  if (normalized === 'liberacion') return 'Liberación';
  if (normalized === 'ajuste') return 'Ajuste inventario';
  return type ? String(type) : 'Movimiento';
}

function movementOrigin(movement) {
  if (movement.actorEmail) return String(movement.actorEmail);
  if (movement.type === 'reserva' || movement.type === 'liberacion') {
    const reference = String(movement.orderId || '');
    return reference ? `Pedido #${reference.slice(-4)}` : 'Tienda online';
  }
  return movement.actorUid ? 'Admin' : 'Sistema';
}

const pluralize = (count, singular, plural) => `${formatNumber(count)} ${Number(count) === 1 ? singular : plural}`;

async function buildStockMovementsReport(spec, deps) {
  const from = new Date(spec.from);
  const to = new Date(spec.to);
  const range = { from, to, label: spec.label };

  const movements = await safe(async () => {
    const snapshot = await rangeQuery(deps.firestore, 'stockMovements', from, to, { limit: MAX_ROWS });
    return snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .sort((first, second) => (toDate(second.createdAt) || 0) - (toDate(first.createdAt) || 0));
  }, []);

  const storeItems = await safe(() => deps.getStoreItems(), []);
  const stockByProduct = new Map(storeItems.map((item) => [String(item.id), Number(item.stock) || 0]));

  if (!movements.length) {
    // Sin historial: reconstruimos lo que sí sabemos (última actualización de
    // cada producto) para que el informe nunca salga vacío.
    const itemDocs = await loadStoreItemDocs(deps.firestore);
    const updated = itemDocs
      .map((item) => ({ ...item, updatedAtDate: toDate(item.updatedAt) }))
      .filter((item) => item.updatedAtDate && item.updatedAtDate >= from && item.updatedAtDate <= to)
      .sort((first, second) => second.updatedAtDate - first.updatedAtDate);

    const totals = updated.reduce((result, item) => {
      result.units += Math.max(0, Number.parseInt(item.stock, 10) || 0);
      result.value += (Number(item.price) || 0) * Math.max(0, Number.parseInt(item.stock, 10) || 0);
      return result;
    }, { units: 0, value: 0 });

    const metrics = buildMetrics([
      { label: 'Productos actualizados', value: formatNumber(updated.length) },
      { label: 'Unidades en stock', value: formatNumber(totals.units) },
      { label: 'Valor del inventario', value: formatMoney(totals.value) },
      { label: 'Movimientos detallados', value: '0' }
    ]);

    const sections = [{
      title: 'Productos con cambios de stock en el periodo',
      columns: [
        { key: 'product', label: 'PRODUCTO', width: 200 },
        { key: 'stock', label: 'STOCK', width: 60, align: 'right' },
        { key: 'price', label: 'PRECIO', width: 80, align: 'right' },
        { key: 'value', label: 'VALOR', width: 90, align: 'right' },
        { key: 'updated', label: 'ACTUALIZADO', width: 89, align: 'right' }
      ],
      rows: updated.slice(0, spec.limit).map((item) => ({
        product: item.name || item.id,
        stock: formatNumber(item.stock),
        price: formatMoney(item.price),
        value: formatMoney((Number(item.price) || 0) * (Number.parseInt(item.stock, 10) || 0)),
        updated: formatDateTime(item.updatedAtDate)
      }))
    }];

    const notes = [
      'El historial detallado de stock empieza con esta versión: desde ahora se registra cada ajuste manual, reserva y liberación.',
      updated.length ? `Se muestran ${Math.min(updated.length, spec.limit)} de ${updated.length} productos.` : 'No hay productos actualizados en el periodo seleccionado.'
    ];

    return makeReport({
      type: 'stock-movements',
      title: 'Actualizaciones de stock',
      subtitle: 'Cambios de inventario registrados en TITAN GYM',
      range,
      metrics,
      sections,
      notes,
      totalRows: updated.length
    });
  }

  const byProduct = new Map();
  for (const movement of movements) {
    const key = String(movement.productId ?? 'desconocido');
    const entry = byProduct.get(key) || {
      productId: key,
      name: movement.productName || `Producto ${key}`,
      movements: 0,
      inbound: 0,
      outbound: 0,
      net: 0,
      last: null
    };
    const units = Math.abs(Number(movement.units ?? movement.delta) || 0);
    const delta = Number(movement.delta) || 0;
    entry.movements += 1;
    if (delta > 0) entry.inbound += units;
    if (delta < 0) entry.outbound += units;
    entry.net += delta;
    const at = toDate(movement.createdAt);
    if (at && (!entry.last || at > entry.last)) entry.last = at;
    byProduct.set(key, entry);
  }

  const productRows = [...byProduct.values()].sort((first, second) => Math.abs(second.net) - Math.abs(first.net));
  const inboundTotal = movements.filter((movement) => (Number(movement.delta) || 0) > 0)
    .reduce((sum, movement) => sum + Math.abs(Number(movement.units ?? movement.delta) || 0), 0);
  const outboundTotal = movements.filter((movement) => (Number(movement.delta) || 0) < 0)
    .reduce((sum, movement) => sum + Math.abs(Number(movement.units ?? movement.delta) || 0), 0);
  const manualTotal = movements.filter((movement) => movement.type === 'manual').length;

  const metrics = buildMetrics([
    { label: 'Movimientos', value: formatNumber(movements.length) },
    { label: 'Entradas', value: `+${formatNumber(inboundTotal)}` },
    { label: 'Salidas', value: `-${formatNumber(outboundTotal)}` },
    { label: 'Ajustes manuales', value: formatNumber(manualTotal) },
    { label: 'Productos afectados', value: formatNumber(byProduct.size) },
    { label: 'Variación neta', value: `${inboundTotal - outboundTotal > 0 ? '+' : ''}${formatNumber(inboundTotal - outboundTotal)}` }
  ]);

  const sections = [
    {
      title: 'Resumen por producto',
      columns: [
        { key: 'product', label: 'PRODUCTO', width: 185 },
        { key: 'movements', label: 'MOV.', width: 42, align: 'right' },
        { key: 'inbound', label: 'ENTRADAS', width: 62, align: 'right' },
        { key: 'outbound', label: 'SALIDAS', width: 58, align: 'right' },
        { key: 'stock', label: 'STOCK ACT.', width: 62, align: 'right' },
        { key: 'net', label: 'VARIACIÓN', width: 65, align: 'right' },
        { key: 'last', label: 'ÚLTIMO', width: 45, align: 'right' }
      ],
      rows: productRows.slice(0, spec.limit).map((entry) => ({
        product: entry.name,
        movements: formatNumber(entry.movements),
        inbound: entry.inbound ? `+${formatNumber(entry.inbound)}` : '—',
        outbound: entry.outbound ? `-${formatNumber(entry.outbound)}` : '—',
        stock: stockByProduct.has(entry.productId) ? formatNumber(stockByProduct.get(entry.productId)) : '—',
        net: `${entry.net > 0 ? '+' : ''}${formatNumber(entry.net)}`,
        last: entry.last ? entry.last.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '—'
      }))
    },
    {
      title: 'Detalle de movimientos',
      columns: [
        { key: 'date', label: 'FECHA', width: 88 },
        { key: 'product', label: 'PRODUCTO', width: 124 },
        { key: 'type', label: 'TIPO', width: 74 },
        { key: 'before', label: 'ANTES', width: 45, align: 'right' },
        { key: 'after', label: 'DESPUÉS', width: 52, align: 'right' },
        { key: 'delta', label: 'VAR.', width: 42, align: 'right' },
        { key: 'origin', label: 'ORIGEN', width: 94, fontSize: 6.6 }
      ],
      rows: movements.slice(0, spec.limit).map((movement) => ({
        date: formatDateTime(movement.createdAt),
        product: movement.productName || `Producto ${movement.productId}`,
        type: movementTypeLabel(movement.type),
        before: movement.before == null ? '—' : formatNumber(movement.before),
        after: movement.after == null ? '—' : formatNumber(movement.after),
        delta: `${Number(movement.delta) > 0 ? '+' : ''}${formatNumber(movement.delta)}`,
        origin: movementOrigin(movement)
      }))
    }
  ];

  const lowStock = stockItemsLow(storeItems).length;
  const notes = [
    `Se muestran ${Math.min(movements.length, spec.limit)} de ${formatNumber(movements.length)} movimientos registrados en el periodo.`
  ];
  if (lowStock) {
    notes.push(`${pluralize(lowStock, 'producto está', 'productos están')} en stock bajo (5 unidades o menos).`);
  }

  return makeReport({
    type: 'stock-movements',
    title: 'Actualizaciones de stock',
    subtitle: 'Entradas, salidas y ajustes de inventario',
    range,
    metrics,
    sections,
    notes,
    totalRows: movements.length
  });
}

function stockItemsLow(items) {
  return (items || []).filter((item) => (Number(item.stock) || 0) <= 5);
}

// ─────────────────────────────────────────────────────────────
// Informe: estado del inventario
// ─────────────────────────────────────────────────────────────

async function buildStockStatusReport(spec, deps) {
  const from = new Date(spec.from);
  const to = new Date(spec.to);
  const items = await safe(() => deps.getStoreItems(), []);

  const totals = items.reduce((result, item) => {
    const stock = Math.max(0, Number(item.stock) || 0);
    const price = Number(item.price) || 0;
    result.units += stock;
    result.value += stock * price;
    if (stock === 0) result.outOfStock += 1;
    else if (stock <= 5) result.low += 1;
    if (item.isAvailable === false) result.hidden += 1;
    return result;
  }, { units: 0, value: 0, outOfStock: 0, low: 0, hidden: 0 });

  const metrics = buildMetrics([
    { label: 'Referencias', value: formatNumber(items.length) },
    { label: 'Unidades', value: formatNumber(totals.units) },
    { label: 'Valor del inventario', value: formatMoney(totals.value) },
    { label: 'Sin stock', value: formatNumber(totals.outOfStock) },
    { label: 'Stock bajo', value: formatNumber(totals.low) },
    { label: 'No disponibles', value: formatNumber(totals.hidden) }
  ]);

  const ordered = [...items].sort((first, second) => (Number(first.stock) || 0) - (Number(second.stock) || 0));
  const sections = [{
    title: 'Inventario actual (de menor a mayor stock)',
    columns: [
      { key: 'product', label: 'PRODUCTO', width: 188 },
      { key: 'category', label: 'CATEGORÍA', width: 96 },
      { key: 'price', label: 'PRECIO', width: 62, align: 'right' },
      { key: 'stock', label: 'STOCK', width: 50, align: 'right' },
      { key: 'value', label: 'VALOR', width: 72, align: 'right' },
      { key: 'state', label: 'ESTADO', width: 51 }
    ],
    rows: ordered.slice(0, spec.limit).map((item) => {
      const stock = Math.max(0, Number(item.stock) || 0);
      return {
        product: item.name,
        category: item.category || '—',
        price: formatMoney(item.price),
        stock: formatNumber(stock),
        value: formatMoney(stock * (Number(item.price) || 0)),
        state: item.isAvailable === false ? 'Oculto' : stock === 0 ? 'Agotado' : stock <= 5 ? 'Bajo' : 'Disponible'
      };
    })
  }];

  return makeReport({
    type: 'stock-status',
    title: 'Estado del inventario',
    subtitle: 'Stock, disponibilidad y valor de la tienda',
    range: { from, to, label: spec.label },
    metrics,
    sections,
    notes: [
      `Se muestran ${Math.min(items.length, spec.limit)} de ${formatNumber(items.length)} productos.`,
      'El periodo afecta al PDF y al contexto; el inventario se muestra siempre con los datos actuales.'
    ],
    totalRows: items.length
  });
}

// ─────────────────────────────────────────────────────────────
// Informe: movimientos de usuarios
// ─────────────────────────────────────────────────────────────

async function loadUserDirectory(deps) {
  const [users, profiles] = await Promise.all([
    safe(() => listAllAuthUsers(deps.auth), []),
    safe(async () => (await deps.firestore.collection('profiles').limit(MAX_ROWS * 2).get()).docs, [])
  ]);
  const profilesByUid = new Map(profiles.map((document) => [document.id, document.data() || {}]));
  return users.map((user) => {
    const profile = profilesByUid.get(user.uid) || {};
    const name = [profile.name, profile.lastName].filter(Boolean).join(' ') || user.displayName || '';
    return {
      uid: user.uid,
      email: user.email || profile.email || '',
      name: name || (user.email ? user.email.split('@')[0] : 'Sin nombre'),
      disabled: Boolean(user.disabled),
      createdAt: toDate(user.metadata?.creationTime)
    };
  });
}

async function loadUserActivity(deps, from, to) {
  const [orders, workouts, plans, directory] = await Promise.all([
    loadOrderEvents(deps.firestore, from, to, MAX_ROWS),
    loadWorkoutEvents(deps.firestore, from, to, MAX_ROWS),
    loadPlanEvents(deps.firestore, from, to, MAX_ROWS),
    loadUserDirectory(deps)
  ]);

  const byUid = new Map(directory.map((entry) => [entry.uid, entry]));
  const events = [];

  for (const workout of workouts) {
    const at = toDate(workout.date);
    if (!at || !workout.userId) continue;
    const minutes = Number(workout.duration) || 0;
    const calories = Number(workout.calories) || 0;
    events.push({
      at,
      uid: String(workout.userId),
      kind: 'workout',
      label: 'Entrenamiento',
      detail: `${minutes} min · ${calories} kcal${workout.exerciseId ? ` · ejercicio #${workout.exerciseId}` : ''}`,
      amount: 0
    });
  }

  for (const order of orders) {
    const at = toDate(order.createdAt);
    if (!at || !order.userId) continue;
    events.push({
      at,
      uid: String(order.userId),
      kind: 'order',
      label: `Pedido ${statusLabel(order.status).toLowerCase()}`,
      detail: pluralize(orderUnits(order), 'artículo', 'artículos'),
      amount: isPaidOrder(order) ? Number(order.total) || 0 : 0
    });
  }

  for (const plan of plans) {
    const at = toDate(plan.createdAt);
    if (!at || !plan.userId) continue;
    events.push({
      at,
      uid: String(plan.userId),
      kind: 'plan',
      label: 'Plan generado',
      detail: normalizeText(plan.type) === 'training' ? 'Entrenamiento' : 'Nutrición',
      amount: 0
    });
  }

  events.sort((first, second) => second.at - first.at);

  const byUser = new Map();
  for (const event of events) {
    const entry = byUser.get(event.uid) || {
      uid: event.uid,
      name: byUid.get(event.uid)?.name || 'Usuario',
      email: byUid.get(event.uid)?.email || '',
      disabled: byUid.get(event.uid)?.disabled || false,
      events: 0,
      workouts: 0,
      orders: 0,
      plans: 0,
      spend: 0,
      last: null
    };
    entry.events += 1;
    if (event.kind === 'workout') entry.workouts += 1;
    if (event.kind === 'order') {
      entry.orders += 1;
      entry.spend += event.amount;
    }
    if (event.kind === 'plan') entry.plans += 1;
    if (!entry.last || event.at > entry.last) entry.last = event.at;
    byUser.set(event.uid, entry);
  }

  const usersList = [...byUser.values()].sort((first, second) => second.last - first.last);

  return { events, users: usersList, directory, orders, workouts, plans };
}

async function buildUserMovementsReport(spec, deps) {
  const from = new Date(spec.from);
  const to = new Date(spec.to);
  const range = { from, to, label: spec.label };
  const activity = await loadUserActivity(deps, from, to);

  const selected = activity.users.slice(0, spec.users);
  const selectedUids = new Set(selected.map((entry) => entry.uid));
  const detail = activity.events.filter((event) => selectedUids.has(event.uid)).slice(0, spec.limit);
  const paidOrders = activity.orders.filter(isPaidOrder);

  const metrics = buildMetrics([
    { label: 'Usuarios con actividad', value: formatNumber(activity.users.length) },
    { label: 'Eventos', value: formatNumber(activity.events.length) },
    { label: 'Entrenamientos', value: formatNumber(activity.workouts.length) },
    { label: 'Pedidos', value: formatNumber(activity.orders.length) },
    { label: 'Ingresos confirmados', value: formatMoney(paidOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)) },
    { label: 'Planes generados', value: formatNumber(activity.plans.length) }
  ]);

  const sections = [
    {
      title: `Últimos ${selected.length} usuarios con actividad`,
      columns: [
        { key: 'user', label: 'USUARIO', width: 122 },
        { key: 'email', label: 'EMAIL', width: 148, fontSize: 6.8 },
        { key: 'events', label: 'EVENTOS', width: 50, align: 'right' },
        { key: 'workouts', label: 'ENTR.', width: 42, align: 'right' },
        { key: 'orders', label: 'PEDIDOS', width: 52, align: 'right' },
        { key: 'spend', label: 'GASTO', width: 58, align: 'right' },
        { key: 'last', label: 'ÚLTIMO', width: 47, align: 'right', fontSize: 6.5 }
      ],
      rows: selected.map((entry) => ({
        user: entry.disabled ? `${entry.name} (bloqueado)` : entry.name,
        email: entry.email || '—',
        events: formatNumber(entry.events),
        workouts: formatNumber(entry.workouts),
        orders: formatNumber(entry.orders),
        spend: entry.spend ? formatMoney(entry.spend) : '—',
        last: entry.last ? entry.last.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '—'
      }))
    },
    {
      title: 'Detalle de movimientos',
      columns: [
        { key: 'date', label: 'FECHA', width: 96 },
        { key: 'user', label: 'USUARIO', width: 118 },
        { key: 'type', label: 'TIPO', width: 84 },
        { key: 'detail', label: 'DETALLE', width: 178 },
        { key: 'amount', label: 'IMPORTE', width: 43, align: 'right' }
      ],
      rows: detail.map((event) => ({
        date: formatDateTime(event.at),
        user: activity.users.find((entry) => entry.uid === event.uid)?.name || 'Usuario',
        type: event.label,
        detail: event.detail,
        amount: event.amount ? formatMoney(event.amount) : '—'
      }))
    }
  ];

  const notes = [];
  if (!activity.events.length) notes.push('No hay entrenamientos, pedidos ni planes registrados en este periodo.');
  if (activity.users.length > selected.length) {
    notes.push(`Hay ${formatNumber(activity.users.length - selected.length)} usuario(s) más con actividad fuera de este listado.`);
  }
  notes.push('El detalle se limita a los usuarios seleccionados y al máximo de filas del informe.');

  return makeReport({
    type: 'user-movements',
    title: `Movimientos de los últimos ${selected.length || spec.users} usuarios`,
    subtitle: 'Entrenamientos, pedidos y planes por usuario',
    range,
    metrics,
    sections,
    notes,
    totalRows: activity.events.length
  });
}

// ─────────────────────────────────────────────────────────────
// Informe: ventas
// ─────────────────────────────────────────────────────────────

async function buildSalesReport(spec, deps) {
  const from = new Date(spec.from);
  const to = new Date(spec.to);
  const range = { from, to, label: spec.label };
  const orders = await loadOrderEvents(deps.firestore, from, to, MAX_ROWS);
  const paid = orders.filter(isPaidOrder);
  const granularity = granularityFor(from, to);

  const revenue = paid.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const units = paid.reduce((sum, order) => sum + orderUnits(order), 0);
  const pending = orders.filter((order) => normalizeText(order.status) === 'pending');
  const expired = orders.filter((order) => ['expired', 'cancelled', 'canceled'].includes(normalizeText(order.status)));

  const metrics = buildMetrics([
    { label: 'Pedidos pagados', value: formatNumber(paid.length) },
    { label: 'Ingresos', value: formatMoney(revenue) },
    { label: 'Ticket medio', value: formatMoney(paid.length ? revenue / paid.length : 0) },
    { label: 'Unidades vendidas', value: formatNumber(units) },
    { label: 'Pendientes', value: formatNumber(pending.length) },
    { label: 'Expirados o cancelados', value: formatNumber(expired.length) }
  ]);

  // Evolución por periodo, incluyendo periodos sin ventas para que se vea el hueco.
  const buckets = listBuckets(from, to, granularity);
  const rowsByBucket = new Map(buckets.map((key) => [key, { orders: 0, revenue: 0, units: 0 }]));
  for (const order of paid) {
    const at = toDate(order.createdAt);
    if (!at) continue;
    const key = bucketKey(at, granularity);
    const entry = rowsByBucket.get(key) || { orders: 0, revenue: 0, units: 0 };
    entry.orders += 1;
    entry.revenue += Number(order.total) || 0;
    entry.units += orderUnits(order);
    rowsByBucket.set(key, entry);
  }

  const evolutionRows = [...rowsByBucket.entries()].map(([key, entry]) => ({
    period: bucketLabel(key, granularity),
    orders: formatNumber(entry.orders),
    revenue: formatMoney(entry.revenue),
    units: formatNumber(entry.units),
    average: formatMoney(entry.orders ? entry.revenue / entry.orders : 0)
  }));

  // Productos
  const products = new Map();
  for (const order of paid) {
    for (const item of Array.isArray(order.items) ? order.items : []) {
      const key = String(item?.id ?? 'desconocido');
      const entry = products.get(key) || { name: item?.name || `Producto ${key}`, units: 0, revenue: 0 };
      entry.units += Number(item?.quantity) || 0;
      entry.revenue += (Number(item?.price) || 0) * (Number(item?.quantity) || 0);
      products.set(key, entry);
    }
  }
  const productRows = [...products.values()].sort((first, second) => second.revenue - first.revenue);

  const sections = [
    {
      title: `Evolución (${granularity === 'day' ? 'por día' : granularity === 'week' ? 'por semana' : 'por mes'})`,
      columns: [
        { key: 'period', label: 'PERIODO', width: 170 },
        { key: 'orders', label: 'PEDIDOS', width: 70, align: 'right' },
        { key: 'revenue', label: 'INGRESOS', width: 95, align: 'right' },
        { key: 'units', label: 'UNIDADES', width: 85, align: 'right' },
        { key: 'average', label: 'TICKET', width: 99, align: 'right' }
      ],
      rows: evolutionRows.slice(-Math.max(spec.limit, 1))
    },
    {
      title: 'Productos más vendidos',
      columns: [
        { key: 'product', label: 'PRODUCTO', width: 250 },
        { key: 'units', label: 'UNIDADES', width: 80, align: 'right' },
        { key: 'revenue', label: 'INGRESOS', width: 100, align: 'right' },
        { key: 'share', label: 'CUOTA', width: 89, align: 'right' }
      ],
      rows: productRows.slice(0, spec.limit).map((entry) => ({
        product: entry.name,
        units: formatNumber(entry.units),
        revenue: formatMoney(entry.revenue),
        share: formatPercent(revenue ? (entry.revenue / revenue) * 100 : 0)
      }))
    },
    {
      title: 'Últimos pedidos del periodo',
      columns: [
        { key: 'date', label: 'FECHA', width: 88 },
        { key: 'customer', label: 'CLIENTE', width: 176, fontSize: 6.5 },
        { key: 'status', label: 'ESTADO', width: 66 },
        { key: 'items', label: 'ARTÍCULOS', width: 66, align: 'right' },
        { key: 'total', label: 'TOTAL', width: 60, align: 'right' },
        { key: 'payment', label: 'COBRO', width: 63, align: 'right' }
      ],
      rows: [...orders]
        .sort((first, second) => (toDate(second.createdAt) || 0) - (toDate(first.createdAt) || 0))
        .slice(0, spec.limit)
        .map((order) => ({
          date: formatDate(order.createdAt),
          customer: order.email || order.userId || '—',
          status: statusLabel(order.status),
          items: formatNumber(orderUnits(order)),
          total: formatMoney(order.total),
          payment: isPaidOrder(order) ? 'Cobrado' : 'No cobrado'
        }))
    }
  ];

  return makeReport({
    type: 'sales',
    title: 'Ventas y facturación',
    subtitle: 'Pedidos, ingresos y productos vendidos',
    range,
    metrics,
    sections,
    notes: [
      'Los ingresos solo cuentan pedidos pagados o completados; los pendientes y expirados aparecen aparte.',
      `Se analizan ${formatNumber(orders.length)} pedido(s) del periodo (máximo ${MAX_ROWS} por informe).`
    ],
    totalRows: orders.length
  });
}

// ─────────────────────────────────────────────────────────────
// Informe: actividad general
// ─────────────────────────────────────────────────────────────

async function buildActivityReport(spec, deps) {
  const from = new Date(spec.from);
  const to = new Date(spec.to);
  const range = { from, to, label: spec.label };
  const activity = await loadUserActivity(deps, from, to);
  const granularity = granularityFor(from, to);
  const paidOrders = activity.orders.filter(isPaidOrder);

  const signups = activity.directory.filter((entry) => entry.createdAt && entry.createdAt >= from && entry.createdAt <= to);

  const metrics = buildMetrics([
    { label: 'Cuentas nuevas', value: formatNumber(signups.length) },
    { label: 'Usuarios con actividad', value: formatNumber(activity.users.length) },
    { label: 'Entrenamientos', value: formatNumber(activity.workouts.length) },
    { label: 'Pedidos pagados', value: formatNumber(paidOrders.length) },
    { label: 'Ingresos', value: formatMoney(paidOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)) },
    { label: 'Planes generados', value: formatNumber(activity.plans.length) }
  ]);

  const buckets = listBuckets(from, to, granularity);
  const rows = new Map(buckets.map((key) => [key, { workouts: 0, orders: 0, revenue: 0, plans: 0 }]));
  const addTo = (date, patch) => {
    const at = toDate(date);
    if (!at) return;
    const key = bucketKey(at, granularity);
    const entry = rows.get(key) || { workouts: 0, orders: 0, revenue: 0, plans: 0 };
    rows.set(key, { ...entry, ...patch(entry) });
  };
  activity.workouts.forEach((workout) => addTo(workout.date, (entry) => ({ workouts: entry.workouts + 1 })));
  activity.plans.forEach((plan) => addTo(plan.createdAt, (entry) => ({ plans: entry.plans + 1 })));
  paidOrders.forEach((order) => addTo(order.createdAt, (entry) => ({
    orders: entry.orders + 1,
    revenue: entry.revenue + (Number(order.total) || 0)
  })));

  const sections = [
    {
      title: `Actividad (${granularity === 'day' ? 'por día' : granularity === 'week' ? 'por semana' : 'por mes'})`,
      columns: [
        { key: 'period', label: 'PERIODO', width: 170 },
        { key: 'workouts', label: 'ENTRENOS', width: 70, align: 'right' },
        { key: 'plans', label: 'PLANES', width: 65, align: 'right' },
        { key: 'orders', label: 'PEDIDOS', width: 70, align: 'right' },
        { key: 'revenue', label: 'INGRESOS', width: 144, align: 'right' }
      ],
      rows: [...rows.entries()].map(([key, entry]) => ({
        period: bucketLabel(key, granularity),
        workouts: formatNumber(entry.workouts),
        plans: formatNumber(entry.plans),
        orders: formatNumber(entry.orders),
        revenue: formatMoney(entry.revenue)
      }))
    },
    {
      title: 'Usuarios más activos',
      columns: [
        { key: 'user', label: 'USUARIO', width: 150 },
        { key: 'email', label: 'EMAIL', width: 190, fontSize: 6.8 },
        { key: 'events', label: 'EVENTOS', width: 60, align: 'right' },
        { key: 'workouts', label: 'ENTRENOS', width: 60, align: 'right' },
        { key: 'last', label: 'ÚLTIMO', width: 59, align: 'right' }
      ],
      rows: activity.users.slice(0, Math.max(spec.users, 1)).map((entry) => ({
        user: entry.name,
        email: entry.email || '—',
        events: formatNumber(entry.events),
        workouts: formatNumber(entry.workouts),
        last: entry.last ? formatDate(entry.last) : '—'
      }))
    }
  ];

  return makeReport({
    type: 'activity',
    title: 'Actividad de la plataforma',
    subtitle: 'Entrenamientos, planes, pedidos e ingresos',
    range,
    metrics,
    sections,
    notes: [
      `${formatNumber(signups.length)} cuenta(s) se registraron en el periodo.`,
      'Los ingresos solo cuentan pedidos pagados o completados.'
    ],
    totalRows: activity.events.length
  });
}

// ─────────────────────────────────────────────────────────────
// API pública del módulo
// ─────────────────────────────────────────────────────────────

/**
 * Construye el informe completo a partir de una spec serializable.
 * @param {{type:string, from:string, to:string, label:string, limit:number, users:number}} spec
 * @param {{firestore:object, auth:object, getStoreItems:Function}} deps
 */
export async function buildReport(spec, deps) {
  const validated = validateReportSpec(spec);
  if (!validated.ok) throw new Error(validated.error);
  const safeSpec = validated.spec;

  let report;
  switch (safeSpec.type) {
    case 'stock-movements':
      report = await buildStockMovementsReport(safeSpec, deps);
      break;
    case 'stock-status':
      report = await buildStockStatusReport(safeSpec, deps);
      break;
    case 'user-movements':
      report = await buildUserMovementsReport(safeSpec, deps);
      break;
    case 'sales':
      report = await buildSalesReport(safeSpec, deps);
      break;
    case 'activity':
      report = await buildActivityReport(safeSpec, deps);
      break;
    default:
      throw new Error('Tipo de informe no soportado');
  }

  // La spec viaja con el informe para que el cliente pueda pedir exactamente
  // el mismo documento en PDF sin reconstruir nada por su cuenta.
  return { ...report, spec: safeSpec };
}

const readableLabel = (label) => {
  const text = clean(label).toLowerCase();
  if (!text) return '';
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
};

/** Texto para el chat a partir del modelo del informe. */
export function describeReport(report) {
  const lines = [report.summary];
  const section = report.sections?.[0];
  if (section?.rows?.length) {
    const columns = Array.isArray(section.columns) ? section.columns : [];
    const [titleColumn, ...valueColumns] = columns;
    lines.push('');
    lines.push(`${section.title}:`);
    for (const row of section.rows.slice(0, 8)) {
      const title = titleColumn ? row[titleColumn.key] : Object.values(row)[0];
      const values = valueColumns
        .map((column) => `${readableLabel(column.label)}: ${row[column.key] ?? '—'}`)
        .join(' · ');
      lines.push(`• ${title}${values ? ` — ${values}` : ''}`);
    }
    if (section.rows.length > 8) lines.push(`… y ${section.rows.length - 8} fila(s) más en el PDF.`);
  }
  return lines.join('\n');
}

export { MAX_ROWS };
