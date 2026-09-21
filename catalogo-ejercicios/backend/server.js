import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { auth as firebaseAuth, db as firestoreDb } from './config/firebase.js';

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
const EXERCISES_CACHE_TTL = 5 * 60 * 1000;

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

// ========== RUTAS DE PRUEBA ==========
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend funcionando correctamente', timestamp: new Date() });
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
      : {}
  });
});

app.put('/api/profile/favorites', requireFirebaseUser, async (req, res) => {
  const exerciseIds = Array.isArray(req.body.exerciseIds) ? req.body.exerciseIds : [];
  const schedule = req.body.schedule && typeof req.body.schedule === 'object' ? req.body.schedule : {};
  const cleanedSchedule = Object.fromEntries(
    Object.entries(schedule)
      .filter(([exerciseId]) => exerciseIds.some(id => String(id) === exerciseId))
      .map(([exerciseId, days]) => [exerciseId, Array.isArray(days) ? days : []])
  );
  await firestoreDb.collection('profiles').doc(req.firebaseUser.uid).set({
    favoriteExerciseIds: exerciseIds,
    favoriteSchedule: cleanedSchedule
  }, { merge: true });
  res.json({ exerciseIds, schedule: cleanedSchedule });
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

// ========== ERROR 404 ==========
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 API disponible en http://localhost:${PORT}/api`);
});
