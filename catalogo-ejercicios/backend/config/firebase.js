import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

// Raíz del proyecto (la carpeta que contiene backend/ y frontend/)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// Se puede indicar otra clave con FIREBASE_KEY_PATH (relativa a la raíz del proyecto)
const keyPath = process.env.FIREBASE_KEY_PATH
  ? path.resolve(projectRoot, process.env.FIREBASE_KEY_PATH)
  : path.resolve(projectRoot, 'firebase-key.json');
const fileCredentials = fs.existsSync(keyPath)
  ? JSON.parse(fs.readFileSync(keyPath, 'utf8'))
  : null;
const keyProjectId = fileCredentials?.project_id || fileCredentials?.projectId || null;
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
let auth = null;

try {
  const credentials = fileCredentials || environmentCredentials;
  if (credentials) {
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
    db = admin.firestore();
    // Perfiles a medio rellenar pueden traer campos vacíos: sin esto, guardar
    // un valor undefined lanzaría un error y no se guardaría el perfil.
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch { /* la instancia ya estaba configurada */ }
    auth = admin.auth();
    const activeProject = credentials.project_id || credentials.projectId;
    console.log(`Firebase inicializado correctamente: ${activeProject} (clave: ${path.basename(keyPath)})`);
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== activeProject) {
      console.warn(`AVISO: FIREBASE_PROJECT_ID dice "${process.env.FIREBASE_PROJECT_ID}" pero la clave de servicio es del proyecto "${activeProject}". Descarga la clave del proyecto correcto (Configuracion del proyecto > Cuentas de servicio > Generar nueva clave privada).`);
    }
  } else {
    console.warn(`Firebase no configurado (no se encontro la clave en ${keyPath}). Se usaran los datos locales de respaldo y las rutas con sesion devolveran 503.`);
  }
} catch (error) {
  console.warn(`No se pudo conectar con Firebase: ${error.message}`);
}

export { db, auth };
