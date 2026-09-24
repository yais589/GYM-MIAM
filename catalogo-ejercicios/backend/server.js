import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { auth as firebaseAuth, db as firestoreDb } from './config/firebase.js';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const requireFirebaseUser = async (req, res, next) => {
  if (!firebaseAuth) return res.status(503).json({ error: 'Firebase Authentication no está configurado' });
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sesión requerida' });

  try {
    req.firebaseUser = await firebaseAuth.verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión no válida' });
  }
};

// ========== BASE DE DATOS LOCAL (Simulada) ==========
const db = {
  exercises: [
    { id: 1, name: 'Flexiones', category: 'body', difficulty: 'beginner', description: 'Ejercicio clásico de peso corporal', duration: 15, calories: 5, image: 'https://via.placeholder.com/200?text=Flexiones', instructions: ['Posición de tabla', 'Baja el cuerpo', 'Sube nuevamente'] },
    { id: 2, name: 'Sentadillas', category: 'body', difficulty: 'intermediate', description: 'Fortalece piernas y glúteos', duration: 20, calories: 8, image: 'https://via.placeholder.com/200?text=Sentadillas', instructions: ['Pies al ancho de hombros', 'Baja las caderas', 'Vuelve a la posición'] },
    { id: 3, name: 'Abdominales', category: 'body', difficulty: 'beginner', description: 'Ejercicio para el core', duration: 10, calories: 3, image: 'https://via.placeholder.com/200?text=Abdominales', instructions: ['Acuéstate boca arriba', 'Contrae el abdomen', 'Sube lentamente'] },
    { id: 4, name: 'Dominadas', category: 'body', difficulty: 'advanced', description: 'Ejercicio de fuerza extrema', duration: 30, calories: 12, image: 'https://via.placeholder.com/200?text=Dominadas', instructions: ['Agarra la barra', 'Sube el cuerpo', 'Baja controladamente'] },
    { id: 5, name: 'Burpees', category: 'cardio', difficulty: 'intermediate', description: 'Cardio de alta intensidad', duration: 25, calories: 10, image: 'https://via.placeholder.com/200?text=Burpees', instructions: ['De pie', 'Agacharse', 'Saltar'] },
    { id: 6, name: 'Trotar', category: 'cardio', difficulty: 'beginner', description: 'Cardio de bajo impacto', duration: 30, calories: 15, image: 'https://via.placeholder.com/200?text=Trotar', instructions: ['Comienza lentamente', 'Mantén el ritmo', 'Respira regularmente'] },
    { id: 7, name: 'Yoga', category: 'flexibilidad', difficulty: 'beginner', description: 'Mejora flexibilidad y equilibrio', duration: 45, calories: 5, image: 'https://via.placeholder.com/200?text=Yoga', instructions: ['Posiciones básicas', 'Respiración profunda', 'Relajación'] },
    { id: 8, name: 'Estiramientos', category: 'flexibilidad', difficulty: 'beginner', description: 'Mejora el rango de movimiento', duration: 15, calories: 2, image: 'https://via.placeholder.com/200?text=Estiramientos', instructions: ['Mantén cada estiramiento', '20-30 segundos', 'Sin rebotes'] },
  ],
  // Datos de nutrición de ejemplo
  ingredients: [
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
    { id: 12, name: 'Pasta', brand: 'Dosal', energy: 131, protein: 5, carbohydrates: 25, fat: 1.1, fiber: 1.8, sodium: 6, image: 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=400', source_name: 'Datos locales' },
  ],
  categories: [
    { id: 1, name: 'Body', icon: '💪', description: 'Ejercicios de peso corporal' },
    { id: 2, name: 'Cardio', icon: '🏃', description: 'Ejercicios de resistencia' },
    { id: 3, name: 'Flexibilidad', icon: '🧘', description: 'Ejercicios de flexibilidad' },
    { id: 4, name: 'Fuerza', icon: '🏋️', description: 'Ejercicios con peso' },
  ],
  users: {},
  favorites: {},
  workouts: {},
  stats: {}
};

const localExercises = db.exercises;
const categoryNames = {
  8: 'Brazos',
  9: 'Piernas',
  10: 'Abdominales',
  11: 'Pecho',
  12: 'Espalda',
  13: 'Hombros',
  14: 'Pantorrillas',
  15: 'Cardio'
};
const categoryIcons = {
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

async function getExercises() {
  if (!firestoreDb) return localExercises;
  if (exercisesCache && Date.now() - exercisesCacheTime < EXERCISES_CACHE_TTL) {
    return exercisesCache;
  }
  if (exercisesLoadPromise) return exercisesLoadPromise;

  exercisesLoadPromise = (async () => {
    try {
    const [exerciseSnapshot, imageSnapshot] = await Promise.all([
      firestoreDb.collection('exercise').get(),
      firestoreDb.collection('exerciseimage').get()
    ]);
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
      exercisesCache = localExercises;
      exercisesCacheTime = Date.now();
      return localExercises;
    } finally {
      exercisesLoadPromise = null;
    }
  })();

  return exercisesLoadPromise;
}

async function getIngredients() {
  // Si hay datos en Firestore, usarlos
  if (firestoreDb) {
    if (ingredientsCache && Date.now() - ingredientsCacheTime < INGREDIENTS_CACHE_TTL) {
      return ingredientsCache;
    }
    if (ingredientsLoadPromise) return ingredientsLoadPromise;

    ingredientsLoadPromise = (async () => {
      try {
        const snapshot = await firestoreDb.collection('ingredientinfo').get();
        if (snapshot.size > 0) {
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
      } finally {
        ingredientsLoadPromise = null;
      }
    })();

    const result = await ingredientsLoadPromise;
    if (result && result.length > 0) return result;
  }

  // Si no hay Firestore o no hay datos, usar datos locales
  console.log('⚠️ Usando datos de nutrición locales');
  return db.ingredients;
}

async function getStoreItems() {
  if (!firestoreDb) {
    throw new Error('Firebase no está configurado para el catálogo de tienda');
  }
  if (storeItemsCache && Date.now() - storeItemsCacheTime < STORE_ITEMS_CACHE_TTL) {
    return storeItemsCache;
  }
  if (storeItemsLoadPromise) return storeItemsLoadPromise;

  storeItemsLoadPromise = (async () => {
    try {
      const snapshot = await firestoreDb.collection('storeitems').get();
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

// ========== RUTAS DE PRUEBA ==========
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend funcionando correctamente', timestamp: new Date() });
});

// ========== RUTAS DE TIENDA ==========
app.get('/api/storeitems', async (req, res) => {
  try {
    const storeItems = await getStoreItems();
    res.json(storeItems);
  } catch (error) {
    console.error(`Error cargando productos de tienda: ${error.message}`);
    res.status(503).json({ error: 'El catálogo de la tienda no está disponible. Sincroniza los productos e inténtalo de nuevo.' });
  }
});

// ========== RUTAS DE EJERCICIOS ==========
app.get('/api/exercises', async (req, res) => {
  const exercises = await getExercises();
  const limit = Number.parseInt(req.query.limit, 10);
  res.json(Number.isInteger(limit) && limit > 0 ? exercises.slice(0, limit) : exercises);
});

app.get('/api/exercises/:id', async (req, res) => {
  const exercises = await getExercises();
  const exercise = exercises.find(e => String(e.id) === req.params.id);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  res.json(exercise);
});

app.get('/api/exercises/category/:category', async (req, res) => {
  const { category } = req.params;
  const exercises = await getExercises();
  const fallbackAliases = {
    Brazos: '8',
    Espalda: '12',
    Abdominales: '10',
    Hombros: '13',
    Pantorrillas: '14',
    Pecho: '11',
    Piernas: '9',
    Cardio: '15'
  };
  const filtered = exercises.filter(ex =>
    String(ex.category) === category || String(ex.category) === fallbackAliases[category]
  );
  res.json(filtered);
});

// ========== RUTAS DE CATEGORÍAS ==========
app.get('/api/categories', async (req, res) => {
  const exercises = await getExercises();
  const categoriesInData = new Set(exercises.map(exercise => String(exercise.category)).filter(Boolean));
  const legacyCategories = new Set(['body', 'cardio', 'flexibilidad', 'fuerza']);
  const categories = [
    ...Object.values(categoryNames),
    ...[...categoriesInData].filter(category =>
      !Object.values(categoryNames).includes(category) && !legacyCategories.has(category.toLowerCase())
    )
  ];
  res.json([...new Set(categories)].map((category, index) => ({
    id: index + 1,
    name: category,
    icon: categoryIcons[category] || '💪'
  })));
});

app.get('/api/categories/stats', async (req, res) => {
  const exercises = await getExercises();
  const categories = [...new Set(exercises.map(exercise => exercise.category).filter(Boolean))];
  const stats = (categories.length ? categories : db.categories.map(category => category.name.toLowerCase()))
    .map((category, index) => ({
      id: index + 1,
      name: String(category),
      icon: '💪',
      total: exercises.filter(ex => String(ex.category) === String(category)).length
    }));
  res.json(stats);
});

// ========== RUTAS DE USUARIO ==========
app.get('/api/profile', requireFirebaseUser, async (req, res) => {
  const profileReference = firestoreDb.collection('profiles').doc(req.firebaseUser.uid);
  const snapshot = await profileReference.get();
  res.json(snapshot.exists ? { id: snapshot.id, ...snapshot.data(), email: req.firebaseUser.email } : {
    id: req.firebaseUser.uid,
    email: req.firebaseUser.email
  });
});

app.put('/api/profile', requireFirebaseUser, async (req, res) => {
  const { password, confirmPassword, ...profile } = req.body;
  const savedProfile = {
    ...profile,
    uid: req.firebaseUser.uid,
    email: req.firebaseUser.email,
    updatedAt: new Date()
  };
  await firestoreDb.collection('profiles').doc(req.firebaseUser.uid).set(savedProfile, { merge: true });
  res.json({ id: req.firebaseUser.uid, ...savedProfile });
});

app.get('/api/profile/favorites', requireFirebaseUser, async (req, res) => {
  const snapshot = await firestoreDb.collection('profiles').doc(req.firebaseUser.uid).get();
  const profile = snapshot.exists ? snapshot.data() : {};
  res.json({
    exerciseIds: Array.isArray(profile.favoriteExerciseIds) ? profile.favoriteExerciseIds : [],
    schedule: profile.favoriteSchedule && typeof profile.favoriteSchedule === 'object'
      ? profile.favoriteSchedule
      : {},
    nutritionIds: Array.isArray(profile.favoriteNutritionIds) ? profile.favoriteNutritionIds : [],
    nutritionSchedule: profile.favoriteNutritionSchedule && typeof profile.favoriteNutritionSchedule === 'object'
      ? profile.favoriteNutritionSchedule
      : {}
  });
});

app.put('/api/profile/favorites', requireFirebaseUser, async (req, res) => {
  const exerciseIds = Array.isArray(req.body.exerciseIds) ? req.body.exerciseIds : [];
  const nutritionIds = Array.isArray(req.body.nutritionIds) ? req.body.nutritionIds : [];
  const schedule = req.body.schedule && typeof req.body.schedule === 'object' ? req.body.schedule : {};
  const nutritionSchedule = req.body.nutritionSchedule && typeof req.body.nutritionSchedule === 'object'
    ? req.body.nutritionSchedule
    : {};
  const cleanedSchedule = Object.fromEntries(
    Object.entries(schedule)
      .filter(([exerciseId]) => exerciseIds.some(id => String(id) === exerciseId))
      .map(([exerciseId, days]) => [exerciseId, Array.isArray(days) ? days : []])
  );
  const cleanedNutritionSchedule = Object.fromEntries(
    Object.entries(nutritionSchedule)
      .filter(([nutritionId]) => nutritionIds.some(id => String(id) === nutritionId))
      .map(([nutritionId, days]) => [nutritionId, Array.isArray(days) ? days : []])
  );
  await firestoreDb.collection('profiles').doc(req.firebaseUser.uid).set({
    favoriteExerciseIds: exerciseIds,
    favoriteSchedule: cleanedSchedule,
    ...(Array.isArray(req.body.nutritionIds) ? {
      favoriteNutritionIds: nutritionIds,
      favoriteNutritionSchedule: cleanedNutritionSchedule
    } : {})
  }, { merge: true });
  res.json({
    exerciseIds,
    schedule: cleanedSchedule,
    ...(Array.isArray(req.body.nutritionIds) ? { nutritionIds, nutritionSchedule: cleanedNutritionSchedule } : {})
  });
});

app.get('/api/profile/cart', requireFirebaseUser, async (req, res) => {
  const snapshot = await firestoreDb.collection('profiles').doc(req.firebaseUser.uid).get();
  const profile = snapshot.exists ? snapshot.data() : {};
  const items = Array.isArray(profile.cartItems)
    ? profile.cartItems
        .filter(item => item && item.id != null && Number(item.quantity) > 0)
        .map(item => ({
          id: String(item.id),
          quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1)
        }))
    : [];
  res.json({ items });
});

app.put('/api/profile/cart', requireFirebaseUser, async (req, res) => {
  const items = Array.isArray(req.body.items)
    ? req.body.items
        .filter(item => item && item.id != null && Number(item.quantity) > 0)
        .map(item => ({
          id: String(item.id),
          quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1)
        }))
    : [];

  await firestoreDb.collection('profiles').doc(req.firebaseUser.uid).set({
    cartItems: items,
    cartUpdatedAt: new Date()
  }, { merge: true });
  res.json({ items });
});

app.post('/api/user', requireFirebaseUser, async (req, res) => {
  const userId = uuidv4();
  const newUser = {
    id: userId,
    ...req.body,
    createdAt: new Date(),
    totalWorkouts: 0,
    streak: 0
  };
  db.users[userId] = newUser;
  db.favorites[userId] = [];
  db.workouts[userId] = [];
  db.stats[userId] = { totalCalories: 0, totalMinutes: 0, totalWorkouts: 0 };

  try {
    if (firestoreDb) {
      const userReference = firestoreDb.collection('users').doc(userId);
      await userReference.set(newUser);
    }
    res.status(201).json(newUser);
  } catch (error) {
    console.error(`Error guardando usuario en Firestore: ${error.message}`);
    res.status(500).json({ error: 'No se pudo guardar el usuario' });
  }
});

app.get('/api/user/:id', requireFirebaseUser, (req, res) => {
  const user = db.users[req.params.id];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

app.put('/api/user/:id', requireFirebaseUser, async (req, res) => {
  const currentUser = db.users[req.params.id] || { id: req.params.id };
  db.users[req.params.id] = { ...currentUser, ...req.body, id: req.params.id };

  try {
    if (firestoreDb) {
      await firestoreDb.collection('users').doc(req.params.id).set(db.users[req.params.id], { merge: true });
    }
    res.json(db.users[req.params.id]);
  } catch (error) {
    console.error(`Error actualizando usuario en Firestore: ${error.message}`);
    res.status(500).json({ error: 'No se pudo actualizar el usuario' });
  }
});

app.delete('/api/user/:id', (req, res) => {
  delete db.users[req.params.id];
  delete db.favorites[req.params.id];
  delete db.workouts[req.params.id];
  delete db.stats[req.params.id];
  res.json({ message: 'Usuario eliminado' });
});

// ========== RUTAS DE FAVORITOS ==========
app.get('/api/user/:userId/favorites', (req, res) => {
  const favorites = db.favorites[req.params.userId] || [];
  const favoriteExercises = favorites.map(id => db.exercises.find(e => e.id === id)).filter(Boolean);
  res.json(favoriteExercises);
});

app.post('/api/user/:userId/favorites/:exerciseId', (req, res) => {
  const { userId, exerciseId } = req.params;
  if (!db.favorites[userId]) db.favorites[userId] = [];
  const id = parseInt(exerciseId);
  if (!db.favorites[userId].includes(id)) {
    db.favorites[userId].push(id);
  }
  res.json({ message: 'Añadido a favoritos', favorites: db.favorites[userId] });
});

app.delete('/api/user/:userId/favorites/:exerciseId', (req, res) => {
  const { userId, exerciseId } = req.params;
  if (db.favorites[userId]) {
    db.favorites[userId] = db.favorites[userId].filter(id => id !== parseInt(exerciseId));
  }
  res.json({ message: 'Removido de favoritos' });
});

// ========== RUTAS DE ENTRENAMIENTOS ==========
app.post('/api/user/:userId/workout', (req, res) => {
  const { userId } = req.params;
  const { exerciseId, duration, calories } = req.body;
  
  if (!db.workouts[userId]) db.workouts[userId] = [];
  
  const workout = {
    id: uuidv4(),
    exerciseId,
    duration,
    calories,
    date: new Date(),
    completed: true
  };
  
  db.workouts[userId].push(workout);
  
  // Actualizar estadísticas
  if (!db.stats[userId]) db.stats[userId] = { totalCalories: 0, totalMinutes: 0, totalWorkouts: 0 };
  db.stats[userId].totalCalories += calories;
  db.stats[userId].totalMinutes += duration;
  db.stats[userId].totalWorkouts += 1;
  
  res.status(201).json(workout);
});

app.get('/api/user/:userId/workouts', (req, res) => {
  const workouts = db.workouts[req.params.userId] || [];
  res.json(workouts);
});

app.get('/api/user/:userId/stats', (req, res) => {
  const stats = db.stats[req.params.userId] || { totalCalories: 0, totalMinutes: 0, totalWorkouts: 0 };
  res.json(stats);
});

// ========== RUTAS DE RUTINAS PERSONALIZADAS ==========
app.post('/api/user/:userId/routines', (req, res) => {
  const { name, exercises, difficulty } = req.body;
  const routine = {
    id: uuidv4(),
    name,
    exercises,
    difficulty,
    createdAt: new Date(),
    completed: false
  };
  
  if (!db.workouts[req.params.userId]) db.workouts[req.params.userId] = [];
  
  // Guardar como rutina especial
  res.status(201).json(routine);
});

app.get('/api/user/:userId/routines', (req, res) => {
  const routines = db.workouts[req.params.userId] || [];
  res.json(routines.filter(w => w.exercises));
});

// ========== RUTAS DE BÚSQUEDA Y FILTRADO ==========
app.get('/api/exercises/search/:query', async (req, res) => {
  const { query } = req.params;
  const exercises = await getExercises();
  const results = exercises.filter(ex => 
    String(ex.name || '').toLowerCase().includes(query.toLowerCase()) ||
    String(ex.description || '').toLowerCase().includes(query.toLowerCase())
  );
  res.json(results);
});

app.get('/api/exercises/difficulty/:difficulty', async (req, res) => {
  const { difficulty } = req.params;
  const exercises = await getExercises();
  const filtered = exercises.filter(ex => ex.difficulty === difficulty);
  res.json(filtered);
});

// ========== RUTAS DE RECOMENDACIONES ==========
app.get('/api/recommendations/:userId', async (req, res) => {
  const exercises = await getExercises();
  const stats = db.stats[req.params.userId];
  if (!stats) return res.json(exercises.slice(0, 4));

  // Recomendar basado en preferencias del usuario
  const recommended = exercises.filter(ex =>
    !db.favorites[req.params.userId]?.includes(ex.id)
  ).slice(0, 4);

  res.json(recommended);
});

// ========== RUTAS DE NUTRICIÓN ==========
app.get('/api/nutrition', async (req, res) => {
  const ingredients = await getIngredients();
  const limit = Number.parseInt(req.query.limit, 10);
  res.json(Number.isInteger(limit) && limit > 0 ? ingredients.slice(0, limit) : ingredients);
});

app.get('/api/nutrition/:id', async (req, res) => {
  const ingredients = await getIngredients();
  const ingredient = ingredients.find(i => String(i.id) === req.params.id);
  if (!ingredient) return res.status(404).json({ error: 'Ingrediente no encontrado' });
  res.json(ingredient);
});

app.get('/api/nutrition/search/:query', async (req, res) => {
  const { query } = req.params;
  const ingredients = await getIngredients();
  const results = ingredients.filter(i =>
    String(i.name || '').toLowerCase().includes(query.toLowerCase()) ||
    String(i.brand || '').toLowerCase().includes(query.toLowerCase())
  );
  res.json(results);
});

// ========== RUTAS DE ASISTENTE IA ==========

// Configurar nodemailer (Gmail example - ajusta según tu proveedor)
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = String(process.env.SMTP_SECURE || (smtpPort === 465)).toLowerCase() === 'true';
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    : undefined
});

const smtpConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
console.log(`SMTP configurado: ${smtpConfigured ? 'sí' : 'no'} (${smtpHost}:${smtpPort})`);
if (smtpConfigured) {
  transporter.verify()
    .then(() => console.log('SMTP listo para enviar emails'))
    .catch(error => console.error(`SMTP no disponible: ${error.code || error.message}`));
}

// Endpoint para enviar plan por email
app.post('/api/ai/send-plan', async (req, res) => {
  const { email, plan, language } = req.body;

  try {
    const isTraining = plan.type === 'training';
    const subject = isTraining
      ? (language === 'es' ? 'Tu Plan de Entrenamiento Personalizado' : 'Your Personalized Training Plan')
      : (language === 'es' ? 'Tu Plan de Nutrición Personalizado' : 'Your Personalized Nutrition Plan');

    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f6f2;">
        <div style="background: linear-gradient(135deg, #173b43 0%, #2d5a65 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">${subject}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">TITAN GYM - ${plan.name}</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
    `;

    if (isTraining) {
      htmlContent += `
        <p><strong>Objetivo:</strong> ${plan.goal}</p>
        <p><strong>Nivel:</strong> ${plan.level}</p>
        <p><strong>Días por semana:</strong> ${plan.schedule.length}</p>
        <h2 style="color: #173b43; border-bottom: 2px solid #d88b51; padding-bottom: 10px;">Rutina Semanal</h2>
      `;

      plan.schedule.forEach(day => {
        htmlContent += `
          <div style="background: #f4f6f2; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #d88b51;">
            <h3 style="margin: 0 0 5px 0; color: #173b43;">${day.day}</h3>
            <p style="margin: 0 0 10px 0; color: #d88b51; font-size: 0.9em;"><strong>Enfoque:</strong> ${day.focus}</p>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
              ${day.exercises.map(ex => `<li>${ex} - ${day.sets} series x ${day.reps} - Descanso: ${day.rest}</li>`).join('')}
            </ul>
          </div>
        `;
      });
    } else {
      htmlContent += `
        <h2 style="color: #173b43; border-bottom: 2px solid #d88b51; padding-bottom: 10px;">Resumen Nutricional</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
          <div style="background: #f4f6f2; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 0.9em;">Metabolismo Basal</p>
            <p style="margin: 5px 0 0 0; color: #d88b51; font-size: 1.5em; font-weight: bold;">${plan.bmr} kcal</p>
          </div>
          <div style="background: #f4f6f2; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 0.9em;">Calorías Diarias</p>
            <p style="margin: 5px 0 0 0; color: #d88b51; font-size: 1.5em; font-weight: bold;">${plan.calories} kcal</p>
          </div>
        </div>
        <h3 style="color: #173b43;">Macronutrientes</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 15px 0;">
          <div style="background: #f4f6f2; padding: 10px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 0.85em; color: #6b7280;">Proteína</p>
            <p style="margin: 5px 0 0 0; font-weight: bold; color: #173b43;">${plan.macros.protein}g</p>
          </div>
          <div style="background: #f4f6f2; padding: 10px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 0.85em; color: #6b7280;">Carbohidratos</p>
            <p style="margin: 5px 0 0 0; font-weight: bold; color: #173b43;">${plan.macros.carbs}g</p>
          </div>
          <div style="background: #f4f6f2; padding: 10px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 0.85em; color: #6b7280;">Grasas</p>
            <p style="margin: 5px 0 0 0; font-weight: bold; color: #173b43;">${plan.macros.fat}g</p>
          </div>
        </div>
        <h3 style="color: #173b43;">Distribución de Comidas</h3>
        ${plan.meals.map(meal => `
          <div style="background: #f4f6f2; padding: 10px 15px; margin: 8px 0; border-radius: 8px; display: flex; justify-content: space-between;">
            <strong style="color: #173b43;">${meal.time}</strong>
            <span style="color: #d88b51; font-weight: bold;">${meal.calories} kcal</span>
          </div>
        `).join('')}
      `;

      // Agregar sugerencias de ingredientes
      if (plan.suggestedFoods && plan.suggestedFoods.length > 0) {
        htmlContent += `
          <h3 style="color: #173b43; margin-top: 25px;">Alimentos Sugeridos</h3>
          <div style="background: #f4f6f2; padding: 15px; border-radius: 8px;">
            <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
              ${plan.suggestedFoods.map(food => `<li><strong>${food.meal}: ${food.name}</strong> - ${food.grams} g · ${food.calories} kcal · P ${food.protein} g · C ${food.carbohydrates} g · G ${food.fat} g</li>`).join('')}
            </ul>
            ${plan.foodTotals ? `<p><strong>Total calculado:</strong> ${plan.foodTotals.calories} kcal · P ${plan.foodTotals.protein} g · C ${plan.foodTotals.carbohydrates} g · G ${plan.foodTotals.fat} g</p>` : ''}
          </div>
        `;
      }
    }

    htmlContent += `
        </div>
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 0.9em;">
          <p>Este plan ha sido generado por TITAN GYM - Tu asistente personal de fitness</p>
          <p style="margin: 5px 0;">© 2026 TITAN GYM. Todos los derechos reservados.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@titangym.com',
      to: email,
      subject: subject,
      html: htmlContent
    };

    if (!smtpConfigured) {
      return res.status(503).json({ success: false, error: 'El servidor de correo no está configurado.' });
    }

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email enviado correctamente' });
  } catch (error) {
    console.error(`Error enviando email: ${error.code || error.message}`);
    const status = ['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code) ? 502 : 500;
    const message = error.code === 'EAUTH'
      ? 'La autenticación SMTP falló. Usa una contraseña de aplicación válida.'
      : 'No se pudo enviar el email. Revisa la configuración SMTP del servidor.';
    res.status(status).json({ success: false, error: message });
  }
});

// Endpoint para generar PDF
app.post('/api/ai/generate-pdf', async (req, res) => {
  const { plan, language } = req.body;

  try {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=plan-${plan.type}-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    });

    // Header
    doc.fontSize(24).fillColor('#173b43').text('TITAN GYM', { align: 'center' });
    doc.fontSize(16).fillColor('#d88b51').text(
      plan.type === 'training'
        ? (language === 'es' ? 'Plan de Entrenamiento Personalizado' : 'Personalized Training Plan')
        : (language === 'es' ? 'Plan de Nutrición Personalizado' : 'Personalized Nutrition Plan'),
      { align: 'center' }
    );
    doc.moveDown();
    doc.fontSize(12).fillColor('#6b7280').text(`Cliente: ${plan.name}`, { align: 'center' });
    doc.moveDown(2);

    if (plan.type === 'training') {
      doc.fontSize(14).fillColor('#173b43').text(`Objetivo: ${plan.goal}`);
      doc.text(`Nivel: ${plan.level}`);
      doc.text(`Días por semana: ${plan.schedule.length}`);
      doc.moveDown();

      doc.fontSize(16).fillColor('#d88b51').text('Rutina Semanal');
      doc.moveDown();

      plan.schedule.forEach((day, index) => {
        doc.fontSize(12).fillColor('#173b43').text(`${day.day} - Enfoque: ${day.focus}`, { underline: true });
        doc.moveDown(0.5);
        day.exercises.forEach(ex => {
          doc.fontSize(10).fillColor('#6b7280').text(`• ${ex} - ${day.sets} series x ${day.reps} - Descanso: ${day.rest}`, { indent: 20 });
        });
        doc.moveDown();
      });
    } else {
      doc.fontSize(14).fillColor('#173b43').text(`Metabolismo Basal: ${plan.bmr} kcal`);
      doc.text(`Calorías Diarias: ${plan.calories} kcal`);
      doc.moveDown();

      doc.fontSize(16).fillColor('#d88b51').text('Macronutrientes');
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#6b7280').text(`Proteína: ${plan.macros.protein}g`);
      doc.text(`Carbohidratos: ${plan.macros.carbs}g`);
      doc.text(`Grasas: ${plan.macros.fat}g`);
      doc.moveDown();

      doc.fontSize(16).fillColor('#d88b51').text('Distribución de Comidas');
      doc.moveDown(0.5);
      plan.meals.forEach(meal => {
        doc.fontSize(12).fillColor('#173b43').text(`${meal.time}: ${meal.calories} kcal`);
      });

      if (plan.suggestedFoods && plan.suggestedFoods.length > 0) {
        doc.moveDown();
        doc.fontSize(16).fillColor('#d88b51').text('Alimentos Sugeridos');
        doc.moveDown(0.5);
        plan.suggestedFoods.forEach(food => {
          doc.fontSize(10).fillColor('#6b7280').text(`• ${food.meal}: ${food.name} - ${food.grams} g - ${food.calories} kcal - P ${food.protein} g / C ${food.carbohydrates} g / G ${food.fat} g`, { indent: 20 });
        });
        if (plan.foodTotals) {
          doc.moveDown(0.5);
          doc.fontSize(11).fillColor('#173b43').text(`Total calculado: ${plan.foodTotals.calories} kcal - P ${plan.foodTotals.protein} g / C ${plan.foodTotals.carbohydrates} g / G ${plan.foodTotals.fat} g`);
        }
      }
    }

    doc.moveDown(2);
    doc.fontSize(10).fillColor('#6b7280').text('© 2026 TITAN GYM. Todos los derechos reservados.', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ success: false, error: 'No se pudo generar el PDF' });
  }
});

