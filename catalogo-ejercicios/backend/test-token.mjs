// Probar si Firebase está bien configurado
import admin from 'firebase-admin';
import fs from 'fs';
const key = JSON.parse(fs.readFileSync('../firebase-key.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(key),
  projectId: key.project_id
});

const auth = admin.auth();
auth.createCustomToken('HiVeqJ8Ly7RRTBuQTTm918F3OOb2')
  .then(token => {
    console.log('TOKEN:', token);
    process.exit(0);
  })
  .catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
