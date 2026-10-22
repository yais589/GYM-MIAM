// Servicio del asistente IA: conecta con un proveedor real (OpenAI o Claude) y
// limita las respuestas a nutrición, ejercicio y la tienda TITAN GYM.
// Si no hay API key configurada, funciona con un motor de respuestas local.

import { getExercises, getIngredients, getStoreItems } from './dataAccess.js';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-haiku-latest';
const MAX_HISTORY = 12;

export const TOPIC_BOUNCE = 'Lo siento, no puedo dar esta información. Solo puedo ayudarte con temas de nutrición, ejercicio y la tienda de TITAN GYM.';

// ─── Contexto: qué hay en la web ─────────────────────────────────────────────
// Este texto alimenta al modelo para que conteste con datos reales de la web.
function describeCatalog(exercises) {
  const byCategory = new Map();
  for (const exercise of exercises.slice(0, 400)) {
    const category = String(exercise.category || 'general');
    if (!byCategory.has(category)) byCategory.set(category, []);
    const bucket = byCategory.get(category);
    if (bucket.length < 25) bucket.push(exercise.name);
  }
  const summary = [...byCategory.entries()]
    .map(([category, names]) => `${category} (${exercises.filter(e => String(e.category) === category).length}): ${names.join(', ')}`)
    .join('\n');
  return `Total: ${exercises.length} ejercicios. Por grupo:\n${summary}`;
}

function describeStore(storeItems) {
  const available = storeItems.filter(item => item.isAvailable !== false);
  const featured = available.slice(0, 15)
    .map(item => `${item.name} (${item.category}, ${Number(item.price).toFixed(2)} €${item.featured ? ', destacado' : ''})`);
  const categories = [...new Set(available.map(item => item.category).filter(Boolean))];
  return `Categorías: ${categories.join(', ')}.\nProductos: ${featured.join('; ')}`;
}

function describeIngredients(ingredients) {
  const usable = ingredients.filter(item => Number(item.energy) > 0);
  const sorted = [...usable].sort((a, b) => a.energy - b.energy);
  const lowest = sorted.slice(0, 12).map(item => `${item.name} (${item.energy} kcal)`).join(', ');
  const highestProtein = [...usable].sort((a, b) => (b.protein || 0) - (a.protein || 0)).slice(0, 10)
    .map(item => `${item.name} (${item.protein} g)`).join(', ');
  return `Base de datos de nutrición con ${usable.length} alimentos (por 100 g: kcal, proteína, carbs, grasa).\nLos más ligeros: ${lowest}.\nLos más proteicos: ${highestProtein}.`;
}

