const admin = require('firebase-admin');
const axios = require('axios');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  const exercisesSnapshot = await db.collection('exercise').get();
  const documentsById = new Map();

  exercisesSnapshot.docs.forEach((document) => {
    documentsById.set(String(document.data().id), document.ref);
  });

  let nextUrl = 'https://wger.de/api/v2/exerciseinfo/?limit=100';
  let updated = 0;

  while (nextUrl) {
    const response = await axios.get(nextUrl);
    const updates = [];

    response.data.results.forEach((exercise) => {
      const documentRef = documentsById.get(String(exercise.id));
      const translation = exercise.translations?.find((item) => item.name) || exercise.translations?.[0];
      const image = exercise.images?.find((item) => item.image)?.image;

      if (documentRef && (translation?.name || image)) {
        updates.push({
          ref: documentRef,
          data: {
            ...(translation?.name ? { name: translation.name, description: translation.description || '' } : {}),
            ...(image ? { image } : {})
          }
        });
      }
    });

    for (let index = 0; index < updates.length; index += 400) {
      const batch = db.batch();
      updates.slice(index, index + 400).forEach((update) => batch.update(update.ref, update.data));
      await batch.commit();
    }

    updated += updates.length;
    console.log(`Procesados ${updated} ejercicios`);
    nextUrl = response.data.next;
  }

  console.log(`Importación terminada. Documentos actualizados: ${updated}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
