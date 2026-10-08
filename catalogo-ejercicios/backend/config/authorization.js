export async function isAdminUser(user, firestore) {
  if (!user?.uid || !firestore) return false;
  const snapshot = await firestore.collection('admins').doc(user.uid).get();
  return snapshot.exists && snapshot.data()?.enabled !== false;
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
  const sets = Number(body.sets);
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
      sets: Number.isInteger(sets) && sets > 0 ? sets : 1,
      calories: Number.isFinite(calories) ? calories : 0
    }
  };
}