async function buildSystemContext({ userId, profileData = null, userData = null }) {
  const lines = [
    'Eres TITAN, el asistente de fitness y nutrición de la web TITAN GYM (GYMPOWER).',
    'REGLAS IMPORTANTES:',
    '1. Responde SIEMPRE en el idioma del usuario (por defecto español), con tono cercano, claro y motivador.',
    '2. Puedes mantener conversación normal de cortesía: saludos (hola, buenas, ¿qué tal?), presentaciones (¿quién eres?, ¿qué puedes hacer?), agradecimientos y despedidas. Responde con naturalidad, preséntate como TITAN y recuerda tus temas: nutrición, ejercicio y la tienda TITAN GYM.',
    '3. SOLO das contenido real sobre: nutrición, dietas, alimentos, macronutrientes, ejercicio, entrenamiento, rutinas y la tienda TITAN GYM (productos, precios, pedidos, planes de la web).',
    '4. Si el usuario pregunta por CUALQUIER otro tema (política, ciencia, código, historias, tareas de clase, otros negocios...), responde exactamente con este texto: "Lo siento, no puedo dar esta información. Solo puedo ayudarte con temas de nutrición, ejercicio y la tienda de TITAN GYM."',
    '5. Nunca inventes productos que no estén en el catálogo de la tienda. Planes de la web: Free (ejercicios), Pro (3 meses, calendario + descuento nutrición) y Elite 12 meses por 11,99 €/mes (todo incluido: nutrición + asistente IA + 5% en tienda).',
    '7. Sé CONCRETO y VARIADO: si piden ejercicios de un grupo ("dame 2 de espalda y 4 de pierna"), da EXACTAMENTE esos ejercicios del catálogo con sus nombres reales, variando la selección en cada respuesta (no repitas siempre los mismos). Si piden alimentos por calorías o proteína, busca en la base de datos los que cumplan la condición y da valores numéricos reales (kcal, gramos de proteína por 100 g). Nunca respondas con generalidades ni con "tengo muchos alimentos, genera un plan": da el dato concreto que piden.',
    '8. Cuando el usuario pida un plan de entrenamiento o nutrición, NO lo redactes entero en el chat: dile que pulse el botón "📋 Generar mi plan"; el plan completo aparece como tarjeta descargable en PDF y se calcula con sus datos.',
    '9. Con temas médicos reales sé prudente: recomienda consultar a un profesional sanitario.'
  ];

  try {
    const [exercises, ingredients, storeItems] = await Promise.all([
      getExercises().catch(() => []),
      getIngredients().catch(() => []),
      getStoreItems().catch(() => [])
    ]);
    if (exercises.length) lines.push('CATÁLOGO DE EJERCICIOS DE LA WEB:', describeCatalog(exercises));
    if (ingredients.length) lines.push(describeIngredients(ingredients));
    if (storeItems.length) lines.push('TIENDA TITAN GYM:', describeStore(storeItems));
  } catch { /* sin datos extra */ }

  if (userData || profileData) {
    const merged = { ...(profileData || {}), ...(userData || {}) };
    const relevant = ['name', 'age', 'sex', 'isMale', 'weight', 'height', 'goal', 'activityLevel', 'trainingLocation', 'followsDiet'];
    const facts = relevant
      .filter(key => merged[key] !== undefined && merged[key] !== null && merged[key] !== '')
      .map(key => `${key}: ${merged[key]}`);
    if (facts.length) lines.push(`DATOS DEL USUARIO${userId ? ` (id ${userId})` : ''} para personalizar: ${facts.join('; ')}.`);
  }

  return lines.join('\n');
}

// ─── Historial de conversación ───────────────────────────────────────────────
function normalizeHistory(messages = []) {
  return messages
    .filter(entry => entry && typeof entry.content === 'string' && entry.content.trim())
    .slice(-12)
    .map(entry => ({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      content: entry.content.trim().slice(0, 2000)
    }));
}

// ─── Proveedores reales ──────────────────────────────────────────────────────
// Si el proveedor falla (sin créditos, clave inválida, timeout...), dejamos de
// llamarlo unos minutos: así el chat responde al instante con el motor local
// en lugar de esperar cada vez a una llamada que va a fallar.
const PROVIDER_PAUSE_MS = 5 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 15000;
const providerPausedUntil = { openai: 0, claude: 0 };

function providerAvailable(name) {
  return Date.now() >= providerPausedUntil[name];
}

function pauseProvider(name, error) {
  providerPausedUntil[name] = Date.now() + PROVIDER_PAUSE_MS;
  console.warn(`Proveedor IA ${name} en pausa ${PROVIDER_PAUSE_MS / 60000} min (se usa el motor local): ${error.message}`);
}

async function callOpenAI(systemPrompt, messages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        max_tokens: 700,
        temperature: 0.6,
        messages: [{ role: 'system', content: systemPrompt }, ...messages]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OpenAI ${response.status}: ${body.slice(0, 200)}`);
    }
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Respuesta vacía de OpenAI');
    return reply;
  } finally {
    clearTimeout(timer);
  }
}

async function callClaude(systemPrompt, messages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-haiku-latest',
        max_tokens: 700,
        system: systemPrompt,
        messages
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Anthropic ${response.status}: ${body.slice(0, 200)}`);
    }
    const data = await response.json();
    const reply = (data.content || []).filter(block => block.type === 'text').map(block => block.text).join('\n').trim();
    if (!reply) throw new Error('Respuesta vacía de Anthropic');
    return reply;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Motor de respaldo (sin API key configurada) ─────────────────────────────
