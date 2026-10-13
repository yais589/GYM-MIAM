import crypto from 'node:crypto';

const TOKEN_TTL_MS = 5 * 60 * 1000;
const MAX_RESULTS = 25;
const tokenSecret = process.env.ADMIN_AI_CONFIRM_SECRET || crypto.randomBytes(32).toString('hex');

const clean = (value) => String(value ?? '').trim();
const MAX_MESSAGE_LENGTH = 2000;
const timestamp = (value) => value?.toDate ? value.toDate().toISOString() : value ?? null;
const safeDoc = (snapshot) => {
  const data = snapshot.data() || {};
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, timestamp(value)]));
};

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

const formatCount = (value) => Number(value || 0).toLocaleString('es-ES');
const normalizeSearch = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

function sign(payload) {
  return crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
}

export function createConfirmationToken(action, target, updates = {}) {
  const payload = JSON.stringify({ action, target, updates, exp: Date.now() + TOKEN_TTL_MS });
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

export function verifyConfirmationToken(token, action, target, updates = {}) {
  const expected = readConfirmationToken(token);
  return Boolean(expected && expected.action === action && expected.target === target
    && JSON.stringify(expected.updates || {}) === JSON.stringify(updates || {}));
}

export function readConfirmationToken(token) {
  try {
    const [encoded, signature] = clean(token).split('.');
    const payload = Buffer.from(encoded, 'base64url').toString('utf8');
    const expected = JSON.parse(payload);
    const validSignature = crypto.timingSafeEqual(
      Buffer.from(signature || ''),
      Buffer.from(sign(payload))
    );
    return validSignature && expected.exp > Date.now() ? expected : null;
  } catch {
    return null;
  }
}

function findTarget(message, body = {}) {
  const explicit = clean(body.userId || body.uid || body.email);
  if (explicit) return explicit;
  const email = clean(message).match(/[^\s,;]+@[^\s,;]+\.[^\s,;]+/i);
  if (email) return email[0];
  const uid = clean(message).match(/\b[A-Za-z0-9_-]{20,}\b/);
  return uid?.[0] || '';
}

export function parseAdminRequest(body = {}) {
  const message = clean(body.message);
  const lower = message.toLowerCase();
  const explicitAction = clean(body.action).toLowerCase();
  const action = explicitAction || (
    /(eliminar|borrar|borra|delete).*(perfil|usuario|cuenta)/.test(lower) ? 'delete-profile' :
    /(bloquea|bloquear|desactiva|suspende)/.test(lower) ? 'block-user' :
    /(activa|activar|desbloquea|habilita)/.test(lower) ? 'activate-user' :
    /(concede|conceder|otorga|dar).*(admin|administrador)/.test(lower) ? 'grant-admin' :
    /(revoca|revocar|quita).*(admin|administrador)/.test(lower) ? 'revoke-admin' :
    /(actualiza|actualizar|cambia|cambiar|edita|editar).*(perfil|plan)/.test(lower) ? 'update-profile' : null
  );
  const updates = body.updates && typeof body.updates === 'object' ? body.updates : {};
  const planMatch = lower.match(/\b(plan|suscripci[oó]n)\s*(?:a|:)?\s*(gratuito|free|premium|pro|mensual|anual)\b/);
  if (planMatch && !updates.plan) updates.plan = planMatch[2];
  return { message, action, target: findTarget(message, body), updates };
}

export function validateAdminInteraction(interaction = {}) {
  const message = clean(interaction.message);
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    throw new Error('La interacción debe contener un mensaje válido de hasta 2000 caracteres');
  }
  const allowedStatus = ['received', 'completed', 'confirmation-required', 'error'];
  const status = allowedStatus.includes(interaction.status) ? interaction.status : 'completed';
  return {
    userId: clean(interaction.userId),
    message,
    action: clean(interaction.action) || null,
    target: clean(interaction.target) || null,
    status,
    reply: clean(interaction.reply).slice(0, 5000),
    data: interaction.data && typeof interaction.data === 'object' ? interaction.data : null,
    createdAt: interaction.createdAt || new Date()
  };
}

