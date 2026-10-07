// Generador de planes: entrenamiento, nutrición y recomendaciones cruzadas.
// Combina perfil del usuario + catálogo de ejercicios + base de nutrición para
// producir planes completos, con progreso estimado y recomendación cruzada
// (nutrición ↔ entrenamiento) que el usuario puede aceptar desde el chat.

const ACTIVITY_FACTORS = { low: 1.2, medium: 1.55, high: 1.725 };
const GOAL_DELTA = { lose: -300, maintain: 0, gain: 250 };
const MEAL_SPLIT = [
  { time: 'Desayuno', share: 0.25 },
  { time: 'Almuerzo', share: 0.35 },
  { time: 'Cena', share: 0.3 },
  { time: 'Snack', share: 0.1 }
];

const FOCUS_CYCLE = ['Empuje (pecho/hombro/tríceps)', 'Tirón (espalda/bíceps)', 'Pierna (cuádriceps/glúteo)', 'Cardio + core'];
const FALLBACK_EXERCISES = {
  'Empuje (pecho/hombro/tríceps)': ['Press de banca', 'Flexiones', 'Press militar', 'Fondos en paralelas'],
  'Tirón (espalda/bíceps)': ['Dominadas', 'Remo con barra', 'Jalón al pecho', 'Curl de bíceps'],
  'Pierna (cuádriceps/glúteo)': ['Sentadillas', 'Peso muerto rumano', 'Zancadas', 'Elevación de gemelos'],
  'Cardio + core': ['Burpees', 'Abdominales', 'Carrera suave', 'Plancha']
};

function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function toNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeGoal(goal) {
  const text = normalizeText(goal);
  if (/(perder|grasa|adelgaz|bajar)/.test(text)) return 'lose';
  if (/(ganar|musculo|masa|volumen)/.test(text)) return 'gain';
  return 'maintain';
}

export function normalizeActivity(activity) {
  const text = normalizeText(activity);
  if (/^(1\.2|low|baja)/.test(text)) return 'low';
  if (/^(1\.7|high|alta)/.test(text)) return 'high';
  return 'medium';
}

export function normalizeSex(sex) {
  const text = normalizeText(sex);
  if (text === 'male' || text === 'hombre' || text === 'true' || text === 'm') return 'male';
  if (text === 'female' || text === 'mujer' || text === 'false' || text === 'f') return 'female';
  return 'male';
}