const NORMALIZED_WORD_LIST = [
  'nutricion', 'dieta', 'comida', 'alimento', 'caloria', 'macro', 'proteina', 'carbohidrato', 'grasa', 'vitamina',
  'suplemento', 'creatina', 'whey', 'hidratacion', 'entrenar', 'entreno', 'entrenamiento', 'ejercicio', 'rutina',
  'musculo', 'fuerza', 'cardio', 'estiramiento', 'movilidad', 'descanso', 'serie', 'repeticion', 'hipertrofia',
  'definicion', 'perder', 'ganar', 'tienda', 'producto', 'precio', 'pedido', 'compra', 'plan', 'peso', 'abdomen',
  'brazo', 'pierna', 'pecho', 'espalda', 'hombro', 'gluteo', 'gemelo', 'dominada', 'sentadilla', 'flexion',
  'burpee', 'correr', 'bici', 'natacion', 'yoga', 'calistenia', 'salud', 'kcal', 'cuantos', 'cuantas', 'dame',
  'recomienda', 'recomiendas', 'recomiendame', 'lista', 'cuales', 'que ejercicio', 'que alimento', 'menos', 'mas'
];

function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isOnTopic(message) {
  const text = normalizeText(message);
  return NORMALIZED_WORD_LIST.some(word => text.includes(word));
}

// ─── Selector de grupo muscular ──────────────────────────────────────────────
const MUSCLE_SYNONYMS = [
  { key: 'espalda', words: /(espalda|dorsal|lumbares|trapecio)/ },
  { key: 'pecho', words: /(pecho|pectorales|pectorales|banca)/ },
  { key: 'piernas', words: /(pierna|piernas|cuadriceps|femoral|gluteo|gluteos|sentadilla|zancada)/ },
  { key: 'brazos', words: /(brazo|biceps|triceps|antebrazo|curl)/ },
  { key: 'hombros', words: /(hombro|hombros|deltoides|trapecio)/ },
  { key: 'abdominales', words: /(abdomen|abdominal|abdominales|core|lumbares|oblicuo)/ },
  { key: 'cardio', words: /(cardio|correr|carrera|bici|bicicleta|comba|eliptica|remo)/ },
  { key: 'pantorrillas', words: /(pantorrilla|gemelo|gemelos|twin)/ }
];

function detectMuscleGroups(text) {
  return MUSCLE_SYNONYMS.filter(group => group.words.test(text)).map(group => group.key);
}

function sampleExercises(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// "dame dos ejercicios" -> "dame 2 ejercicios": así entendemos números escritos
const NUMBER_WORDS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 };

function normalizeNumberWords(text) {
  return text.replace(/\b(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b/g, word => String(NUMBER_WORDS[word]));
}

// Redondea los valores nutricionales: 86.800 -> 86.8, 0.000 -> 0
function round1(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 10) / 10;
}

function formatExercise(exercise) {
  const difficulty = { beginner: 'fácil', intermediate: 'medio', advanced: 'avanzado' }[exercise.difficulty] || '';
  const meta = [difficulty, exercise.category].filter(Boolean).join(' · ');
  return JSON.stringify({ type: 'exercise', id: String(exercise.id), name: exercise.name, label: `• **${exercise.name}**${meta ? ` (${meta})` : ''}` });
}

// Envuelve un alimento con sus datos para que el frontend pinte el botón de favoritos
function formatFood(item, criteria = {}) {
  const fiber = round1(item.fiber);
  const parts = [
    `${Math.round(Number(item.energy) || 0)} kcal`,
    `P ${round1(item.protein)} g`,
    `C ${round1(item.carbohydrates)} g`,
    `G ${round1(item.fat)} g`
  ];
  if (criteria.fiberMin != null || fiber > 0) parts.push(`Fib ${fiber} g`);
  const label = `• **${item.name}** — ${parts.join(' · ')}`;
  return JSON.stringify({ type: 'food', id: String(item.id), name: item.name, label });
}

// Descarta fichas con datos imposibles (los macronutrientes por 100 g no pueden
// pasar de 100 g): en la base hay entradas mezcladas que daban respuestas raras.
function isCoherentFood(item) {
  const protein = Number(item.protein) || 0;
  const carbohydrates = Number(item.carbohydrates) || 0;
  const fat = Number(item.fat) || 0;
  const energy = Number(item.energy) || 0;
  if (energy <= 0) return false;
  if (protein + carbohydrates + fat > 105) return false;
  return true;
}

