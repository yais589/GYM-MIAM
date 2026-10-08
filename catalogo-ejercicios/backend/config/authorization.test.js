import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveUserRole } from './authorization.js';

function createFirestore(initialData = {}) {
  const state = { collections: {}, writes: [] };
  for (const [collectionName, data] of Object.entries(initialData)) {
    state.collections[collectionName] = data;
  }

  const firestore = {
    collection: (collectionName) => {
      return {
        doc: (uid) => ({
          get: async () => ({
            exists: state.collections[collectionName]?.[uid] != null,
            data: () => state.collections[collectionName]?.[uid] || null
          }),
          set: async (data, options) => {
            state.writes.push({ collectionName, uid, data, options });
            state.collections[collectionName] ||= {};
            state.collections[collectionName][uid] = {
              ...state.collections[collectionName][uid],
              ...data
            };
          }
        })
      };
    }
  };

  return { firestore, state };
}

test('persists admin role for the configured email, regardless of email casing', async () => {
  const { firestore, state } = createFirestore({ profiles: { 'admin-uid': { name: 'Admin' } } });

  const role = await resolveUserRole(
    { uid: 'admin-uid', email: 'ADMIN@example.com' },
    firestore,
    { ADMIN_EMAIL: 'admin@example.com' }
  );

  assert.equal(role, 'admin');
  assert.equal(state.collections.userRoles['admin-uid'].role, 'admin');
  assert.equal(state.collections.profiles['admin-uid'].role, 'admin');
  assert.equal(state.collections.profiles['admin-uid'].uid, 'admin-uid');
  assert.equal(state.collections.profiles['admin-uid'].name, 'Admin');
  assert.equal(state.writes.length, 2);
});

test('persists the user role for a profile without a role', async () => {
  const { firestore, state } = createFirestore({ profiles: { 'user-uid': { name: 'User', role: 'admin' } } });

  const role = await resolveUserRole(
    { uid: 'user-uid', email: 'user@example.com' },
    firestore,
    { ADMIN_EMAIL: 'admin@example.com' }
  );

  assert.equal(role, 'user');
  assert.equal(state.collections.userRoles['user-uid'].role, 'user');
  assert.equal(state.collections.profiles['user-uid'].role, 'user');
  assert.equal(state.writes.length, 2);
});

test('uses an existing persisted admin role for another account', async () => {
  const { firestore, state } = createFirestore({
    userRoles: {
      'user-uid': { uid: 'user-uid', role: 'admin' }
    },
    profiles: {
      'user-uid': { uid: 'user-uid', role: 'admin' }
    }
  });

  const role = await resolveUserRole(
    { uid: 'user-uid', email: 'user@example.com' },
    firestore,
    { ADMIN_EMAIL: 'admin@example.com' }
  );

  assert.equal(role, 'admin');
  assert.equal(state.writes.length, 0);
});

test('rejects role resolution when Firestore or a uid is unavailable', async () => {
  await assert.rejects(resolveUserRole({ uid: 'user-uid' }, null), /Firestore no está configurado/);
  await assert.rejects(resolveUserRole({ email: 'user@example.com' }, {}), /no tiene un identificador/);
});
