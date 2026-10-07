// Acceso a datos compartido: catálogo de ejercicios, ingredientes y tienda.
// Lee de Firestore cuando está configurado y cae a datos locales si no.

import { db as firestoreDb } from '../config/firebase.js';

const localExercises = [
  { id: 1, name: 'Flexiones', category: 'Pecho', difficulty: 'beginner', description: 'Ejercicio clásico de peso corporal', duration: 15, calories: 5, image: 'https://via.placeholder.com/200?text=Flexiones', instructions: ['Posición de tabla', 'Baja el cuerpo', 'Sube nuevamente'] },
  { id: 2, name: 'Sentadillas', category: 'Piernas', difficulty: 'intermediate', description: 'Fortalece piernas y glúteos', duration: 20, calories: 8, image: 'https://via.placeholder.com/200?text=Sentadillas', instructions: ['Pies al ancho de hombros', 'Baja las caderas', 'Vuelve a la posición'] },
  { id: 3, name: 'Abdominales', category: 'Abdominales', difficulty: 'beginner', description: 'Ejercicio para el core', duration: 10, calories: 3, image: 'https://via.placeholder.com/200?text=Abdominales', instructions: ['Acuéstate boca arriba', 'Contrae el abdomen', 'Sube lentamente'] },
  { id: 4, name: 'Dominadas', category: 'Espalda', difficulty: 'advanced', description: 'Ejercicio de fuerza extrema', duration: 30, calories: 12, image: 'https://via.placeholder.com/200?text=Dominadas', instructions: ['Agarra la barra', 'Sube el cuerpo', 'Baja controladamente'] },
  { id: 5, name: 'Remo con barra', category: 'Espalda', difficulty: 'intermediate', description: 'Ejercicio de espalda con barra', duration: 25, calories: 9, image: 'https://via.placeholder.com/200?text=Remo%20con%20barra', instructions: ['Inclina el torso', 'Tira de la barra hacia el abdomen', 'Baja controladamente'] },
  { id: 6, name: 'Burpees', category: 'Cardio', difficulty: 'intermediate', description: 'Cardio de alta intensidad', duration: 25, calories: 10, image: 'https://via.placeholder.com/200?text=Burpees', instructions: ['De pie', 'Agacharse', 'Saltar'] },
  { id: 7, name: 'Press militar', category: 'Hombros', difficulty: 'intermediate', description: 'Fuerza de hombros con barra', duration: 20, calories: 8, image: 'https://via.placeholder.com/200?text=Press%20militar', instructions: ['Barra a la altura del pecho', 'Empuja hacia arriba', 'Baja controladamente'] },
  { id: 8, name: 'Curl de bíceps', category: 'Brazos', difficulty: 'beginner', description: 'Fuerza de bíceps con mancuernas', duration: 15, calories: 5, image: 'https://via.placeholder.com/200?text=Curl%20biceps', instructions: ['Mancuernas a los lados', 'Sube flexionando el codo', 'Baja lentamente'] },
  { id: 9, name: 'Zancadas', category: 'Piernas', difficulty: 'beginner', description: 'Fortalece cuádriceps y glúteos', duration: 20, calories: 8, image: 'https://via.placeholder.com/200?text=Zancadas', instructions: ['Paso adelante', 'Baja la rodilla', 'Vuelve a la posición'] },
  { id: 10, name: 'Fondos en paralelas', category: 'Pecho', difficulty: 'advanced', description: 'Fuerza de pecho y tríceps', duration: 20, calories: 9, image: 'https://via.placeholder.com/200?text=Fondos', instructions: ['Sujétate en las barras', 'Baja flexionando los codos', 'Sube empujando'] },
  { id: 11, name: 'Plancha', category: 'Abdominales', difficulty: 'beginner', description: 'Core y estabilidad', duration: 10, calories: 4, image: 'https://via.placeholder.com/200?text=Plancha', instructions: ['Posición de tabla', 'Aguanta con el abdomen contraído', 'Respira'] },
  { id: 12, name: 'Elevación de gemelos', category: 'Pantorrillas', difficulty: 'beginner', description: 'Fortalece las pantorrillas', duration: 10, calories: 3, image: 'https://via.placeholder.com/200?text=Gemelos', instructions: ['Puntas de los pies', 'Sube y baja', 'Controla el movimiento'] },
  { id: 13, name: 'Trotar', category: 'Cardio', difficulty: 'beginner', description: 'Cardio de bajo impacto', duration: 30, calories: 15, image: 'https://via.placeholder.com/200?text=Trotar', instructions: ['Comienza lentamente', 'Mantén el ritmo', 'Respira regularmente'] },
  { id: 14, name: 'Yoga', category: 'Flexibilidad', difficulty: 'beginner', description: 'Mejora flexibilidad y equilibrio', duration: 45, calories: 5, image: 'https://via.placeholder.com/200?text=Yoga', instructions: ['Posiciones básicas', 'Respiración profunda', 'Relajación'] },
  { id: 15, name: 'Estiramientos', category: 'Flexibilidad', difficulty: 'beginner', description: 'Mejora el rango de movimiento', duration: 15, calories: 2, image: 'https://via.placeholder.com/200?text=Estiramientos', instructions: ['Mantén cada estiramiento', '20-30 segundos', 'Sin rebotes'] }
];