// Convierte los JSON embebidos en marcadores que el frontend sabe renderizar
function withFavoriteMarkers(text) {
  return text.replace(/\{"type":"(exercise|food)"[^}]*\}/g, match => `[[FAV:${match}]]`);
}

// Petición tipo "dame 2 de espalda y 4 de pierna"
function answerExerciseRequest(text, exercises) {
  const groups = detectMuscleGroups(text);
  if (!groups.length) return null;

  // Extraer cantidades: "2 de espalda", "4 pierna", "2 ejercicios de espalda"
  // Re-corremos el número para cada grupo detectado, para evitar "1 de perina y 3 de espalda" → "2 pierna + 2 espalda"
  // (el patrón original cogía el número equivocado si había coincidencia de palabras).
  const numberPattern = /(\d{1,2})\s*(?:ejercicios?\s*)?(?:de\s*|d el\s*|del\s*)?([a-záéíóúñ]+)/g;
  const allMatches = [];
  let match;
  while ((match = numberPattern.exec(text)) !== null) {
    const count = Number.parseInt(match[1], 10);
    const word = match[2];
    if (count >= 1 && count <= 20) allMatches.push({ count, word, index: match.index });
  }
  // Respetamos el orden en que el usuario dice los grupos
  // El patrón puede haber capturado mal el grupo si hubiera palabras solapadas,
  // así que re-corremos el patrón después de cada cantidad para asegurar que el grupo
  // detectado coincide con lo que el usuario dijo (no con un grupo vecino).
  const orderedGroups = groups
    .map(key => ({ key, at: text.search(MUSCLE_SYNONYMS.find(entry => entry.key === key).words) }))
    .sort((first, second) => first.at - second.at)
    .map(entry => entry.key);
  const countByGroup = new Map();
  for (const group of orderedGroups) {
    const groupPattern = MUSCLE_SYNONYMS.find(entry => entry.key === group).words;
    const groupPosition = text.search(groupPattern);
    const bestMatch = allMatches
      .filter(candidate => groupPattern.test(candidate.word))
      .sort((first, second) => Math.abs(first.index - groupPosition) - Math.abs(second.index - groupPosition))[0];
    countByGroup.set(group, bestMatch?.count || 3);
  }

  const pedido = orderedGroups
    .map(group => `${countByGroup.get(group)} de ${group}`)
    .join(' y ');
  const lines = [`Aquí tienes exactamente lo que pides — **${pedido}** 💪 (puedes añadirlos a favoritos con el ❤️):`];
  for (const group of orderedGroups) {
    const count = countByGroup.get(group);
    const pool = exercises.filter(exercise => normalizeText(String(exercise.category || '')).includes(group.slice(0, 6)));
    if (!pool.length) {
      lines.push(`\n**${group[0].toUpperCase() + group.slice(1)}**: no tengo ejercicios de ese grupo en el catálogo ahora mismo.`);
      continue;
    }
    const picked = sampleExercises(pool, Math.min(count, pool.length));
    lines.push(`\n**${group[0].toUpperCase() + group.slice(1)}** (${picked.length}):`);
    lines.push(...picked.map(formatExercise));
  }
  lines.push('\n¿Quieres que te haga una rutina completa con algunos de estos? Pídemelo y te genero el plan descargable 📋.');
  return withFavoriteMarkers(lines.join('\n'));
}

// ─── Consultas de nutrición concretas ───────────────────────────────────────
const FOOD_STOPWORDS = new Set(['alimento', 'alimentos', 'producto', 'productos', 'preparado', 'liquido', 'solido', 'bebida', 'polvo', 'preparar', 'base', 'comida', 'comidas', 'tiene', 'tengan', 'mucho', 'mucha', 'poco', 'poca', 'para']);

