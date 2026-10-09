import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { auth as firebaseAuth, db as firestoreDb } from './config/firebase.js';
import { resolveAdminStatus, requireAdmin, requireOwnResource, parseWorkoutPayload, validateProfileBusinessFields } from './config/authorization.js';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { generateChatReply } from './services/aiAssistant.js';
import { createConfirmationToken, executeAdminAction, parseAdminRequest, queryData, readConfirmationToken, verifyConfirmationToken } from './services/adminAi.js';
import { buildNutritionPlan, buildTrainingPlan, buildCrossRecommendation } from './services/planGenerator.js';
import { buildPlanPdf } from './services/planPdf.js';
import { getExercises, getIngredients, getStoreItems, categoryNames, categoryIcons, firestoreRead } from './services/dataAccess.js';

dotenv.config();

const app = express();
// El puerto debe ser siempre un número válido > 0. Algunos entornos definen
// PORT=0 (puerto aleatorio) o vacío, lo que rompía el proxy del frontend.
const parsedPort = Number.parseInt(process.env.PORT ?? '', 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Express 4 no captura los errores de los handlers async: una promesa rechazada
// (por ejemplo, Firestore devolviendo un error) mataba el proceso entero y la
// web se quedaba sin backend. Envolvemos los handlers async automáticamente
// para que el fallo llegue al middleware de errores y el servidor siga vivo.
const wrapAsync = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
for (const method of ['get', 'post', 'put', 'patch', 'delete', 'all']) {
  const register = app[method].bind(app);
  app[method] = (path, ...handlers) => register(path, ...handlers.map(handler =>
    typeof handler === 'function' && handler.constructor?.name === 'AsyncFunction' && handler.length < 4
      ? wrapAsync(handler)
      : handler));
}

// Red de seguridad: aunque algo se escape, el servidor sigue en pie
process.on('unhandledRejection', (reason) => {
  console.error(`Promesa rechazada sin capturar (el servidor continúa): ${reason?.message || reason}`);
});

const requireFirebaseUser = async (req, res, next) => {
  if (!firebaseAuth) return res.status(503).json({ error: 'Firebase Authentication no está configurado' });
  if (!firestoreDb) return res.status(503).json({ error: 'Firestore no está configurado para comprobar el rol' });
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sesión requerida' });

  try {
    req.firebaseUser = await firebaseAuth.verifyIdToken(token);
    const account = await firebaseAuth.getUser(req.firebaseUser.uid);
    if (account.disabled) {
      return res.status(403).json({
        code: 'account-disabled',
        error: 'Tu cuenta ha sido bloqueada por un administrador'
      });
    }
  } catch (error) {
    console.error(`Error autenticando solicitud: ${error?.code || 'unknown'} - ${error?.message || error}`);
    return res.status(401).json({ error: 'Sesión no válida' });
  }

  try {
    req.isAdmin = await resolveAdminStatus(req.firebaseUser, firestoreDb);
    return next();
  } catch (error) {
    console.error(`No se pudo comprobar o guardar el rol del usuario: ${error.message}`);
    return res.status(503).json({ error: 'No se pudo comprobar el rol del usuario' });
  }
};

const requireAuthWithAdmin = requireFirebaseUser;

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
  // Datos de nutrición de ejemplo (el resto de datos de catálogo vive en services/dataAccess.js)
  ingredients: [],
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

// ========== RUTAS DE PRUEBA ==========
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend funcionando correctamente', timestamp: new Date() });
});

// ========== RUTAS DE TIENDA ==========
app.get('/api/storeitems', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    const storeItems = await getStoreItems();
    res.json(storeItems);
  } catch (error) {
    console.error(`Error cargando productos de tienda: ${error.message}`);
    res.status(503).json({ error: 'El catálogo de la tienda no está disponible. Sincroniza los productos e inténtalo de nuevo.' });
  }
});

