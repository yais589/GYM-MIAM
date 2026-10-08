const DEFAULT_ADMIN_EMAIL = 'yais589@vidalibarraquer.net';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function getAdminEmail(env = process.env) {
  return normalizeEmail(env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL);
}

export function isAdminEmail(user, env = process.env) {
  const email = user && typeof user === 'object' ? user.email : user;
  return Boolean(email) && normalizeEmail(email) === getAdminEmail(env);
}

export async function resolveAdminStatus(user, firestore, env = process.env) {
  if (!firestore) {
    throw new Error('Firestore no está configurado');
  }
  if (!user?.uid) {
    throw new Error('El usuario autenticado no tiene un identificador');
  }

  const adminReference = firestore.collection('admins').doc(user.uid);
  const adminSnapshot = await adminReference.get();
  const adminData = adminSnapshot.exists ? adminSnapshot.data() : null;
  const configuredAdmin = isAdminEmail(user, env);

  if (configuredAdmin && (!adminSnapshot.exists || adminData?.enabled === false)) {
    await adminReference.set({
      uid: user.uid,
      email: user.email || null,
      enabled: true,
      updatedAt: new Date()
    }, { merge: true });
    return true;
  }

  return configuredAdmin || Boolean(adminSnapshot.exists && adminData?.enabled !== false);
}

export function getRequestedUserId(req) {
  return req?.params?.userId || req?.params?.id || null;
}

export function canAccessUserResource(req) {
  if (req?.isAdmin) return true;
  const resourceId = getRequestedUserId(req);
  if (!resourceId) return true;
  return resourceId === req?.firebaseUser?.uid;
}

export function requireOwnResource(req, res, next) {
  if (canAccessUserResource(req)) return next();
  return res.status(403).json({ error: 'No tienes permiso para este recurso' });
}

export function requireAdmin(req, res, next) {
  if (req?.isAdmin) return next();
  return res.status(403).json({ error: 'No tienes permisos de administrador' });
}

export function validateProfileBusinessFields(profile = {}, isAdmin = false) {
  if (isAdmin) return { ok: true };

  const name = typeof profile.name === 'string' ? profile.name.trim() : '';
  const email = typeof profile.email === 'string' ? profile.email.trim() : '';
  if (!name || !email) {
    return { ok: false, error: 'El nombre y el email son obligatorios' };
  }

  return { ok: true };
}

export function parseWorkoutPayload(body = {}, isAdmin = false) {
  const exerciseId = body.exerciseId;
  const duration = Number(body.duration);
  const calories = Number(body.calories);

  if (!isAdmin) {
    if (exerciseId == null || exerciseId === '') {
      return { ok: false, error: 'El ejercicio es obligatorio' };
    }
    if (!Number.isFinite(duration) || duration < 1) {
      return { ok: false, error: 'La duración debe ser un número válido' };
    }
  }

  return {
    ok: true,
    workout: {
      exerciseId: exerciseId == null || exerciseId === '' ? null : exerciseId,
      duration: Number.isFinite(duration) ? duration : 0,
      calories: Number.isFinite(calories) ? calories : 0
    }
  };
}

export { DEFAULT_ADMIN_EMAIL };