// Condiciones múltiples: "20 g de proteína y máximo 500 kcal", "mucha fibra", "menos de 100 kcal"
function parseFoodCriteria(text) {
  const criteria = { proteinMin: null, caloriesMax: null, caloriesMin: null, fiberMin: null, carbMin: null, fatMax: null };

  const proteinMatch = text.match(/(\d{1,3})\s*(?:g|gramos)?\s*(?:de\s*)?(?:proteina|protein)/);
  if (proteinMatch) criteria.proteinMin = Number(proteinMatch[1]);
  else if (/(mas|mucha?s?|ricos?|alto?s?)\s*(en\s*)?(de\s*)?proteina/.test(text)) criteria.proteinMin = 20;

  const fiberMatch = text.match(/(\d{1,2})\s*(?:g|gramos)?\s*(?:de\s*)?fibra/);
  if (fiberMatch) criteria.fiberMin = Number(fiberMatch[1]);
  else if (/(mucha?s?|rica?s?|alto?s?)\s*(en\s*)?(de\s*)?fibra/.test(text)) criteria.fiberMin = 5;

  const carbMatch = text.match(/(\d{1,3})\s*(?:g|gramos)?\s*(?:de\s*)?(carbohidratos?|carbs|hidratos)/);
  if (carbMatch) criteria.carbMin = Number(carbMatch[1]);

  const fatLimit = text.match(/(\d{1,3})\s*(?:g|gramos)?\s*(?:de\s*)?grasa/);
  if (fatLimit && /(?:menos de|maximo|max)/.test(text.slice(Math.max(0, text.indexOf(fatLimit[0]) - 20), text.indexOf(fatLimit[0]) + fatLimit[0].length))) {
    criteria.fatMax = Number(fatLimit[1]);
  }

  const calMatch = text.match(/(\d{2,4})\s*(?:kcal|calorias|caloria)/);
  if (calMatch) {
    const before = text.slice(Math.max(0, text.indexOf(calMatch[0]) - 24), text.indexOf(calMatch[0]));
    if (/(menos de|menos d|maximo|max|bajo|hasta|solo)/.test(before)) criteria.caloriesMax = Number(calMatch[1]);
    else if (/(mas de|minimo|min|al menos|sobre)/.test(before)) criteria.caloriesMin = Number(calMatch[1]);
    // Sin modificador: "dame un alimento de 200 Kcal" → buscamos el más cercano a ese valor
    else criteria.caloriesTarget = Number(calMatch[1]);
  } else if (/(pocas|menos|bajas?|ligero)s?\s*(en\s*)?(calorias|kcal)/.test(text)) {
    criteria.caloriesMax = 120;
  }

  return criteria;
}

function foodMatches(item, criteria) {
  if (criteria.proteinMin != null && (Number(item.protein) || 0) < criteria.proteinMin) return false;
  if (criteria.caloriesMax != null && (Number(item.energy) || 0) > criteria.caloriesMax) return false;
  if (criteria.caloriesMin != null && (Number(item.energy) || 0) < criteria.caloriesMin) return false;
  if (criteria.fiberMin != null && (Number(item.fiber) || 0) < criteria.fiberMin) return false;
  if (criteria.carbMin != null && (Number(item.carbohydrates) || 0) < criteria.carbMin) return false;
  if (criteria.fatMax != null && (Number(item.fat) || 0) > criteria.fatMax) return false;
  if (criteria.caloriesTarget != null && criteria.caloriesMax == null && criteria.caloriesMin == null) {
    const target = criteria.caloriesTarget;
    const diff = Math.abs((Number(item.energy) || 0) - target);
    if (diff > Math.max(10, target * 0.25)) return false;
  }
  return true;
}

// Puntúa lo cerca que está un alimento de cumplir los criterios pedidos
function closeness(item, criteria) {
  let score = 0;
  if (criteria.proteinMin != null) score += (Number(item.protein) || 0) / Math.max(1, criteria.proteinMin);
  if (criteria.caloriesMax != null) score += 1 - (Number(item.energy) || 0) / Math.max(1, criteria.caloriesMax);
  if (criteria.caloriesMin != null) score += (Number(item.energy) || 0) / Math.max(1, criteria.caloriesMin);
  if (criteria.caloriesTarget != null) {
    const target = criteria.caloriesTarget;
    const diff = Math.abs((Number(item.energy) || 0) - target);
    score += 1 / (1 + diff / 100);
  }
  if (criteria.fiberMin != null) score += (Number(item.fiber) || 0) / Math.max(1, criteria.fiberMin);
  if (criteria.carbMin != null) score += (Number(item.carbohydrates) || 0) / Math.max(1, criteria.carbMin);
  if (criteria.fatMax != null) score += 1 - (Number(item.fat) || 0) / Math.max(1, criteria.fatMax);
  return score;
}