// ========== RUTAS DE EJERCICIOS ==========
app.get('/api/exercises', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
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
  res.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
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
app.get('/api/profile', requireAuthWithAdmin, async (req, res) => {
  const profileReference = firestoreDb.collection('profiles').doc(req.firebaseUser.uid);
  const snapshot = await profileReference.get();
  res.json({
    ...(snapshot.exists ? snapshot.data() : {}),
    id: req.firebaseUser.uid,
    uid: req.firebaseUser.uid,
    email: req.firebaseUser.email,
    isAdmin: req.isAdmin
  });
});

app.put('/api/profile', requireAuthWithAdmin, async (req, res) => {
  const { password, confirmPassword, ...profile } = req.body;
  delete profile.role;
  delete profile.isAdmin;
  const existingSnapshot = await firestoreDb.collection('profiles').doc(req.firebaseUser.uid).get();
  const existingProfile = existingSnapshot.exists ? existingSnapshot.data() : {};
  const isPlanOnlyUpdate = Object.keys(profile).length === 1 && typeof profile.plan === 'string';
  const validation = isPlanOnlyUpdate
    ? { ok: true }
    : validateProfileBusinessFields({ ...existingProfile, ...profile }, req.isAdmin);

  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const savedProfile = {
    ...existingProfile,
    ...profile,
    uid: req.firebaseUser.uid,
    email: req.firebaseUser.email,
    updatedAt: new Date()
  };
  await firestoreDb.collection('profiles').doc(req.firebaseUser.uid).set(savedProfile, { merge: true });
  res.json({ id: req.firebaseUser.uid, ...savedProfile, isAdmin: req.isAdmin });
});

// ========== PANEL DE ADMINISTRACIÓN ==========
// Estas rutas nunca aceptan un uid o rol enviado por el cliente como prueba de
// permisos: requireAdmin siempre consulta admins/{uid} en Firestore.
app.post('/api/admin/ai', requireAuthWithAdmin, requireAdmin, async (req, res) => {
  const parsed = parseAdminRequest(req.body || {});
  const confirmationToken = req.body.confirmToken || req.body.confirmationToken;
  const tokenDetails = !parsed.action && confirmationToken ? readConfirmationToken(confirmationToken) : null;
  if (tokenDetails && /^(confirmo|confirm|sí|si|yes|acepto)/i.test(parsed.message)) {
    parsed.action = tokenDetails.action;
    parsed.target = tokenDetails.target;
    parsed.updates = tokenDetails.updates || {};
  }
  if (!parsed.message || parsed.message.length > 2000) {
    const error = parsed.message ? 'Mensaje demasiado largo' : 'Falta el mensaje';
    return res.status(400).json({
      error, reply: error, action: null, requiresConfirmation: false,
      confirmationToken: null, data: null
    });
  }

  try {
    if (parsed.action) {
      if (!parsed.target) {
        return res.json({
          reply: 'Indica el email o UID del usuario para ejecutar esta acción.',
          action: parsed.action,
          requiresConfirmation: false,
          confirmationToken: null,
          data: null
        });
      }
      const confirmed = verifyConfirmationToken(
        confirmationToken, parsed.action, parsed.target, parsed.updates
      );
      if (!confirmed) {
        return res.json({
          reply: `La acción «${parsed.action}» requiere confirmación explícita. Reenvía la misma solicitud con confirmationToken.`,
          action: parsed.action,
          requiresConfirmation: true,
          confirmationToken: createConfirmationToken(parsed.action, parsed.target, parsed.updates),
          data: { target: parsed.target }
        });
      }
      const data = await executeAdminAction({
        ...parsed,
        requesterId: req.firebaseUser.uid,
        auth: firebaseAuth,
        firestore: firestoreDb
      });
      return res.json({
        reply: 'Acción administrativa ejecutada correctamente.',
        action: parsed.action,
        requiresConfirmation: false,
        confirmationToken: null,
        data
      });
    }

    const data = await queryData(parsed.message, firestoreDb, firebaseAuth);
    if (!data) {
      const { reply } = await generateChatReply({
        message: parsed.message,
        history: [],
        userId: req.firebaseUser.uid,
        profileData: { role: 'admin' },
        userData: null
      });
      return res.json({ reply, action: null, requiresConfirmation: false, confirmationToken: null, data: null });
    }
    return res.json({
      reply: 'Consulta administrativa completada. Los resultados están limitados por seguridad.',
      action: null,
      requiresConfirmation: false,
      confirmationToken: null,
      data
    });
  } catch (error) {
    console.error(`Error en IA administrativa: ${error.message}`);
    return res.status(400).json({
      error: error.message || 'No se pudo completar la solicitud administrativa',
      reply: error.message || 'No se pudo completar la solicitud administrativa',
      action: parsed.action || null,
      requiresConfirmation: false,
      confirmationToken: null,
      data: null
    });
  }
});

app.get('/api/admin/overview', requireAuthWithAdmin, requireAdmin, async (req, res) => {
  const [userPage, profilesSnapshot, adminSnapshot, workoutsSnapshot, ordersSnapshot, generatedPlansSnapshot] = await Promise.all([
    firebaseAuth.listUsers(1000),
    firestoreDb.collection('profiles').get(),
    firestoreDb.collection('admins').get(),
    firestoreDb.collection('workouts').limit(5000).get(),
    firestoreDb.collection('orders').limit(5000).get(),
    firestoreDb.collection('generatedPlans').limit(5000).get()
  ]);
  const activeUsers = userPage.users.filter(user => !user.disabled).length;
  const disabledUsers = userPage.users.length - activeUsers;
  const activeAdmins = adminSnapshot.docs.filter(document => document.data()?.enabled !== false).length;
  const locations = { gym: 0, home: 0, other: 0 };
  const plans = {};
  let savedExerciseCount = 0;
  let savedNutritionCount = 0;
  let cartItemsCount = 0;
  let usersWithCart = 0;
  let completeProfiles = 0;
  const exercisePopularity = {};
  const nutritionPopularity = {};
  profilesSnapshot.docs.forEach(document => {
    const profile = document.data() || {};
    const location = String(profile.trainingLocation || '').toLowerCase();
    if (location.includes('gimnas') || location.includes('gym')) locations.gym += 1;
    else if (location.includes('casa') || location.includes('home')) locations.home += 1;
    else locations.other += 1;
    const plan = String(profile.plan || 'sin plan');
    plans[plan] = (plans[plan] || 0) + 1;
    savedExerciseCount += Array.isArray(profile.favoriteExerciseIds) ? profile.favoriteExerciseIds.length : 0;
    savedNutritionCount += Array.isArray(profile.favoriteNutritionIds) ? profile.favoriteNutritionIds.length : 0;
    (profile.favoriteExerciseIds || []).forEach(id => {
      const key = String(id);
      exercisePopularity[key] = (exercisePopularity[key] || 0) + 1;
    });
    (profile.favoriteNutritionIds || []).forEach(id => {
      const key = String(id);
      nutritionPopularity[key] = (nutritionPopularity[key] || 0) + 1;
    });
    const cartItems = Array.isArray(profile.cartItems) ? profile.cartItems : [];
    cartItemsCount += cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    if (cartItems.length) usersWithCart += 1;
    if (profile.name && profile.email) completeProfiles += 1;
  });
  const recentActivityUsers = userPage.users.filter(user => {
    const lastSignIn = user.metadata?.lastSignInTime ? Date.parse(user.metadata.lastSignInTime) : 0;
    return lastSignIn >= Date.now() - 30 * 24 * 60 * 60 * 1000;
  }).length;
  const workoutDocs = workoutsSnapshot.docs.map(document => document.data());
  const recentWorkoutLimit = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentWorkouts = workoutDocs.filter(workout => {
    const date = workout.date?.toDate ? workout.date.toDate().getTime() : Date.parse(workout.date || '');
    return date >= recentWorkoutLimit;
  });
  const workoutUsers = new Set(workoutDocs.map(workout => workout.userId).filter(Boolean));
  const orderDocs = ordersSnapshot.docs.map(document => document.data());
  const generatedPlanDocs = generatedPlansSnapshot.docs.map(document => document.data());
  res.json({
    totalUsers: userPage.users.length,
    activeUsers,
    disabledUsers,
    profiles: profilesSnapshot.size,
    admins: activeAdmins,
    hasMoreUsers: Boolean(userPage.pageToken),
    activity: {
      recentActivityUsers,
      windowDays: 30,
      persistedWorkouts: true,
      totalWorkouts: workoutDocs.length,
      recentWorkouts: recentWorkouts.length,
      workoutUsers: workoutUsers.size,
      totalMinutes: workoutDocs.reduce((sum, workout) => sum + (Number(workout.duration) || 0), 0),
      totalCalories: workoutDocs.reduce((sum, workout) => sum + (Number(workout.calories) || 0), 0)
    },
    habits: {
      locations,
      plans
      ,
      generatedPlans: {
        total: Math.max(generatedPlanDocs.length, profilesSnapshot.docs.reduce((sum, document) => sum + (Number(document.data()?.generatedPlanCount) || 0), 0)),
        training: Math.max(generatedPlanDocs.filter(plan => plan.type === 'training').length, profilesSnapshot.docs.reduce((sum, document) => sum + (Number(document.data()?.generatedPlanCounts?.training) || 0), 0)),
        nutrition: Math.max(generatedPlanDocs.filter(plan => plan.type === 'nutrition').length, profilesSnapshot.docs.reduce((sum, document) => sum + (Number(document.data()?.generatedPlanCounts?.nutrition) || 0), 0))
      }
    },
    saved: {
      exerciseCount: savedExerciseCount,
      nutritionCount: savedNutritionCount,
      usersWithSavedExercises: profilesSnapshot.docs.filter(document =>
        (document.data()?.favoriteExerciseIds || []).length > 0
      ).length,
      usersWithSavedNutrition: profilesSnapshot.docs.filter(document =>
        (document.data()?.favoriteNutritionIds || []).length > 0
      ).length,
      cartItemsCount,
      usersWithCart,
      topExercises: Object.entries(exercisePopularity)
        .sort((first, second) => second[1] - first[1])
        .slice(0, 8)
        .map(([id, users]) => ({ id, users })),
      topNutrition: Object.entries(nutritionPopularity)
        .sort((first, second) => second[1] - first[1])
        .slice(0, 8)
        .map(([id, users]) => ({ id, users }))
    },
    store: {
      orders: orderDocs.length,
      unitsSold: orderDocs.reduce((sum, order) => sum + (order.items || []).reduce((items, item) => items + (Number(item.quantity) || 0), 0), 0),
      revenue: orderDocs.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
      productsSold: orderDocs.reduce((map, order) => {
        (order.items || []).forEach(item => {
          const key = String(item.id);
          map[key] = (map[key] || 0) + (Number(item.quantity) || 0);
        });
        return map;
      }, {})
    },
    completeProfiles
  });
});

app.get('/api/admin/users', requireAuthWithAdmin, requireAdmin, async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
  const page = await firebaseAuth.listUsers(limit, req.query.pageToken || undefined);
  const profileSnapshots = page.users.length
    ? await firestoreDb.getAll(...page.users.map(user => firestoreDb.collection('profiles').doc(user.uid)))
    : [];
  const profilesByUid = new Map(profileSnapshots.map(snapshot => [snapshot.id, snapshot.exists ? snapshot.data() : {}]));
  const search = String(req.query.search || '').trim().toLowerCase();
  const users = page.users
    .map(user => {
      const profile = profilesByUid.get(user.uid) || {};
      return {
        uid: user.uid,
        email: user.email || profile.email || '',
        displayName: user.displayName || profile.name || '',
        photoURL: user.photoURL || profile.photoURL || '',
        phoneNumber: user.phoneNumber || '',
        disabled: Boolean(user.disabled),
        emailVerified: Boolean(user.emailVerified),
        createdAt: user.metadata?.creationTime || null,
        lastSignInAt: user.metadata?.lastSignInTime || null,
        profile: {
          name: profile.name || '',
          lastName: profile.lastName || '',
          age: profile.age ?? null,
          city: profile.city || '',
          plan: profile.plan || '',
          trainingLocation: profile.trainingLocation || '',
          followsDiet: Boolean(profile.followsDiet),
          favoriteExerciseCount: Array.isArray(profile.favoriteExerciseIds) ? profile.favoriteExerciseIds.length : 0,
          favoriteNutritionCount: Array.isArray(profile.favoriteNutritionIds) ? profile.favoriteNutritionIds.length : 0,
          cartItemCount: Array.isArray(profile.cartItems)
            ? profile.cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
            : 0,
          updatedAt: profile.updatedAt || null
        }
      };
    })
    .filter(user => !search || [user.email, user.displayName, user.uid, user.profile.city]
      .some(value => String(value).toLowerCase().includes(search)));
  res.json({ users, nextPageToken: page.pageToken || null });
});