export async function saveAdminInteraction(firestore, interaction) {
  const valid = validateAdminInteraction(interaction);
  const reference = await firestore.collection('adminAiInteractions').add(valid);
  return { id: reference.id, ...valid };
}

async function resolveUser(target, auth) {
  if (!target) return null;
  try {
    return target.includes('@') ? await auth.getUserByEmail(target) : await auth.getUser(target);
  } catch (error) {
    if (error?.code === 'auth/invalid-uid') return null;
    throw error;
  }
}

async function resolveNamedUser(message, firestore, auth) {
  const explicitTarget = findTarget(message);
  if (explicitTarget) return resolveUser(explicitTarget, auth);

  const users = await listAllAuthUsers(auth);
  const profilesSnapshot = await firestore.collection('profiles').get();
  const searchText = normalizeSearch(message);
  const candidates = users.map(user => {
    const profile = profilesSnapshot.docs.find(document => document.id === user.uid)?.data() || {};
    const fullName = [profile.name, profile.lastName].filter(Boolean).join(' ');
    return { user, profile, fullName };
  });
  const match = candidates.find(({ user, fullName }) => {
    const names = [fullName, user.displayName, user.email].filter(Boolean).map(normalizeSearch);
    return names.some(name => name && searchText.includes(name));
  });
  return match?.user || null;
}

