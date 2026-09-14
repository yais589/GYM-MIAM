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
  exerciseimage: "https://wger.de/api/v2/exerciseimage/"
};

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

  const collection = db.collection(name);

  // Borrar colección anterior
  const snapshot = await collection.get();
  snapshot.forEach(doc => doc.ref.delete());

  // Insertar nuevos datos
  for (const item of data) {
    await collection.add(item);
  }

  console.log(`✔ ${name} importado correctamente`);
}

// Ejecutar todo
async function main() {
  for (const [name, url] of Object.entries(endpoints)) {
    await importEndpoint(name, url);
  }

  console.log("\n✔ Importación completa en Firebase Firestore");
}

main();