app.get('/api/admin/users/:uid', requireAuthWithAdmin, requireAdmin, async (req, res) => {
  const user = await firebaseAuth.getUser(req.params.uid);
  const profileSnapshot = await firestoreDb.collection('profiles').doc(user.uid).get();
  const adminSnapshot = await firestoreDb.collection('admins').doc(user.uid).get();
  const workoutSnapshot = await firestoreDb.collection('workouts').where('userId', '==', user.uid).get();
  const generatedPlansSnapshot = await firestoreDb.collection('generatedPlans').where('userId', '==', user.uid).get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() : {};
  const storedPlanCounts = profile.generatedPlanCounts || {};
  res.json({
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    phoneNumber: user.phoneNumber || '',
    disabled: Boolean(user.disabled),
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.metadata?.creationTime || null,
    lastSignInAt: user.metadata?.lastSignInTime || null,
    profile: {
      ...profile,
      favoriteExerciseCount: Array.isArray(profile.favoriteExerciseIds) ? profile.favoriteExerciseIds.length : 0,
      favoriteNutritionCount: Array.isArray(profile.favoriteNutritionIds) ? profile.favoriteNutritionIds.length : 0,
      cartItemCount: Array.isArray(profile.cartItems)
        ? profile.cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
        : 0,
      workoutCount: workoutSnapshot.size,
      generatedPlanCount: Math.max(generatedPlansSnapshot.size, Number(profile.generatedPlanCount) || 0),
      generatedTrainingPlanCount: Math.max(
        generatedPlansSnapshot.docs.filter(document => document.data()?.type === 'training').length,
        Number(storedPlanCounts.training) || 0
      ),
      generatedNutritionPlanCount: Math.max(
        generatedPlansSnapshot.docs.filter(document => document.data()?.type === 'nutrition').length,
        Number(storedPlanCounts.nutrition) || 0
      )
    },
    admin: adminSnapshot.exists ? { enabled: adminSnapshot.data()?.enabled !== false } : { enabled: false }
  });
});