const localIngredients = [
  { id: 1, name: 'Pollo pechuga', brand: 'Mercado', energy: 165, protein: 31, carbohydrates: 0, fat: 3.6, fiber: 0, sodium: 74, image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400', source_name: 'Datos locales' },
  { id: 2, name: 'Arroz blanco', brand: 'Dosal', energy: 130, protein: 2.7, carbohydrates: 28, fat: 0.3, fiber: 0.4, sodium: 1, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', source_name: 'Datos locales' },
  { id: 3, name: 'Huevos', brand: 'Granja', energy: 155, protein: 13, carbohydrates: 1.1, fat: 11, fiber: 0, sodium: 124, image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400', source_name: 'Datos locales' },
  { id: 4, name: 'Aguacate', brand: 'Natural', energy: 160, protein: 2, carbohydrates: 8.5, fat: 15, fiber: 6.7, sodium: 7, image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400', source_name: 'Datos locales' },
  { id: 5, name: 'Salmón', brand: 'Mar', energy: 208, protein: 20, carbohydrates: 0, fat: 13, fiber: 0, sodium: 59, image: 'https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=400', source_name: 'Datos locales' },
  { id: 6, name: 'Plátano', brand: 'Frutería', energy: 89, protein: 1.1, carbohydrates: 23, fat: 0.3, fiber: 2.6, sodium: 1, image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', source_name: 'Datos locales' },
  { id: 7, name: 'Leche descremada', brand: 'Lácteos', energy: 34, protein: 3.4, carbohydrates: 5, fat: 0.1, fiber: 0, sodium: 38, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', source_name: 'Datos locales' },
  { id: 8, name: 'Pan integral', brand: 'Panadería', energy: 247, protein: 13, carbohydrates: 41, fat: 3.4, fiber: 7, sodium: 400, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', source_name: 'Datos locales' },
  { id: 9, name: 'Brócoli', brand: 'Verdulería', energy: 34, protein: 2.8, carbohydrates: 7, fat: 0.4, fiber: 2.6, sodium: 33, image: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400', source_name: 'Datos locales' },
  { id: 10, name: 'Yogur natural', brand: 'Lácteos', energy: 59, protein: 10, carbohydrates: 3.6, fat: 0.7, fiber: 0, sodium: 46, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', source_name: 'Datos locales' },
  { id: 11, name: 'Manzana', brand: 'Frutería', energy: 52, protein: 0.3, carbohydrates: 14, fat: 0.2, fiber: 2.4, sodium: 1, image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400', source_name: 'Datos locales' },
  { id: 12, name: 'Pasta', brand: 'Dosal', energy: 131, protein: 5, carbohydrates: 25, fat: 1.1, fiber: 1.8, sodium: 6, image: 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=400', source_name: 'Datos locales' }
];

export const categoryNames = {
  8: 'Brazos',
  9: 'Piernas',
  10: 'Abdominales',
  11: 'Pecho',
  12: 'Espalda',
  13: 'Hombros',
  14: 'Pantorrillas',
  15: 'Cardio'
};

export const categoryIcons = {
  Brazos: '💪',
  Espalda: '🔩',
  Abdominales: '⚡',
  Hombros: '🏋️',
  Pantorrillas: '🦵',
  Pecho: '🏋️',
  Piernas: '🚴',
  Cardio: '🏃'
};

let exercisesCache = null;
let exercisesCacheTime = 0;
let exercisesLoadPromise = null;
let ingredientsCache = null;
let ingredientsCacheTime = 0;
let ingredientsLoadPromise = null;
let storeItemsCache = null;
let storeItemsCacheTime = 0;
let storeItemsLoadPromise = null;
const EXERCISES_CACHE_TTL = 5 * 60 * 1000;
const INGREDIENTS_CACHE_TTL = 10 * 60 * 1000;
const STORE_ITEMS_CACHE_TTL = 5 * 60 * 1000;

// Cuando Firestore falla (cuota agotada, red...) el SDK reintenta durante
// decenas de segundos y bloquea las respuestas del asistente. Si eso pasa,
// pausamos Firestore unos minutos y usamos los datos locales al instante.
const FIRESTORE_PAUSE_MS = 3 * 60 * 1000;
const FIRESTORE_TIMEOUT_MS = 2500;   // lecturas pequeñas y opcionales (perfil, usuario)
const FIRESTORE_SLOW_MS = 3000;      // cuánto esperamos antes de responder con datos locales
let firestorePausedUntil = 0;

export function isFirestorePaused() {
  return Date.now() < firestorePausedUntil;
}

function pauseFirestore(reason) {
  firestorePausedUntil = Date.now() + FIRESTORE_PAUSE_MS;
  console.warn(`Firestore en pausa ${FIRESTORE_PAUSE_MS / 60000} min (se usan datos locales): ${reason}`);
}

// Solo merece la pena pausar Firestore si el fallo es real (cuota, permisos,
// API desactivada). Una descarga grande y lenta no es un fallo.
function pauseFirestoreIfBroken(error) {
  const message = String(error?.message || '');
  if (!/RESOURCE_EXHAUSTED|Quota exceeded|PERMISSION_DENIED|UNAVAILABLE|NOT_FOUND|has not been used|no está configurado/i.test(message)) return;
  pauseFirestore(message);
}

// Ejecuta una lectura de Firestore con límite de tiempo; devuelve `fallback`
// (y pausa Firestore) si falla o tarda demasiado.
export async function firestoreRead(operation, fallback = null, { timeoutMs = FIRESTORE_TIMEOUT_MS, pauseOnTimeout = true } = {}) {
  if (!firestoreDb || isFirestorePaused()) return fallback;
  let timer;
  try {
    return await Promise.race([
      operation(),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Firestore tardó demasiado')), timeoutMs);
      })
    ]);
  } catch (error) {
    const timedOut = /tardó demasiado/.test(String(error?.message || ''));
    if (timedOut && !pauseOnTimeout) console.warn('Firestore va lento: seguimos con los datos disponibles');
    else pauseFirestore(error.message);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

// Responde ya con lo que tengamos mientras la descarga sigue en segundo plano
// (la caché se rellena sola y la siguiente petición usa los datos reales).
async function withSlowFallback(promise, fallback) {
  let timer;
  const slow = new Promise(resolve => { timer = setTimeout(() => resolve(null), FIRESTORE_SLOW_MS); });
  try {
    const result = await Promise.race([promise.catch(() => null), slow]);
    return result || fallback();
  } finally {
    clearTimeout(timer);
  }
}

export async function getExercises() {
  if (!firestoreDb || isFirestorePaused()) return localExercises;
  if (exercisesCache && Date.now() - exercisesCacheTime < EXERCISES_CACHE_TTL) {
    return exercisesCache;
  }
  if (exercisesLoadPromise) return withSlowFallback(exercisesLoadPromise, () => exercisesCache || localExercises);

  exercisesLoadPromise = (async () => {
    try {
      // Descarga grande: le damos margen y, si tarda, respondemos con la caché
      // o con el catálogo local mientras termina en segundo plano
      const snapshots = await firestoreRead(() => Promise.all([
        firestoreDb.collection('exercise').get(),
        firestoreDb.collection('exerciseimage').get()
      ]), null, { timeoutMs: 12000, pauseOnTimeout: false });
      if (!snapshots) {
        if (!exercisesCache) {
          exercisesCache = localExercises;
          exercisesCacheTime = Date.now();
        }
        return exercisesCache;
      }
      const [exerciseSnapshot, imageSnapshot] = snapshots;
      if (!exerciseSnapshot.size) {
        // Proyecto nuevo o colección todavía sin datos: mejor el catálogo local
        // que mostrar la web vacía al usuario.
        console.warn('La colección "exercise" está vacía: se usa el catálogo local');
        exercisesCache = localExercises;
        exercisesCacheTime = Date.now();
        return localExercises;
      }
      const imagesByExercise = new Map();

      imageSnapshot.docs.forEach((document) => {
        const image = document.data();
        const exerciseReference = image.exercise_base ?? image.exercise ?? image.exercise_base_id;
        const relatedExercise = exerciseReference && typeof exerciseReference === 'object'
          ? exerciseReference.id ?? exerciseReference.pk
          : exerciseReference;
        const imageUrl = image.image || image.thumbnails?.medium || image.thumbnails?.large;
        const gifUrl = image.gif || image.animation || (imageUrl && /\.gif(?:\?|$)/i.test(imageUrl) ? imageUrl : null);

        if (relatedExercise != null && imageUrl && !imagesByExercise.has(String(relatedExercise))) {
          imagesByExercise.set(String(relatedExercise), { image: imageUrl, gif: gifUrl });
        }
      });

      exercisesCache = exerciseSnapshot.docs.map((document) => {
        const data = document.data();
        const exerciseId = data.id ?? document.id;
        const categoryId = data.category && typeof data.category === 'object'
          ? data.category.id ?? data.category.pk
          : data.category;
        return {
          ...data,
          id: exerciseId,
          name: data.name || data.title || `Ejercicio ${exerciseId}`,
          description: data.description || data.description_es || 'Información disponible en la base de datos',
          category: categoryId == null
            ? 'general'
            : categoryNames[categoryId] || String(categoryId),
          difficulty: data.difficulty || 'intermediate',
          instructions: data.instructions && data.instructions !== data.description ? data.instructions : '',
          image: data.image || imagesByExercise.get(String(exerciseId))?.image || null,
          gif: data.gif || imagesByExercise.get(String(exerciseId))?.gif || null
        };
      });
      exercisesCacheTime = Date.now();
      return exercisesCache;
    } catch (error) {
      console.error(`Error leyendo Firestore: ${error.message}`);
      pauseFirestoreIfBroken(error);
      if (!exercisesCache) {
        exercisesCache = localExercises;
        exercisesCacheTime = Date.now();
      }
      return exercisesCache;
    } finally {
      exercisesLoadPromise = null;
    }
  })();

  // Si ya teníamos catálogo (aunque esté algo viejo) lo damos al instante
  if (exercisesCache) return exercisesCache;
  return withSlowFallback(exercisesLoadPromise, () => exercisesCache || localExercises);
}

export async function getIngredients() {
  if (firestoreDb && !isFirestorePaused()) {
    if (ingredientsCache && Date.now() - ingredientsCacheTime < INGREDIENTS_CACHE_TTL) {
      return ingredientsCache;
    }
    if (ingredientsLoadPromise) return withSlowFallback(ingredientsLoadPromise, () => ingredientsCache || localIngredients);

    ingredientsLoadPromise = (async () => {
      try {
        const snapshot = await firestoreRead(() => firestoreDb.collection('ingredientinfo').get(), null, { timeoutMs: 12000, pauseOnTimeout: false });
        if (snapshot && snapshot.size > 0) {
          ingredientsCache = snapshot.docs.map((doc) => {
            const data = doc.data();
            const image = typeof data.image === 'string'
              ? data.image
              : data.image?.image || data.thumbnails?.medium || data.thumbnails?.small || null;
            return {
              id: data.id || doc.id,
              name: data.name || data.common_name || 'Sin nombre',
              brand: data.brand || null,
              energy: data.energy || 0,
              protein: data.protein || 0,
              carbohydrates: data.carbohydrates || 0,
              carbohydrates_sugar: data.carbohydrates_sugar || null,
              fat: data.fat || 0,
              fat_saturated: data.fat_saturated || null,
              fiber: data.fiber || null,
              sodium: data.sodium || null,
              image,
              thumbnails: data.thumbnails || null,
              source_name: data.source_name || null,
              language: data.language || null
            };
          });
          ingredientsCacheTime = Date.now();
          return ingredientsCache;
        }
      } catch (error) {
        console.error(`Error leyendo ingredientes de Firestore: ${error.message}`);
        pauseFirestoreIfBroken(error);
      } finally {
        ingredientsLoadPromise = null;
      }
    })();

    // Si ya tenemos alimentos cargados, los damos al instante y la lista se
    // actualiza en segundo plano cuando Firestore responda
    if (ingredientsCache) return ingredientsCache;
    return withSlowFallback(ingredientsLoadPromise, () => ingredientsCache || localIngredients);
  }

  // Si no hay Firestore o no hay datos, usar datos locales
  return localIngredients;
}

export async function getStoreItems() {
  if (!firestoreDb) {
    throw new Error('Firebase no está configurado para el catálogo de tienda');
  }
  if (isFirestorePaused()) {
    throw new Error('Los datos de la tienda no están disponibles temporalmente');
  }
  if (storeItemsCache && Date.now() - storeItemsCacheTime < STORE_ITEMS_CACHE_TTL) {
    return storeItemsCache;
  }
  if (storeItemsLoadPromise) return storeItemsLoadPromise;

  storeItemsLoadPromise = (async () => {
    try {
      const snapshot = await firestoreRead(() => firestoreDb.collection('storeitems').get(), null, { timeoutMs: 10000, pauseOnTimeout: false });
      if (!snapshot) throw new Error('Los datos de la tienda no están disponibles temporalmente');
      storeItemsCache = snapshot.docs
        .map((document) => {
          const data = document.data();
          return {
            id: data.id ?? document.id,
            name: data.name || `Producto ${document.id}`,
            category: data.category || 'Sin categoría',
            brand: data.brand || '',
            price: Number(data.price) || 0,
            stock: Math.max(0, Number.parseInt(data.stock, 10) || 0),
            weight: data.weight || '',
            flavor: data.flavor || '',
            description: data.description || '',
            image: data.image || '',
            featured: Boolean(data.featured),
            rating: Number(data.rating) || 0,
            reviews: Math.max(0, Number.parseInt(data.reviews, 10) || 0),
            sku: data.sku || '',
            isAvailable: data.isAvailable !== false
          };
        })
        .sort((first, second) => Number(second.featured) - Number(first.featured) || first.name.localeCompare(second.name, 'es'));
      storeItemsCacheTime = Date.now();
      return storeItemsCache;
    } finally {
      storeItemsLoadPromise = null;
    }
  })();

  return storeItemsLoadPromise;
}
