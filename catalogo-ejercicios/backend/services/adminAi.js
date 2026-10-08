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

async function queryData(message, firestore, auth) {
  const lower = message.toLowerCase();
  const target = findTarget(message);
  const user = target ? await resolveUser(target, auth) : null;
  const userId = user?.uid;
  const response = {};
  if (/(m[eé]trica|estad[ií]stica|resumen|dashboard)/.test(lower)) {
    const [users, profiles, workouts, orders] = await Promise.all([
      auth.listUsers(100),
      firestore.collection('profiles').limit(MAX_RESULTS).get(),
      firestore.collection('workouts').limit(MAX_RESULTS).get(),
      firestore.collection('orders').limit(MAX_RESULTS).get()
    ]);
    response.metrics = {
      users: users.users.length,
      disabledUsers: users.users.filter((item) => item.disabled).length,
      profiles: profiles.size,
      workouts: workouts.size,
      orders: orders.size,
      orderRevenue: orders.docs.reduce((sum, item) => sum + (Number(item.data()?.total) || 0), 0)
    };
  } else if (/(favorit|guardad)/.test(lower)) {
    const snapshot = await firestore.collection('profiles').limit(MAX_RESULTS).get();
    response.favorites = snapshot.docs.map((doc) => ({
      uid: doc.id,
      exerciseCount: Array.isArray(doc.data()?.favoriteExerciseIds) ? doc.data().favoriteExerciseIds.length : 0,
      nutritionCount: Array.isArray(doc.data()?.favoriteNutritionIds) ? doc.data().favoriteNutritionIds.length : 0
    }));
  } else if (/(entrenamiento|rutina|workout)/.test(lower)) {
    const query = userId
      ? firestore.collection('workouts').where('userId', '==', userId).limit(MAX_RESULTS)
      : firestore.collection('workouts').limit(MAX_RESULTS);
    const snapshot = await query.get();
    response.workouts = snapshot.docs.map((doc) => ({ id: doc.id, ...safeDoc(doc) }));
  } else if (/(pedido|compra|venta|orden)/.test(lower)) {
    const query = userId
      ? firestore.collection('orders').where('userId', '==', userId).limit(MAX_RESULTS)
      : firestore.collection('orders').limit(MAX_RESULTS);
    const snapshot = await query.get();
    response.orders = snapshot.docs.map((doc) => ({ id: doc.id, ...safeDoc(doc) }));
  } else if (/(plan|rutina)/.test(lower) && /(generad|cread|historial|todos)/.test(lower)) {
    const query = userId
      ? firestore.collection('generatedPlans').where('userId', '==', userId).limit(MAX_RESULTS)
      : firestore.collection('generatedPlans').limit(MAX_RESULTS);
    const snapshot = await query.get();
    response.generatedPlans = snapshot.docs.map((doc) => ({ id: doc.id, ...safeDoc(doc) }));
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
    } else {
      const page = await auth.listUsers(25);
      response.users = page.users.map((item) => ({
        uid: item.uid, email: item.email || '', displayName: item.displayName || '',
        disabled: Boolean(item.disabled)
      }));
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