app.patch('/api/admin/users/:uid/status', requireAuthWithAdmin, requireAdmin, async (req, res) => {
  if (req.params.uid === req.firebaseUser.uid) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
  }
  const disabled = Boolean(req.body.disabled);
  const user = await firebaseAuth.updateUser(req.params.uid, { disabled });
  res.json({
    uid: user.uid,
    disabled: Boolean(user.disabled),
    message: disabled ? 'Cuenta bloqueada por un administrador' : 'Cuenta activada correctamente'
  });
});

app.patch('/api/admin/users/:uid/role', requireAuthWithAdmin, requireAdmin, async (req, res) => {
  if (req.params.uid === req.firebaseUser.uid) {
    return res.status(400).json({ error: 'No puedes modificar tu propio rol' });
  }
  const enabled = Boolean(req.body.enabled);
  await firestoreDb.collection('admins').doc(req.params.uid).set({
    enabled,
    updatedAt: new Date(),
    updatedBy: req.firebaseUser.uid
  }, { merge: true });
  const savedAdmin = await firestoreDb.collection('admins').doc(req.params.uid).get();
  res.json({
    uid: req.params.uid,
    enabled: savedAdmin.exists && savedAdmin.data()?.enabled !== false,
    message: enabled ? 'Permisos de administrador concedidos correctamente' : 'Permisos de administrador revocados correctamente'
  });
});