// Endpoint para construir una dieta cuantificada según calorías y macros
app.post('/api/ai/suggest-foods', async (req, res) => {
  const { calories, macros, dietaryRestrictions = [] } = req.body;

  try {
    const target = {
      calories: Number(calories),
      protein: Number(macros?.protein),
      carbohydrates: Number(macros?.carbs ?? macros?.carbohydrates),
      fat: Number(macros?.fat)
    };
    if (![target.calories, target.protein, target.carbohydrates, target.fat].every(Number.isFinite)) {
      return res.status(400).json({ error: 'Objetivos nutricionales no válidos' });
    }

    const blocked = new Set(dietaryRestrictions.map(String).map(value => value.toLowerCase()));
    const ingredients = (await getIngredients()).filter(item => {
      const name = String(item.name || '').toLowerCase();
      if (!Number(item.energy) || Number(item.energy) <= 0) return false;
      // Evitar que una dieta base se llene de ultraprocesados o bebidas con datos atípicos.
      if (/(caramelo|chocolate|galleta|cookie|chokis|dulce|refresco|cafe|café|azucar|azúcar|pastel|donut|helado|golosina)/.test(name)) return false;
      if (blocked.has('vegan') && /(pollo|huevo|leche|yogur|salmon|carne|pescado|atun|atún|queso)/.test(name)) return false;
      if (blocked.has('vegetarian') && /(pollo|salmon|carne|pescado|atun|atún)/.test(name)) return false;
      if (blocked.has('lactoseFree') && /(leche|yogur|queso)/.test(name)) return false;
      if (blocked.has('glutenFree') && /(pan|pasta|trigo)/.test(name)) return false;
      return true;
    }).map(item => ({
      ...item,
      energy: Number(item.energy) || 0,
      protein: Number(item.protein) || 0,
      carbohydrates: Number(item.carbohydrates) || 0,
      fat: Number(item.fat) || 0
    }));

    if (ingredients.length < 3) return res.status(422).json({ error: 'No hay suficientes alimentos compatibles' });

    const normalizeName = value => String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    const foodName = item => normalizeName(item.name);
    const valuePer100g = (item, key) => Number(item[key]) || 0;
    const energyDensity = item => Math.max(valuePer100g(item, 'energy'), 1);
    const ratio = (item, key) => valuePer100g(item, key) / energyDensity(item);
    const proteinWords = /(pollo|pechuga|pavo|atun|salmon|pescado|carne|ternera|huevo|tofu|tempeh|lenteja|frijol|garbanzo|yogur|queso|proteina|whey|atun)/;
    const carbWords = /(arroz|avena|pasta|patata|papa|pan|quinoa|maiz|tortilla|cereal|cuscus|couscous|boniato|batata)/;
    const fatWords = /(aceite|aguacate|avocado|almendra|nuez|cacahuete|mani|pistacho|semilla|chia|linaza|oliva|mantequilla)/;
    const produceWords = /(brocoli|espinaca|lechuga|tomate|zanahoria|pepino|calabacin|pimiento|manzana|platano|banana|naranja|fresa|fruta|verdura|vegetal)/;
    const unique = list => [...new Map(list.map(item => [String(item.id), item])).values()];
    const select = (predicate, score) => unique(ingredients.filter(predicate).sort((a, b) => score(b) - score(a)));

    const proteinPool = select(
      item => valuePer100g(item, 'protein') >= 8 && (proteinWords.test(foodName(item)) || valuePer100g(item, 'protein') >= 18),
      item => ratio(item, 'protein') - ratio(item, 'fat') * 0.25
    );
    const carbPool = select(
      item => valuePer100g(item, 'carbohydrates') >= 12 && (carbWords.test(foodName(item)) || valuePer100g(item, 'carbohydrates') >= 35),
      item => ratio(item, 'carbohydrates') - ratio(item, 'fat') * 0.1
    );
    const fatPool = select(
      item => valuePer100g(item, 'fat') >= 5 && (fatWords.test(foodName(item)) || valuePer100g(item, 'fat') >= 15),
      item => ratio(item, 'fat')
    );
    const producePool = select(
      item => valuePer100g(item, 'fiber') >= 1.5 && (produceWords.test(foodName(item)) || energyDensity(item) <= 100),
      item => valuePer100g(item, 'fiber') / energyDensity(item)
    );
    const fallbackPool = ingredients.filter(item => energyDensity(item) > 0);
    const choose = (pool, index) => pool[index] || pool[0] || fallbackPool[index % fallbackPool.length];
    const selected = {
      protein: proteinPool.length ? proteinPool : fallbackPool,
      carbs: carbPool.length ? carbPool : fallbackPool,
      fat: fatPool.length ? fatPool : fallbackPool,
      produce: producePool.length ? producePool : fallbackPool
    };

    const baseFoods = [
      { meal: 'Desayuno', item: choose(selected.produce, 0), grams: 100, maxGrams: 300 },
      { meal: 'Desayuno', item: choose(selected.protein, 0), grams: 120, maxGrams: 400 },
      { meal: 'Desayuno', item: choose(selected.carbs, 0), grams: 80, maxGrams: 350 },
      { meal: 'Almuerzo', item: choose(selected.protein, 1), grams: 160, maxGrams: 400 },
      { meal: 'Almuerzo', item: choose(selected.carbs, 1), grams: 120, maxGrams: 350 },
      { meal: 'Almuerzo', item: choose(selected.produce, 1), grams: 150, maxGrams: 300 },
      { meal: 'Almuerzo', item: choose(selected.fat, 0), grams: 10, maxGrams: 80 },
      { meal: 'Cena', item: choose(selected.protein, 2), grams: 160, maxGrams: 400 },
      { meal: 'Cena', item: choose(selected.carbs, 0), grams: 100, maxGrams: 350 },
      { meal: 'Cena', item: choose(selected.produce, 0), grams: 150, maxGrams: 300 },
      { meal: 'Cena', item: choose(selected.fat, 1), grams: 10, maxGrams: 80 },
      { meal: 'Snack', item: choose(selected.protein, 0), grams: 100, maxGrams: 300 },
      { meal: 'Snack', item: choose(selected.produce, 1), grams: 100, maxGrams: 300 }
    ];

    const totals = list => list.reduce((sum, entry) => {
      const portion = entry.grams / 100;
      return {
        calories: sum.calories + entry.item.energy * portion,
        protein: sum.protein + entry.item.protein * portion,
        carbohydrates: sum.carbohydrates + entry.item.carbohydrates * portion,
        fat: sum.fat + entry.item.fat * portion
      };
    }, { calories: 0, protein: 0, carbohydrates: 0, fat: 0 });

    const score = list => {
      const current = totals(list);
      const weights = { calories: 1.4, protein: 1.2, carbohydrates: 1, fat: 1 };
      return Object.entries(weights).reduce((total, [key, weight]) => {
        const desired = Math.max(target[key], 1);
        return total + weight * Math.pow((current[key] - target[key]) / desired, 2);
      }, 0);
    };

    // Primero se acerca la energía y después se ajustan macros en pasos de 5 g.
    const adjusted = baseFoods.map(entry => ({ ...entry }));
    const calorieFactor = Math.max(0.6, Math.min(2.5, target.calories / Math.max(totals(adjusted).calories, 1)));
    adjusted.forEach(entry => {
      entry.grams = Math.max(5, Math.min(entry.maxGrams, Math.round(entry.grams * calorieFactor / 5) * 5));
    });
    for (let iteration = 0; iteration < 400; iteration += 1) {
      let improved = false;
      adjusted.forEach(entry => {
        const original = entry.grams;
        const currentScore = score(adjusted);
        let bestGrams = original;
        let bestScore = currentScore;
        for (const change of [-20, -10, 10, 20]) {
          entry.grams = Math.max(5, Math.min(entry.maxGrams, original + change));
          const candidateScore = score(adjusted);
          if (candidateScore < bestScore) {
            bestScore = candidateScore;
            bestGrams = entry.grams;
          }
        }
        entry.grams = bestGrams;
        if (bestGrams !== original) improved = true;
      });
      if (!improved) break;
    }
    const resultTotals = totals(adjusted);
    const foods = adjusted.map(entry => {
      const ratio = entry.grams / 100;
      return {
        meal: entry.meal,
        id: entry.item.id,
        name: entry.item.name,
        brand: entry.item.brand,
        grams: entry.grams,
        servings: Number((entry.grams / 100).toFixed(2)),
        calories: Math.round(entry.item.energy * ratio),
        protein: Number((entry.item.protein * ratio).toFixed(1)),
        carbohydrates: Number((entry.item.carbohydrates * ratio).toFixed(1)),
        fat: Number((entry.item.fat * ratio).toFixed(1))
      };
    });

    res.json({
      foods,
      totals: Object.fromEntries(Object.entries(resultTotals).map(([key, value]) => [key, Math.round(value * 10) / 10])),
      target,
      accuracy: {
        calories: Math.round((resultTotals.calories / target.calories) * 100),
        protein: Math.round((resultTotals.protein / target.protein) * 100),
        carbohydrates: Math.round((resultTotals.carbohydrates / target.carbohydrates) * 100),
        fat: Math.round((resultTotals.fat / target.fat) * 100)
      }
    });
  } catch (error) {
    console.error(`Error sugiriendo alimentos: ${error.message}`);
    res.status(500).json({ error: 'No se pudo construir la dieta' });
  }
});

// ========== ERROR 404 ==========
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 API disponible en http://localhost:${PORT}/api`);
});