// Distancia al valor pedido: preferimos el alimento más parecido a lo que pide
// el usuario (antes salía siempre el extremo de la base de datos).
function distanceToTarget(item, criteria) {
  let distance = 0;
  const value = (key) => Number(item[key]) || 0;
  if (criteria.proteinMin != null) distance += Math.abs(value('protein') - criteria.proteinMin);
  if (criteria.fiberMin != null) distance += Math.abs(value('fiber') - criteria.fiberMin);
  if (criteria.carbMin != null) distance += Math.abs(value('carbohydrates') - criteria.carbMin);
  if (criteria.caloriesTarget != null) distance += Math.abs(value('energy') - criteria.caloriesTarget);
  if (criteria.caloriesMax != null) distance += Math.abs(value('energy') - criteria.caloriesMax);
  if (criteria.caloriesMin != null) distance += Math.abs(value('energy') - criteria.caloriesMin);
  if (criteria.fatMax != null) distance += Math.abs(value('fat') - criteria.fatMax);
  return distance;
}

function describeCriteria(criteria) {
  const bits = [];
  if (criteria.proteinMin != null) bits.push(`al menos ${criteria.proteinMin} g de proteína`);
  if (criteria.caloriesMax != null) bits.push(`máximo ${criteria.caloriesMax} kcal`);
  if (criteria.caloriesMin != null) bits.push(`mínimo ${criteria.caloriesMin} kcal`);
  if (criteria.caloriesTarget != null) bits.push(`aproximadamente ${criteria.caloriesTarget} kcal`);
  if (criteria.fiberMin != null) bits.push(`al menos ${criteria.fiberMin} g de fibra`);
  if (criteria.carbMin != null) bits.push(`al menos ${criteria.carbMin} g de carbohidratos`);
  if (criteria.fatMax != null) bits.push(`máximo ${criteria.fatMax} g de grasa`);
  return bits.join(' y ');
}

// "Aquí tienes un alimento con al menos 10 g de fibra" (más natural que "un alimento al menos...")
function describeCriteriaWithPreposition(criteria) {
  const description = describeCriteria(criteria);
  if (/^aproximadamente/.test(description)) return `de ${description}`;
  return /^(al menos|máximo|mínimo)/.test(description) ? `con ${description}` : description;
}