async function queryData(message, firestore, auth, catalog = {}) {
  const lower = message.toLowerCase();
  const user = await resolveNamedUser(message, firestore, auth);
  const userId = user?.uid;
  const response = {};
  if (/(admin|administrador)/.test(lower) && /(cu[aá]nt|n[uú]mero|total|hay|cu[aá]ntos)/.test(lower)) {
    const [adminSnapshot, users] = await Promise.all([
      firestore.collection('admins').get(),
      listAllAuthUsers(auth)
    ]);
    const usersById = new Map(users.map(item => [item.uid, item]));
    const activeAdmins = adminSnapshot.docs.filter(document => {
      const admin = document.data() || {};
      return admin.enabled !== false && usersById.has(document.id);
    });
    response.admins = { total: activeAdmins.length };
    response.answer = `Hay ${formatCount(activeAdmins.length)} administrador${activeAdmins.length === 1 ? '' : 'es'} activo${activeAdmins.length === 1 ? '' : 's'}.`;
  } else if (/(cuenta|usuario|usuarios|cuentas)/.test(lower) && /(activa|activas|activo|activos|habilitad|conectad)/.test(lower)) {
    const users = await listAllAuthUsers(auth);
    const activeUsers = users.filter(item => !item.disabled);
    response.accounts = { total: users.length, active: activeUsers.length, disabled: users.length - activeUsers.length };
    response.answer = `Hay ${formatCount(activeUsers.length)} cuenta${activeUsers.length === 1 ? '' : 's'} activa${activeUsers.length === 1 ? '' : 's'} de ${formatCount(users.length)} cuenta${users.length === 1 ? '' : 's'} registrada${users.length === 1 ? '' : 's'}.`;
  } else if (/(cuenta|usuario|usuarios|cuentas)/.test(lower) && /(total|registrad|hay|cu[aá]nt)/.test(lower)) {
    const users = await listAllAuthUsers(auth);
    response.accounts = { total: users.length };
    response.answer = `Hay ${formatCount(users.length)} cuenta${users.length === 1 ? '' : 's'} registrada${users.length === 1 ? '' : 's'}.`;
  } else if (user && /(cuenta|usuario|perfil)/.test(lower) && /(informaci[oó]n|datos|detalle|detall|todo|toda|completa)/.test(lower)) {
    const [profileSnapshot, adminSnapshot, workoutsSnapshot, plansSnapshot] = await Promise.all([
      firestore.collection('profiles').doc(user.uid).get(),
      firestore.collection('admins').doc(user.uid).get(),
      firestore.collection('workouts').where('userId', '==', user.uid).get(),
      firestore.collection('generatedPlans').where('userId', '==', user.uid).get()
    ]);
    const profile = profileSnapshot.exists ? profileSnapshot.data() || {} : {};
    const favoriteExercises = Array.isArray(profile.favoriteExerciseIds) ? profile.favoriteExerciseIds.length : 0;
    const favoriteNutrition = Array.isArray(profile.favoriteNutritionIds) ? profile.favoriteNutritionIds.length : 0;
    const cartItems = Array.isArray(profile.cartItems)
      ? profile.cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
      : 0;
    const isAdmin = adminSnapshot.exists && adminSnapshot.data()?.enabled !== false;
    const status = user.disabled ? 'desactivada' : 'activa';
    const fullName = [profile.name, profile.lastName].filter(Boolean).join(' ') || user.displayName || 'Sin nombre';
    const createdAt = user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('es-ES') : 'no disponible';
    const lastSignIn = user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString('es-ES') : 'nunca';
    const plan = profile.plan || 'sin plan';
    response.account = {
      uid: user.uid,
      name: fullName,
      email: user.email || profile.email || '',
      status,
      emailVerified: Boolean(user.emailVerified),
      isAdmin,
      createdAt,
      lastSignIn,
      plan,
      city: profile.city || null,
      age: profile.age ?? null,
      trainingLocation: profile.trainingLocation || null,
      followsDiet: Boolean(profile.followsDiet),
      favoriteExercises,
      favoriteNutrition,
      workouts: workoutsSnapshot.size,
      generatedPlans: plansSnapshot.size,
      cartItems
    };
    response.answer = `${fullName}: email ${response.account.email}; cuenta ${status}; email verificado ${response.account.emailVerified ? 'sí' : 'no'}; administrador ${isAdmin ? 'sí' : 'no'}; plan ${plan}; ciudad ${response.account.city || 'no indicada'}; edad ${response.account.age ?? 'no indicada'}; ubicación de entrenamiento ${response.account.trainingLocation || 'no indicada'}; sigue dieta ${response.account.followsDiet ? 'sí' : 'no'}; ${formatCount(favoriteExercises)} ejercicios favoritos; ${formatCount(favoriteNutrition)} alimentos favoritos; ${formatCount(workoutsSnapshot.size)} entrenamientos; ${formatCount(plansSnapshot.size)} planes generados; ${formatCount(cartItems)} productos en carrito; cuenta creada el ${createdAt}; último acceso ${lastSignIn}; UID ${user.uid}.`;
  } else if (/(favorit|guardad|marcad)/.test(lower)) {
    const snapshot = user
      ? await firestore.collection('profiles').doc(user.uid).get()
      : await firestore.collection('profiles').get();
    const profileDocuments = user ? (snapshot.exists ? [snapshot] : []) : snapshot.docs;
    const totals = profileDocuments.reduce((result, doc) => {
      const profile = doc.data() || {};
      const exercises = Array.isArray(profile.favoriteExerciseIds) ? profile.favoriteExerciseIds : [];
      const nutrition = Array.isArray(profile.favoriteNutritionIds) ? profile.favoriteNutritionIds : [];
      result.exerciseFavorites += exercises.length;
      result.nutritionFavorites += nutrition.length;
      if (exercises.length || nutrition.length) result.usersWithFavorites += 1;
      return result;
    }, { exerciseFavorites: 0, nutritionFavorites: 0, usersWithFavorites: 0 });
    response.favorites = { ...totals, profilesChecked: profileDocuments.length, uid: user?.uid || null };
    const asksNutrition = /(nutric|alimento|comida)/.test(lower);
    const asksExercise = /(ejercicio|rutina|gym)/.test(lower);
    const total = asksNutrition ? totals.nutritionFavorites : asksExercise ? totals.exerciseFavorites : totals.exerciseFavorites + totals.nutritionFavorites;
    const label = asksNutrition ? 'favoritos de nutrición' : asksExercise ? 'ejercicios favoritos' : 'elementos favoritos';
    if (user) {
      const profile = profileDocuments[0]?.data() || {};
      const exerciseIds = Array.isArray(profile.favoriteExerciseIds) ? profile.favoriteExerciseIds : [];
      const nutritionIds = Array.isArray(profile.favoriteNutritionIds) ? profile.favoriteNutritionIds : [];
      const [exercises, ingredients] = await Promise.all([
        catalog.getExercises ? catalog.getExercises() : [],
        catalog.getIngredients ? catalog.getIngredients() : []
      ]);
      const exerciseMap = new Map(exercises.map(item => [String(item.id), item.name]));
      const nutritionMap = new Map(ingredients.map(item => [String(item.id), item.name || item.common_name]));
      const favoriteNames = [
        ...exerciseIds.map(id => ({ type: 'ejercicio', name: exerciseMap.get(String(id)) || `Ejercicio #${id}` })),
        ...nutritionIds.map(id => ({ type: 'alimento', name: nutritionMap.get(String(id)) || `Alimento #${id}` }))
      ];
      const selectedFavorites = asksNutrition
        ? favoriteNames.filter(item => item.type === 'alimento')
        : asksExercise ? favoriteNames.filter(item => item.type === 'ejercicio') : favoriteNames;
      response.favorites.items = selectedFavorites;
      const profileName = [profile.name, profile.lastName].filter(Boolean).join(' ');
      const personName = profileName || user.displayName || user.email || 'Esta cuenta';
      response.answer = selectedFavorites.length
        ? `${personName} tiene ${formatCount(selectedFavorites.length)} favorito${selectedFavorites.length === 1 ? '' : 's'}: ${selectedFavorites.map(item => item.name).join(', ')}.`
        : `${personName} no tiene favoritos guardados.`;
    } else {
      response.answer = `Hay ${formatCount(total)} ${label}, repartidos entre ${formatCount(totals.usersWithFavorites)} usuario${totals.usersWithFavorites === 1 ? '' : 's'}.`;
    }
  } else if (/(m[eé]trica|estad[ií]stica|resumen|dashboard)/.test(lower)) {
    const [users, profiles, workouts, orders] = await Promise.all([
      listAllAuthUsers(auth),
      firestore.collection('profiles').get(),
      firestore.collection('workouts').get(),
      firestore.collection('orders').get()
    ]);
    response.metrics = {
      users: users.length,
      activeUsers: users.filter((item) => !item.disabled).length,
      disabledUsers: users.filter((item) => item.disabled).length,
      profiles: profiles.size,
      workouts: workouts.size,
      orders: orders.size,
      orderRevenue: orders.docs.reduce((sum, item) => sum + (Number(item.data()?.total) || 0), 0)
    };
    response.answer = `Resumen real: ${formatCount(response.metrics.users)} usuarios, ${formatCount(response.metrics.activeUsers)} cuentas activas, ${formatCount(response.metrics.workouts)} entrenamientos y ${formatCount(response.metrics.orders)} pedidos.`;
  } else if (/(entrenamiento|rutina|workout)/.test(lower)) {
    const query = userId
      ? firestore.collection('workouts').where('userId', '==', userId).limit(MAX_RESULTS)
      : firestore.collection('workouts').limit(MAX_RESULTS);
    const snapshot = await query.get();
    response.workouts = snapshot.docs.map((doc) => ({ id: doc.id, ...safeDoc(doc) }));
    response.answer = user
      ? `${user.email || 'El usuario'} tiene ${formatCount(response.workouts.length)} entrenamiento${response.workouts.length === 1 ? '' : 's'} registrado${response.workouts.length === 1 ? '' : 's'} en esta consulta.`
      : `Hay ${formatCount(response.workouts.length)} entrenamiento${response.workouts.length === 1 ? '' : 's'} registrado${response.workouts.length === 1 ? '' : 's'} en la consulta.`;
  } else if (/(pedido|compra|venta|orden)/.test(lower)) {
    const query = userId
      ? firestore.collection('orders').where('userId', '==', userId).limit(MAX_RESULTS)
      : firestore.collection('orders').limit(MAX_RESULTS);
    const snapshot = await query.get();
    response.orders = snapshot.docs.map((doc) => ({ id: doc.id, ...safeDoc(doc) }));
    const revenue = response.orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    response.answer = `Hay ${formatCount(response.orders.length)} pedido${response.orders.length === 1 ? '' : 's'} registrado${response.orders.length === 1 ? '' : 's'}, con un importe acumulado de ${revenue.toFixed(2)} €. `;
  } else if (/(plan|rutina)/.test(lower) && /(generad|cread|historial|todos)/.test(lower)) {
    const query = userId
      ? firestore.collection('generatedPlans').where('userId', '==', userId).limit(MAX_RESULTS)
      : firestore.collection('generatedPlans').limit(MAX_RESULTS);
    const snapshot = await query.get();
    response.generatedPlans = snapshot.docs.map((doc) => ({ id: doc.id, ...safeDoc(doc) }));
    response.answer = `Hay ${formatCount(response.generatedPlans.length)} plan${response.generatedPlans.length === 1 ? '' : 'es'} generado${response.generatedPlans.length === 1 ? '' : 's'} en la consulta.`;
  } else if (/(plan|perfil|usuario)/.test(lower)) {
    if (user) {
      const [profile, admin] = await Promise.all([
        firestore.collection('profiles').doc(user.uid).get(),
        firestore.collection('admins').doc(user.uid).get()
      ]);
      response.user = {
        uid: user.uid, email: user.email || '', displayName: user.displayName || '',
        disabled: Boolean(user.disabled), profile: profile.exists ? safeDoc(profile) : null,
        isAdmin: admin.exists && admin.data()?.enabled !== false
      };
      response.answer = `${user.email || 'El usuario'} tiene la cuenta ${user.disabled ? 'desactivada' : 'activa'}${response.user.isAdmin ? ' y permisos de administrador' : ''}.`;
    } else {
      const users = await listAllAuthUsers(auth);
      response.users = users.slice(0, MAX_RESULTS).map((item) => ({
        uid: item.uid, email: item.email || '', displayName: item.displayName || '',
        disabled: Boolean(item.disabled)
      }));
      response.answer = `He encontrado ${formatCount(users.length)} usuarios registrados. Para consultar una cuenta concreta, indica su email o UID.`;
    }
  } else {
    return null;
  }
  return response;
}

