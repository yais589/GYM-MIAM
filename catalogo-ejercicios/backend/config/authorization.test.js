import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAdminStatus } from './authorization.js';

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

test('persists an enabled admin document for the configured email, regardless of email casing', async () => {
  const { firestore, state } = createFirestore();

  const isAdmin = await resolveAdminStatus(
    { uid: 'admin-uid', email: 'ADMIN@example.com' },
    firestore,
    { ADMIN_EMAIL: 'admin@example.com' }
  );

  assert.equal(isAdmin, true);
  assert.equal(state.collections.admins['admin-uid'].enabled, true);
  assert.equal(state.collections.admins['admin-uid'].uid, 'admin-uid');
  assert.equal(state.collections.admins['admin-uid'].email, 'ADMIN@example.com');
  assert.equal(state.writes.length, 1);
});

test('does not grant admin access based on an untrusted profile role', async () => {
  const { firestore, state } = createFirestore({
    profiles: { 'user-uid': { role: 'admin' } }
  });

  const isAdmin = await resolveAdminStatus(
    { uid: 'user-uid', email: 'user@example.com' },
    firestore,
    { ADMIN_EMAIL: 'admin@example.com' }
  );

  assert.equal(isAdmin, false);
  assert.equal(state.collections.admins?.['user-uid'], undefined);
  assert.equal(state.writes.length, 0);
});

test('uses an existing persisted admin role for another account', async () => {
  const { firestore, state } = createFirestore({
    admins: {
      'user-uid': { uid: 'user-uid', enabled: true }
    }
  });

  const isAdmin = await resolveAdminStatus(
    { uid: 'user-uid', email: 'user@example.com' },
    firestore,
    { ADMIN_EMAIL: 'admin@example.com' }
  );

  assert.equal(isAdmin, true);
  assert.equal(state.writes.length, 0);
});

test('does not grant access to disabled admin documents', async () => {
  const { firestore, state } = createFirestore({
    admins: {
      'user-uid': { uid: 'user-uid', enabled: false }
    }
  });

  const isAdmin = await resolveAdminStatus(
    { uid: 'user-uid', email: 'user@example.com' },
    firestore,
    { ADMIN_EMAIL: 'admin@example.com' }
  );

  assert.equal(isAdmin, false);
  assert.equal(state.writes.length, 0);
});

test('enables a disabled record for the configured admin email', async () => {
  const { firestore, state } = createFirestore({
    admins: {
      'admin-uid': { uid: 'admin-uid', enabled: false }
    }
  });

  const isAdmin = await resolveAdminStatus(
    { uid: 'admin-uid', email: 'admin@example.com' },
    firestore,
    { ADMIN_EMAIL: 'admin@example.com' }
  );

  assert.equal(isAdmin, true);
  assert.equal(state.collections.admins['admin-uid'].enabled, true);
  assert.equal(state.writes.length, 1);
});

test('rejects admin resolution when Firestore or a uid is unavailable', async () => {
  await assert.rejects(resolveAdminStatus({ uid: 'user-uid' }, null), /Firestore no está configurado/);
  await assert.rejects(resolveAdminStatus({ email: 'user@example.com' }, {}), /no tiene un identificador/);
});