function answerFoodRequest(text, ingredients) {
  const usable = ingredients.filter(item => isCoherentFood(item));
  if (!usable.length) return null;

  // 0) Rankings sin cantidades: "¿qué alimentos tienen más proteína / fibra / carbohidratos?"
  if (!/\d/.test(text)) {
    const wantsMost = /(mas|mucha?s?|altos?|ricos?|mejores)/.test(text);
    const ranking = wantsMost && [
      { key: 'protein', words: /proteina/, header: 'Los alimentos con más proteína de la base de datos 🥩' },
      { key: 'fiber', words: /fibra/, header: 'Los alimentos con más fibra de la base de datos 🌾' },
      { key: 'carbohydrates', words: /(carbohidratos?|carbs|hidratos)/, header: 'Los alimentos con más carbohidratos de la base de datos 🍞' }
    ].find(entry => entry.words.test(text));
    if (ranking) {
      const top = [...usable]
        .sort((a, b) => (Number(b[ranking.key]) || 0) - (Number(a[ranking.key]) || 0))
        .slice(0, 6);
      return withFavoriteMarkers(`${ranking.header} (valores por 100 g):\n\n${top.map(item => formatFood(item)).join('\n')}`);
    }
  }

  // 1) Condiciones múltiples: "un alimento con 20 g de proteína y máximo 500 kcal"
  const criteria = parseFoodCriteria(text);
  const hasCriteria = criteria.proteinMin != null || criteria.caloriesMax != null || criteria.caloriesMin != null || criteria.caloriesTarget != null || criteria.fiberMin != null || criteria.carbMin != null || criteria.fatMax != null;

  if (hasCriteria) {
    // ¿Cuántos pide? "6 alimentos", "dame 3"
    const countMatch = text.match(/(?:dame|busca|encuentra|quiero|muestra)\s+(\d{1,2})|(\d{1,2})\s+alimentos?|(\d{1,2})\s+opciones/);
    const count = Math.min(10, Math.max(1, Number(countMatch?.[1] || countMatch?.[2] || countMatch?.[3]) || 1));
    // Ordenados por cercanía a lo pedido y con variedad entre los mejores
    const matches = usable
      .filter(item => foodMatches(item, criteria))
      .sort((a, b) => distanceToTarget(a, criteria) - distanceToTarget(b, criteria));
    const band = matches.slice(0, Math.max(count * 2, Math.min(matches.length, 6)));
    const picked = [...band].sort(() => Math.random() - 0.5).slice(0, count);
    if (picked.length) {
      const description = describeCriteriaWithPreposition(criteria);
      const header = picked.length === 1
        ? `Aquí tienes un alimento ${description}. Los valores son por 100 g 🎯 — añádelo a favoritos con el ❤️:\n\n`
        : `Aquí tienes ${picked.length} alimentos ${description}. Los valores son por 100 g 🎯 — añádelos a favoritos con el ❤️:\n\n`;
      return withFavoriteMarkers(header + picked.map(item => formatFood(item, criteria)).join('\n'));
    }
    // Nada cumple todo el filtro: damos los más cercanos en vez de dejar al usuario sin respuesta
    const description = describeCriteriaWithPreposition(criteria);
    const closest = [...usable]
      .sort((a, b) => closeness(b, criteria) - closeness(a, criteria))
      .slice(0, Math.max(count, 3));
    return withFavoriteMarkers(
      `No hay ningún alimento ${description} en la base de datos, pero estos son los más cercanos 👇 (valores por 100 g) — añádelos a favoritos con el ❤️:\n\n${closest.map(item => formatFood(item, criteria)).join('\n')}`
    );
  }

  // 2) Top por proteína: "¿qué alimentos tienen más proteína?"
  if (/(mas|mucha?s?|ricos?|alto?s?)\s*(en\s*)?(de\s*)?proteina/.test(text)) {
    const top = [...usable].sort((a, b) => (b.protein || 0) - (a.protein || 0)).slice(0, 6);
    return withFavoriteMarkers(`Los alimentos con más proteína de la base de datos 🥩 (valores por 100 g):\n\n${top.map(formatFood).join('\n')}`);
  }

  // 3) Alimento concreto: "cuántas calorías tiene el pollo" / "info del arroz" / solo "pollo"
  // (si mencionan un alimento, aunque no digan la palabra nutrición, es pregunta de nutrición)
  const mentionsFood = !/(plan|rutina|entrenamiento)/.test(text);
  const cleanText = text.replace(/\d+/g, ' ').replace(/\s+/g, ' ');
  const specific = mentionsFood ? usable.find(item => {
    const words = normalizeText(item.name).split(/\s+/)
      .filter(word => word.length >= 4 && !FOOD_STOPWORDS.has(word));
    return words.some(word => cleanText.includes(word));
  }) : null;
  if (specific) {
    const fiber = Number(specific.fiber) > 0 ? ` · 🌾 ${round1(specific.fiber)} g fibra` : '';
    const header = `**${specific.name}** (valores por 100 g): 🔥 ${Math.round(Number(specific.energy) || 0)} kcal · 🥩 ${round1(specific.protein)} g proteína · 🍞 ${round1(specific.carbohydrates)} g carbs · 🥑 ${round1(specific.fat)} g grasa${fiber}.\n\n`;
    return withFavoriteMarkers(header + formatFood(specific));
  }

  return null;
}

