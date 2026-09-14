import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const keyPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../firebase-key.json');
const fileCredentials = fs.existsSync(keyPath)
  ? JSON.parse(fs.readFileSync(keyPath, 'utf8'))
  : null;
const environmentCredentials = process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
  ? {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }
  : null;

let db = null;

try {
  const credentials = fileCredentials || environmentCredentials;
  if (credentials) {
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
    db = admin.firestore();
    console.log(`Firebase inicializado correctamente: ${credentials.project_id || credentials.projectId}`);
  } else {
    console.warn('Firebase no configurado. Se usaran los datos locales de respaldo.');
  }
} catch (error) {
  console.warn(`No se pudo conectar con Firebase: ${error.message}`);
}

export { db };