export async function executeAdminAction({ action, target, updates, requesterId, auth, firestore }) {
  const user = await resolveUser(target, auth);
  if (!user) throw new Error('No se encontró el usuario indicado');
  if (user.uid === requesterId && ['block-user', 'grant-admin', 'revoke-admin', 'delete-profile'].includes(action)) {
    throw new Error('No puedes modificar tu propia cuenta o permisos');
  }
  if (action === 'block-user' || action === 'activate-user') {
    const updated = await auth.updateUser(user.uid, { disabled: action === 'block-user' });
    return { uid: updated.uid, disabled: Boolean(updated.disabled) };
  }
  if (action === 'grant-admin' || action === 'revoke-admin') {
    const enabled = action === 'grant-admin';
    await firestore.collection('admins').doc(user.uid).set({ enabled, updatedAt: new Date(), updatedBy: requesterId }, { merge: true });
    return { uid: user.uid, enabled };
  }
  if (action === 'update-profile') {
    const allowed = ['name', 'lastName', 'age', 'city', 'plan', 'trainingLocation', 'followsDiet'];
    const profile = Object.fromEntries(Object.entries(updates).filter(([key]) => allowed.includes(key)));
    if (!Object.keys(profile).length) throw new Error('Indica al menos un campo de perfil o plan que actualizar');
    profile.updatedAt = new Date();
    await firestore.collection('profiles').doc(user.uid).set(profile, { merge: true });
    return { uid: user.uid, updatedFields: Object.keys(profile).filter((key) => key !== 'updatedAt') };
  }
  if (action === 'delete-profile') {
    await firestore.collection('profiles').doc(user.uid).delete();
    return { uid: user.uid, profileDeleted: true };
  }
  throw new Error('Acción administrativa no reconocida');
}

export { queryData };