function buildFallbackReply({ message, exercises = [], storeItems = [], ingredients = [] }) {
  // "dame dos de pierna" -> "dame 2 de pierna" (también números escritos con letras)
  const text = normalizeNumberWords(normalizeText(message));

  // Cortesía básica en modo sin API key (siempre antes del filtro de tema)
  // (solo si el mensaje es un agradecimiento/despedida suelto, no una pregunta con "gracias delante")
  const shortMessage = text.split(/\s+/).filter(Boolean).length <= 4;
  if (shortMessage && /(gracias|thank)/.test(text)) {
    return '¡De nada! 💪 Estoy aquí para lo que necesites: ejercicios, alimentos, nutrición o la tienda. ¿Seguimos?';
  }
  if (shortMessage && /(adios|hasta luego|nos vemos|bye|chao)/.test(text)) {
    return '¡Un placer ayudarte! 💪 Aquí estaré cuando quieras seguir entrenando o ajustando tu dieta. ¡A por todas!';
  }
  if (/^(hola|buenas|hey|hello|hi|buenos dias|buenas tardes|buenas noches|que tal)\b/.test(text) || /(como estas|que puedes hacer|quien eres)/.test(text)) {
    return '¡Hola! 👋 Soy TITAN, tu entrenador y nutricionista virtual. Puedo ayudarte con nutrición, ejercicios y la tienda TITAN GYM, y también puedo crearte tu plan personalizado (pulsa "📋 Generar mi plan"). ¿Qué quieres saber?';
  }

  // Consultas concretas de alimentos (van primero: un alimento suelto ya es nutrición)
  const foodAnswer = answerFoodRequest(text, ingredients);
  if (foodAnswer) return foodAnswer;

  // Consultas concretas de ejercicios ("dame 2 de espalda y 4 de pierna")
  const exerciseAnswer = answerExerciseRequest(text, exercises);
  if (exerciseAnswer) return exerciseAnswer;

  if (!isOnTopic(message)) return TOPIC_BOUNCE;

  const parts = [];

  if (/(tienda|producto|precio|comprar|compra|pedido)/.test(text) && storeItems.length) {
    const featured = storeItems.filter(item => item.isAvailable !== false).slice(0, 5);
    parts.push(`En la tienda TITAN GYM tienes: ${featured.map(item => `${item.name} (${Number(item.price).toFixed(2)} €)`).join(', ')}. Abre la sección Tienda para verlos todos.`);
  }
  if (!parts.length) {
    parts.push('Puedo darte ejercicios por grupo muscular ("dame 2 de espalda y 4 de pierna"), alimentos por calorías o proteína ("alimentos con menos de 100 kcal", "¿qué tiene más proteína?"), info de la tienda y tu plan completo 📋.');
  }

  return parts.join('\n\n');
}

function buildExactCatalogReply(message, { exercises, ingredients }) {
  const text = normalizeNumberWords(normalizeText(message));
  return answerFoodRequest(text, ingredients) || answerExerciseRequest(text, exercises);
}

// ─── API pública ─────────────────────────────────────────────────────────────
export async function generateChatReply({ message, history = [], userId = null, profileData = null, userData = null }) {
  const conversation = normalizeHistory([...history, { role: 'user', content: message }]);

  // Las consultas con filtros o nombres concretos deben salir del catálogo,
  // no de la memoria probabilística del proveedor. Así "100 kcal" o "espalda"
  // siempre devuelve datos existentes y sus valores reales.
  let catalogData = null;
  try {
    const [exercises, ingredients] = await Promise.all([
      getExercises().catch(() => []),
      getIngredients().catch(() => [])
    ]);
    catalogData = { exercises, ingredients };
    const exactReply = buildExactCatalogReply(message, catalogData);
    if (exactReply) return { reply: exactReply, provider: 'catalog' };
  } catch (error) {
    console.error(`No se pudo consultar el catálogo para la IA: ${error.message}`);
  }

  const systemPrompt = await buildSystemContext({ userId, profileData, userData });
  let reply = null;
  let provider = 'fallback';

  if (process.env.OPENAI_API_KEY && providerAvailable('openai')) {
    try {
      reply = await callOpenAI(systemPrompt, conversation);
      provider = 'openai';
    } catch (error) {
      console.error(`IA OpenAI falló: ${error.message}`);
      pauseProvider('openai', error);
    }
  }

  if (!reply && process.env.ANTHROPIC_API_KEY && providerAvailable('claude')) {
    try {
      reply = await callClaude(systemPrompt, conversation);
      provider = 'claude';
    } catch (error) {
      console.error(`IA Claude falló: ${error.message}`);
      pauseProvider('claude', error);
    }
  }

  if (!reply) {
    try {
      const [exercises, ingredients, storeItems] = await Promise.all([
        catalogData?.exercises || getExercises().catch(() => []),
        catalogData?.ingredients || getIngredients().catch(() => []),
        getStoreItems().catch(() => [])
      ]);
      reply = buildFallbackReply({ message, exercises, ingredients, storeItems });
    } catch {
      reply = TOPIC_BOUNCE;
    }
  }

  return { reply, provider };
}

export { MAX_HISTORY };