// Mifflin-St Jeor
export function calculateBmr({ weight, height, age, sex }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

function pickByWords(items, words, key = 'name') {
  const pattern = new RegExp(words, 'i');
  return items.filter(item => pattern.test(normalizeText(item[key])));
}

// ─── Plan de NUTRICIÓN ───────────────────────────────────────────────────────
export async function buildNutritionPlan({ input, getIngredients }) {
  const weight = toNumber(input.weight, 70);
  const height = toNumber(input.height, 175);
  const age = toNumber(input.age, 25);
  const sex = normalizeSex(input.sex);
  const goal = normalizeGoal(input.goal);
  const activity = normalizeActivity(input.activity);

  const bmr = calculateBmr({ weight, height, age, sex });
  const tdee = Math.round(bmr * (ACTIVITY_FACTORS[activity] || ACTIVITY_FACTORS.medium));
  const calories = Math.max(1200, tdee + GOAL_DELTA[goal]);
  const macros = {
    protein: Math.round(weight * 2),
    carbs: Math.round((calories * 0.45) / 4),
    fat: Math.round((calories * 0.25) / 9)
  };

  const meals = MEAL_SPLIT.map(({ time, share }) => ({ time, calories: Math.round(calories * share) }));

  // Progreso estimado: la dieta aplicada al gasto total
  const dailyDelta = calories - tdee;
  const weeklyChangeKg = (dailyDelta * 7) / 7700;
  const progress = {
    tdee,
    dailyDelta,
    weeklyChangeKg: Number(weeklyChangeKg.toFixed(2)),
    monthChangeKg: Number((weeklyChangeKg * 4.3).toFixed(1)),
    verdict: goal === 'lose'
      ? (dailyDelta < -150 ? 'Vas bien: déficit suficiente para perder grasa de forma saludable.' : 'Déficit bajo: si no bajas, sube la actividad o reduce unas 100 kcal más.')
      : goal === 'gain'
        ? (dailyDelta > 150 ? 'Vas bien: superávit controlado para ganar músculo sin exceso de grasa.' : 'Superávit bajo: añade unas 100 kcal si no ganas peso.')
        : (Math.abs(dailyDelta) <= 150 ? 'Vas bien: calorías muy cerca de tu gasto, mantendrás el peso.' : 'Calorías lejos de tu gasto: ajusta para mantener el peso.'),
    targetWeightKg: null
  };
  if (goal === 'lose' && weeklyChangeKg < 0 && toNumber(input.targetWeight) && toNumber(input.targetWeight) < weight) {
    progress.targetWeightKg = toNumber(input.targetWeight);
    progress.weeksToTarget = Math.ceil((weight - progress.targetWeightKg) / Math.abs(weeklyChangeKg || 0.25));
  }

  // Dieta cuantificada con los alimentos de la base de datos
  const ingredients = (await getIngredients().catch(() => [])) || [];
  const suggestedFoods = [];
  let foodTotals = null;
  if (ingredients.length) {
    const blocked = String(input.dietaryRestrictions || '').toLowerCase();
    const usable = ingredients.filter(item => {
      const name = normalizeText(item.name);
      if (!Number(item.energy) || Number(item.energy) <= 0) return false;
      if (/(caramelo|chocolate|galleta|dulce|refresco|azucar|pastel|donut|helado|golosina)/.test(name)) return false;
      if (blocked.includes('vegan') && /(pollo|huevo|leche|yogur|salmon|carne|pescado|atun|queso)/.test(name)) return false;
      if (blocked.includes('vegetarian') && /(pollo|salmon|carne|pescado|atun)/.test(name)) return false;
      if (blocked.includes('lactose') && /(leche|yogur|queso)/.test(name)) return false;
      if (blocked.includes('gluten') && /(pan|pasta|trigo)/.test(name)) return false;
      return true;
    });
    const pools = {
      protein: pickByWords(usable, 'pollo|pavo|atun|salmon|pescado|carne|ternera|huevo|tofu|lenteja|garbanzo|yogur|queso|whey|proteina'),
      carbs: pickByWords(usable, 'arroz|avena|pasta|patata|papa|pan|quinoa|maiz|tortilla|cereal|cuscus|boniato|batata'),
      fat: pickByWords(usable, 'aceite|aguacate|almendra|nuez|cacahuete|pistacho|semilla|chia|oliva|mantequilla'),
      produce: pickByWords(usable, 'brocoli|espinaca|lechuga|tomate|zanahoria|pepino|calabacin|pimiento|manzana|platano|naranja|fresa|fruta|verdura')
    };
    for (const key of Object.keys(pools)) {
      if (!pools[key].length) pools[key] = usable;
    }
    const at = (pool, index) => pool[index % pool.length] || usable[index % Math.max(usable.length, 1)];

    const baseFoods = [
      { meal: 'Desayuno', item: at(pools.carbs, 0), grams: 80, max: 350 },
      { meal: 'Desayuno', item: at(pools.protein, 0), grams: 120, max: 400 },
      { meal: 'Desayuno', item: at(pools.produce, 0), grams: 100, max: 300 },
      { meal: 'Almuerzo', item: at(pools.protein, 1), grams: 160, max: 400 },
      { meal: 'Almuerzo', item: at(pools.carbs, 1), grams: 120, max: 350 },
      { meal: 'Almuerzo', item: at(pools.produce, 1), grams: 150, max: 300 },
      { meal: 'Almuerzo', item: at(pools.fat, 0), grams: 10, max: 80 },
      { meal: 'Cena', item: at(pools.protein, 2), grams: 160, max: 400 },
      { meal: 'Cena', item: at(pools.carbs, 0), grams: 100, max: 350 },
      { meal: 'Cena', item: at(pools.produce, 0), grams: 150, max: 300 },
      { meal: 'Cena', item: at(pools.fat, 1), grams: 10, max: 80 },
      { meal: 'Snack', item: at(pools.protein, 3), grams: 100, max: 300 },
      { meal: 'Snack', item: at(pools.produce, 1), grams: 100, max: 300 }
    ];

    if (usable.length) {
      const totals = list => list.reduce((sum, entry) => {
        const portion = entry.grams / 100;
        return {
          calories: sum.calories + (Number(entry.item.energy) || 0) * portion,
          protein: sum.protein + (Number(entry.item.protein) || 0) * portion,
          carbohydrates: sum.carbohydrates + (Number(entry.item.carbohydrates) || 0) * portion,
          fat: sum.fat + (Number(entry.item.fat) || 0) * portion
        };
      }, { calories: 0, protein: 0, carbohydrates: 0, fat: 0 });
      const score = list => {
        const current = totals(list);
        return ['calories', 'protein', 'carbohydrates', 'fat'].reduce((total, key) => {
          const desired = Math.max(key === 'calories' ? calories : macros[key === 'carbohydrates' ? 'carbs' : key], 1);
          return total + Math.pow((current[key] - desired) / desired, 2);
        }, 0);
      };
      const adjusted = baseFoods.map(entry => ({ ...entry }));
      const calorieFactor = Math.max(0.6, Math.min(2.5, calories / Math.max(totals(adjusted).calories, 1)));
      adjusted.forEach(entry => {
        entry.grams = Math.max(5, Math.min(entry.max, Math.round(entry.grams * calorieFactor / 5) * 5));
      });
      for (let iteration = 0; iteration < 300; iteration += 1) {
        let improved = false;
        for (const entry of adjusted) {
          const original = entry.grams;
          let bestGrams = original;
          let bestScore = score(adjusted);
          for (const change of [-20, -10, 10, 20]) {
            entry.grams = Math.max(5, Math.min(entry.max, original + change));
            if (score(adjusted) < bestScore) { bestScore = score(adjusted); bestGrams = entry.grams; }
          }
          entry.grams = bestGrams;
          if (bestGrams !== original) improved = true;
        }
        if (!improved) break;
      }
      const resultTotals = totals(adjusted);
      for (const entry of adjusted) {
        const portion = entry.grams / 100;
        suggestedFoods.push({
          meal: entry.meal,
          id: entry.item.id,
          name: entry.item.name,
          brand: entry.item.brand || null,
          grams: entry.grams,
          calories: Math.round((Number(entry.item.energy) || 0) * portion),
          protein: Number(((Number(entry.item.protein) || 0) * portion).toFixed(1)),
          carbohydrates: Number(((Number(entry.item.carbohydrates) || 0) * portion).toFixed(1)),
          fat: Number(((Number(entry.item.fat) || 0) * portion).toFixed(1))
        });
      }
      foodTotals = Object.fromEntries(Object.entries(resultTotals).map(([key, value]) => [key, Math.round(value)]));
    }
  }

  return {
    type: 'nutrition',
    name: input.name || 'Cliente',
    bmr,
    tdee,
    calories,
    macros,
    meals,
    suggestedFoods,
    foodTotals,
    progress,
    restrictions: input.restrictions || ''
  };
}

// ─── Plan de ENTRENAMIENTO ───────────────────────────────────────────────────
export async function buildTrainingPlan({ input, getExercises }) {
  const days = Math.max(1, Math.min(7, toNumber(input.days, 4)));
  const level = input.level || 'Intermedio';
  const goal = normalizeGoal(input.goal);

  const exercises = (await getExercises().catch(() => [])) || [];
  const byCategory = new Map();
  for (const exercise of exercises) {
    const category = String(exercise.category || 'general');
    if (!byCategory.has(category)) byCategory.set(category, []);
    if (byCategory.get(category).length < 20) byCategory.get(category).push(exercise.name);
  }
  const focusMap = [
    { focus: FOCUS_CYCLE[0], words: 'pecho|hombro|triceps|press|flexion|banca|fondo' },
    { focus: FOCUS_CYCLE[1], words: 'espalda|biceps|remo|dominada|jalon|tirón|tiron' },
    { focus: FOCUS_CYCLE[2], words: 'pierna|sentadilla|zancada|gemelo|cuadricep|gluteo|peso muerto' },
    { focus: FOCUS_CYCLE[3], words: 'cardio|abdominal|core|burpee|plancha|correr|comba|bici' }
  ];

  const sets = level === 'Principiante' ? 3 : level === 'Avanzado' ? 4 : 4;
  const reps = level === 'Avanzado' ? '8-10' : '10-12';
  const rest = level === 'Principiante' ? '90 segundos' : '60-90 segundos';

  const schedule = Array.from({ length: days }, (_, index) => {
    const cycle = focusMap[index % focusMap.length];
    let names = [];
    for (const [category, categoryNames] of byCategory.entries()) {
      const matches = categoryNames.filter(name => new RegExp(cycle.words, 'i').test(normalizeText(name)));
      if (matches.length) { names = matches; break; }
    }
    if (names.length < 4) {
      const extra = [...byCategory.get(cycle.focus.split(' ')[0].toLowerCase()) || []];
      names = [...new Set([...names, ...extra])].slice(0, 4);
    }
    if (names.length < 4) names = FALLBACK_EXERCISES[cycle.focus];
    return {
      day: `Día ${index + 1}`,
      focus: cycle.focus,
      exercises: names.slice(0, 5),
      sets,
      reps: goal === 'gain' ? reps : goal === 'lose' ? '12-15' : reps,
      rest,
      minutes: 45 + (level === 'Avanzado' ? 15 : 0)
    };
  });

  // Progreso estimado del entrenamiento
  const weeklyMinutes = schedule.reduce((sum, day) => sum + day.minutes, 0);
  const weeklyCalories = Math.round(weeklyMinutes * 7 * (goal === 'lose' ? 9 : 7));
  const progress = {
    weeklyMinutes,
    weeklyCalories,
    weeklyChangeKg: Number(((weeklyCalories * (goal === 'lose' ? 1 : 0.4)) / 7700 * (goal === 'lose' ? -1 : 1) * 0.35).toFixed(2)),
    verdict: goal === 'lose'
      ? 'Con este volumen y la nutrición adecuada, puedes perder entre 0,3 y 0,7 kg de grasa por semana.'
      : goal === 'gain'
        ? 'Con este volumen y superávit proteico, puedes ganar 0,2-0,4 kg de músculo al mes como principiante-intermedio.'
        : 'Mantén 3-5 sesiones semanales para conservar fuerza y salud.',
    strengthGainPct: level === 'Principiante' ? '8-12% de fuerza al mes' : level === 'Avanzado' ? '2-3% de fuerza al mes' : '4-6% de fuerza al mes'
  };

  return {
    type: 'training',
    name: input.name || 'Cliente',
    goal: input.goal || 'Mantener peso',
    level,
    schedule,
    progress
  };
}

// ─── Recomendación cruzada ───────────────────────────────────────────────────
// nutrition: recomienda un plan de entrenamiento | training: recomienda nutrición
export function buildCrossRecommendation(plan) {
  if (plan?.type === 'nutrition') {
    const needsCardio = plan.progress?.dailyDelta < 0;
    return {
      kind: 'training',
      reason: needsCardio
        ? 'Para acelerar la pérdida de grasa y conservar músculo, te recomiendo combinar esta dieta con un plan de entrenamiento con cardio + fuerza.'
        : 'Para aprovechar mejor esta nutrición, te recomiendo un plan de entrenamiento adaptado a tu nivel y días disponibles.'
    };
  }
  if (plan?.type === 'training') {
    return {
      kind: 'nutrition',
      reason: 'Un plan de nutrición con tus calorías y macros (según metabolismo y actividad) multiplicará los resultados de este entrenamiento.'
    };
  }
  return null;
}