// PUT /api/user/:id - verificar propiedad del recurso o admin
app.put('/api/user/:id', requireFirebaseUser, (req, res, next) => {
  if (req.isAdmin) return next();
  const resourceId = req.params.id;
  if (resourceId === req.firebaseUser.uid) return next();
  return res.status(403).json({ error: 'No tienes permiso para este recurso' });
}, async (req, res) => {
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

// DELETE /api/user/:id - solo admin o propietario
app.delete('/api/user/:id', requireFirebaseUser, (req, res, next) => {
  if (req.isAdmin) return next();
  if (req.params.id === req.firebaseUser.uid) return next();
  return res.status(403).json({ error: 'No tienes permiso para este recurso' });
}, (req, res) => {
  delete db.users[req.params.id];
  delete db.favorites[req.params.id];
  delete db.workouts[req.params.id];
  delete db.stats[req.params.id];
  res.json({ message: 'Usuario eliminado' });
});

// POST /api/user/:userId/workout - proteger con check de propiedad o admin
app.post('/api/user/:userId/workout', requireFirebaseUser, (req, res, next) => {
  if (req.isAdmin || req.params.userId === req.firebaseUser.uid) return next();
  return res.status(403).json({ error: 'No tienes permiso para este recurso' });
}, async (req, res) => {
  const { userId } = req.params;

  const parsed = parseWorkoutPayload(req.body, req.isAdmin);
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }

  if (!db.workouts[userId]) db.workouts[userId] = [];

  const workout = {
    id: uuidv4(),
    exerciseId: parsed.workout.exerciseId,
    duration: parsed.workout.duration,
    sets: parsed.workout.sets,
    calories: parsed.workout.calories,
    date: new Date(),
    completed: true
  };

  db.workouts[userId].push(workout);

  // Actualizar estadísticas
  if (!db.stats[userId]) db.stats[userId] = { totalCalories: 0, totalMinutes: 0, totalWorkouts: 0 };
  db.stats[userId].totalCalories += workout.calories;
  db.stats[userId].totalMinutes += workout.duration;
  db.stats[userId].totalWorkouts += 1;

  if (firestoreDb) {
    await firestoreDb.collection('workouts').doc(workout.id).set({
      ...workout,
      userId
    });
    await firestoreDb.collection('profiles').doc(userId).set({
      activityStats: db.stats[userId],
      lastWorkoutAt: workout.date
    }, { merge: true });
  }

  res.status(201).json(workout);
});

// POST /api/user/:userId/routines - proteger con check de propiedad o admin
app.post('/api/user/:userId/routines', requireFirebaseUser, (req, res, next) => {
  if (req.isAdmin || req.params.userId === req.firebaseUser.uid) return next();
  return res.status(403).json({ error: 'No tienes permiso para este recurso' });
}, (req, res) => {
  const { userId } = req.params;
  const { name, exercises, difficulty } = req.body;
  const routine = {
    id: uuidv4(),
    name,
    exercises,
    difficulty,
    createdAt: new Date(),
    completed: false
  };

  if (!db.workouts[userId]) db.workouts[userId] = [];

  // Guardar como rutina especial
  res.status(201).json(routine);
});

// GET /api/user/:userId/workouts - proteger con check de propiedad o admin
app.get('/api/user/:userId/workouts', requireFirebaseUser, (req, res, next) => {
  if (req.isAdmin || req.params.userId === req.firebaseUser.uid) return next();
  return res.status(403).json({ error: 'No tienes permiso para este recurso' });
}, (req, res) => {
  const workouts = db.workouts[req.params.userId] || [];
  if (!firestoreDb) return res.json(workouts);
  firestoreDb.collection('workouts')
    .where('userId', '==', req.params.userId)
    .limit(100)
    .get()
    .then(snapshot => res.json(snapshot.docs.map(document => document.data())))
    .catch(error => {
      console.error(`Error leyendo entrenamientos: ${error.message}`);
      res.status(500).json({ error: 'No se pudieron cargar los entrenamientos' });
    });
});

// GET /api/user/:userId/stats - proteger con check de propiedad o admin
app.get('/api/user/:userId/stats', requireFirebaseUser, (req, res, next) => {
  if (req.isAdmin || req.params.userId === req.firebaseUser.uid) return next();
  return res.status(403).json({ error: 'No tienes permiso para este recurso' });
}, (req, res) => {
  const fallback = db.stats[req.params.userId] || { totalCalories: 0, totalMinutes: 0, totalWorkouts: 0 };
  if (!firestoreDb) return res.json(fallback);
  firestoreDb.collection('profiles').doc(req.params.userId).get()
    .then(snapshot => res.json(snapshot.data()?.activityStats || fallback))
    .catch(error => {
      console.error(`Error leyendo estadísticas: ${error.message}`);
      res.status(500).json({ error: 'No se pudieron cargar las estadísticas' });
    });
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

app.post('/api/orders', requireFirebaseUser, async (req, res) => {
  const items = Array.isArray(req.body.items)
    ? req.body.items.filter(item => item && item.id != null && Number(item.quantity) > 0).map(item => ({
      id: String(item.id),
      name: String(item.name || 'Producto'),
      price: Number(item.price) || 0,
      quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1)
    }))
    : [];
  if (!items.length) return res.status(400).json({ error: 'El pedido no contiene productos' });
  const total = Number(req.body.total);
  if (!Number.isFinite(total) || total < 0) return res.status(400).json({ error: 'El total del pedido no es válido' });
  const order = {
    userId: req.firebaseUser.uid,
    email: req.firebaseUser.email || '',
    items,
    total,
    status: 'completed',
    createdAt: new Date()
  };
  const reference = await firestoreDb.collection('orders').add(order);
  res.status(201).json({ id: reference.id, ...order });
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

app.post('/api/user', requireAuthWithAdmin, async (req, res) => {
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

app.delete('/api/user/:id', requireFirebaseUser, requireOwnResource, (req, res) => {
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
  res.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
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

// ========== ASISTENTE IA REAL ==========
// Pregunta libre al asistente (responde solo sobre nutrición, ejercicio y tienda)
app.post('/api/ai/chat', requireAuthWithAdmin, async (req, res) => {
  const { message, history } = req.body || {};
  const text = String(message || '').trim();
  if (!text) return res.status(400).json({ error: 'Falta el mensaje' });
  if (text.length > 2000) return res.status(400).json({ error: 'Mensaje demasiado largo' });

  try {
    // Perfil y usuario son opcionales: si Firestore va lento o falla, seguimos
    // sin ellos en lugar de dejar al usuario esperando la respuesta.
    const [profileSnapshot, userSnapshot] = await Promise.all([
      firestoreRead(() => firestoreDb.collection('profiles').doc(req.firebaseUser.uid).get()),
      firestoreRead(() => firestoreDb.collection('users').doc(req.firebaseUser.uid).get())
    ]);
    const profileData = profileSnapshot?.exists ? profileSnapshot.data() : null;
    const userData = userSnapshot?.exists ? userSnapshot.data() : null;

    const { reply, provider } = await generateChatReply({ message: text, history, userId: req.firebaseUser.uid, profileData, userData });
    res.json({ reply, provider });
  } catch (error) {
    console.error(`Error en IA chat: ${error.message}`);
    res.status(500).json({ error: 'El asistente no está disponible ahora mismo' });
  }
});

// Genera plan completo de entrenamiento o nutrición (con progreso y recomendación cruzada)
app.post('/api/ai/generate-plan', requireAuthWithAdmin, async (req, res) => {
  const { type, input = {} } = req.body || {};
  const planType = type === 'training' ? 'training' : type === 'nutrition' ? 'nutrition' : null;
  if (!planType) return res.status(400).json({ error: "El 'type' debe ser 'training' o 'nutrition'" });

  try {
    const inputWithName = { ...input, name: input.name || req.firebaseUser.email?.split('@')[0] || 'Cliente' };
    const plan = planType === 'training'
      ? await buildTrainingPlan({ input: inputWithName, getExercises })
      : await buildNutritionPlan({ input: inputWithName, getIngredients });
    await firestoreDb.collection('generatedPlans').add({
      userId: req.firebaseUser.uid,
      type: planType,
      plan,
      createdAt: new Date()
    });
    const profileRef = firestoreDb.collection('profiles').doc(req.firebaseUser.uid);
    await firestoreDb.runTransaction(async transaction => {
      const snapshot = await transaction.get(profileRef);
      const profile = snapshot.exists ? snapshot.data() : {};
      const counts = profile.generatedPlanCounts || {};
      transaction.set(profileRef, {
        generatedPlanCount: (Number(profile.generatedPlanCount) || 0) + 1,
        generatedPlanCounts: {
          training: (Number(counts.training) || 0) + (planType === 'training' ? 1 : 0),
          nutrition: (Number(counts.nutrition) || 0) + (planType === 'nutrition' ? 1 : 0)
        },
        updatedAt: new Date()
      }, { merge: true });
    });
    res.json({
      plan,
      recommendation: buildCrossRecommendation(plan)
    });
  } catch (error) {
    console.error(`Error generando plan IA: ${error.message}`);
    res.status(500).json({ error: 'No se pudo generar el plan' });
  }
});

// Acepta la recomendación cruzada y genera el plan complementario
app.post('/api/ai/accept-recommendation', requireAuthWithAdmin, async (req, res) => {
  const { plan, input = {} } = req.body || {};
  if (!plan || (plan.type !== 'nutrition' && plan.type !== 'training')) {
    return res.status(400).json({ error: 'Falta el plan original' });
  }
  try {
    const inputWithName = { ...input, name: input.name || plan.name || 'Cliente' };
    const complementary = plan.type === 'nutrition'
      ? await buildTrainingPlan({ input: inputWithName, getExercises })
      : await buildNutritionPlan({ input: inputWithName, getIngredients });
    await firestoreDb.collection('generatedPlans').add({
      userId: req.firebaseUser.uid,
      type: complementary.type,
      plan: complementary,
      createdAt: new Date(),
      source: 'recommendation'
    });
    const profileRef = firestoreDb.collection('profiles').doc(req.firebaseUser.uid);
    await firestoreDb.runTransaction(async transaction => {
      const snapshot = await transaction.get(profileRef);
      const profile = snapshot.exists ? snapshot.data() : {};
      const counts = profile.generatedPlanCounts || {};
      transaction.set(profileRef, {
        generatedPlanCount: (Number(profile.generatedPlanCount) || 0) + 1,
        generatedPlanCounts: {
          training: (Number(counts.training) || 0) + (complementary.type === 'training' ? 1 : 0),
          nutrition: (Number(counts.nutrition) || 0) + (complementary.type === 'nutrition' ? 1 : 0)
        },
        updatedAt: new Date()
      }, { merge: true });
    });
    res.json({
      combinedPlan: { type: 'combined', name: inputWithName.name, trainingPlan: plan.type === 'training' ? plan : complementary, nutritionPlan: plan.type === 'nutrition' ? plan : complementary },
      complementaryPlan: complementary,
      recommendation: null
    });
  } catch (error) {
    console.error(`Error aceptando recomendación: ${error.message}`);
    res.status(500).json({ error: 'No se pudo generar el plan complementario' });
  }
});

// PDF del plan (individual o combinado)
app.post('/api/ai/generate-pdf', async (req, res) => {
  const { plan, language } = req.body;
  if (!plan || !['training', 'nutrition', 'combined'].includes(plan.type)) {
    return res.status(400).json({ error: 'Plan no válido' });
  }
  try {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    buildPlanPdf(doc, plan, language);
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=plan-${plan.type}-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    });
    doc.end();
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ success: false, error: 'No se pudo generar el PDF' });
  }
});

// Endpoint para enviar plan por email
app.post('/api/ai/send-plan', async (req, res) => {
  const { email, plan } = req.body;

  try {
  const isTraining = plan.type === 'training' || plan.type === 'combined';
  const subject = plan.type === 'combined'
    ? 'Tu Plan Completo (Entrenamiento + Nutrición)'
    : isTraining
      ? 'Tu Plan de Entrenamiento Personalizado'
      : 'Tu Plan de Nutrición Personalizado';

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

// ========== MANEJO DE ERRORES ==========
// Cualquier error de una ruta responde 500 y deja el servidor funcionando
app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(`Error en ${req.method} ${req.originalUrl}: ${error.message}`);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 API disponible en http://localhost:${PORT}/api`);

  // Precarga el catálogo en segundo plano: así la primera pregunta al asistente
  // ya se responde con los datos reales de Firestore (y no con los locales).
  Promise.allSettled([getExercises(), getIngredients(), getStoreItems()]).then((results) => {
    const [exercises, ingredients, storeItems] = results;
    const size = (result) => result.status === 'fulfilled' ? (Array.isArray(result.value) ? result.value.length : 0) : 0;
    console.log(`📚 Catálogo precargado: ${size(exercises)} ejercicios, ${size(ingredients)} alimentos, ${size(storeItems)} productos`);
  });
});
