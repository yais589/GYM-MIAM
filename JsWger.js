const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const axios = require("axios");

const serviceAccount = require("./firebase-key.json");

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Delay helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Endpoints de Wger
const endpoints = {
  exercise: "https://wger.de/api/v2/exercise/",
  equipment: "https://wger.de/api/v2/equipment/",
  muscle: "https://wger.de/api/v2/muscle/",
  language: "https://wger.de/api/v2/language/",
  license: "https://wger.de/api/v2/license/",
  exerciseimage: "https://wger.de/api/v2/exerciseimage/",
  ingredientinfo: "https://wger.de/api/v2/ingredientinfo/?language=4&limit=100" // Español con imágenes
};

function getNamedValues(items = []) {
  return items
    .map(item => typeof item === 'object' ? item.name || item.id : item)
    .filter(Boolean);
}

// Enriquece la colección base con los datos completos de exerciseinfo.
async function enrichExercises() {
  const snapshot = await db.collection('exercise').get();
  const documentsById = new Map();
  snapshot.docs.forEach(document => {
    documentsById.set(String(document.data().id), document.ref);
  });

  let nextUrl = 'https://wger.de/api/v2/exerciseinfo/?limit=100';
  let updated = 0;

  while (nextUrl) {
    const response = await axios.get(nextUrl);
    const updates = [];

    response.data.results.forEach(exercise => {
      const documentRef = documentsById.get(String(exercise.id));
      if (!documentRef) return;

      const translation = exercise.translations?.find(item => item.name) || exercise.translations?.[0];
      const image = exercise.images?.find(item => item.image)?.image;
      const data = {
        name: translation?.name || `Ejercicio ${exercise.id}`,
        description: translation?.description || '',
        category: exercise.category?.id ?? exercise.category ?? null,
        equipment: getNamedValues(exercise.equipment),
        muscles: getNamedValues(exercise.muscles),
        muscles_secondary: getNamedValues(exercise.muscles_secondary),
        instructions: exercise.instructions || '',
        ...(image ? { image } : {})
      };

      updates.push({ ref: documentRef, data });
    });

    for (let index = 0; index < updates.length; index += 400) {
      const batch = db.batch();
      updates.slice(index, index + 400).forEach(update => batch.update(update.ref, update.data));
      await batch.commit();
    }

    updated += updates.length;
    console.log(`Procesados ${updated} ejercicios enriquecidos`);
    nextUrl = response.data.next;
    await sleep(500);
  }

  console.log(`Enriquecimiento terminado. Documentos actualizados: ${updated}`);
}

// Descarga con paginación y control de rate limit
async function fetchAllPages(url) {
  let results = [];
  let nextUrl = url;

  while (nextUrl) {
    try {
      const res = await axios.get(nextUrl);
      const data = res.data;

      if (data.results) {
        results = results.concat(data.results);
        nextUrl = data.next;
      } else {
        results.push(data);
        nextUrl = null;
      }

      // Delay entre peticiones para evitar 429
      await sleep(500);

    } catch (err) {
      if (err.response && err.response.status === 429) {
        const retryAfter = Number(err.response.headers["retry-after"]) * 1000;
        console.log(`⏳ Rate limit alcanzado. Esperando ${retryAfter / 1000} segundos...`);
        await sleep(retryAfter);
        continue;
      } else {
        console.error("Error inesperado:", err.message);
        break;
      }
    }
  }

  return results;
}

// Importar un endpoint completo a Firestore
async function importEndpoint(name, url) {
  console.log(`\nImportando ${name}...`);

  const data = await fetchAllPages(url);
  console.log(`Registros obtenidos: ${data.length}`);

  // Filtrar ingredientes: solo los que tienen datos nutricionales (sin requisito de imagen)
  let filteredData = data;
  if (name === 'ingredientinfo') {
    filteredData = data.filter(item => {
      const hasNutrition = item.energy != null && item.protein != null && item.carbohydrates != null && item.fat != null;
      return hasNutrition;
    });
    console.log(`Ingredientes con nutrición: ${filteredData.length} de ${data.length}`);
  }

  const collection = db.collection(name);

  // Borrar colección anterior
  const snapshot = await collection.get();
  snapshot.forEach(doc => doc.ref.delete());

  // Insertar nuevos datos en lotes
  for (let i = 0; i < filteredData.length; i += 400) {
    const batch = db.batch();
    filteredData.slice(i, i + 400).forEach(item => {
      const docRef = collection.doc();
      batch.set(docRef, item);
    });
    await batch.commit();
  }

  console.log(`✔ ${name} importado correctamente: ${filteredData.length} registros`);
}

// Ejecutar todo
async function main() {
  for (const [name, url] of Object.entries(endpoints)) {
    await importEndpoint(name, url);
  }

  await enrichExercises();

  console.log("\n✔ Importación y enriquecimiento completos en Firebase Firestore");
}

main();
