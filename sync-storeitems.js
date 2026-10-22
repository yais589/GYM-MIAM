const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const axios = require('axios')

const STORE_ITEMS_URL = 'https://api-titangym.onrender.com/storeitems'
const COLLECTION = 'storeitems'

const serviceAccount = require('./firebase-key.json')

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) })
}

const db = getFirestore()

const asText = (value, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : fallback
const asNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback

const normalizeStoreItem = (item, index) => {
  const id = item?.id ?? item?.sku ?? `store-${index + 1}`

  return {
    id,
    name: asText(item.name, `Producto ${id}`),
    category: asText(item.category, 'Sin categoría'),
    brand: asText(item.brand),
    price: asNumber(item.price),
    stock: Math.max(0, Math.trunc(asNumber(item.stock))),
    weight: asText(item.weight),
    flavor: asText(item.flavor),
    description: asText(item.description),
    image: asText(item.image),
    featured: Boolean(item.featured),
    rating: asNumber(item.rating),
    reviews: Math.max(0, Math.trunc(asNumber(item.reviews))),
    sku: asText(item.sku),
    isAvailable: item.isAvailable !== false,
    syncedAt: FieldValue.serverTimestamp()
  }
}

const extractStoreItems = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return null
}

async function syncStoreItems() {
  console.log(`Descargando catálogo desde ${STORE_ITEMS_URL}...`)
  const response = await axios.get(STORE_ITEMS_URL, { timeout: 30000 })
  const rawItems = extractStoreItems(response.data)
  if (!rawItems) {
    throw new Error('La API de tienda no devolvió una lista de productos')
  }

  const items = rawItems.map(normalizeStoreItem)
  console.log(`Se han recibido ${items.length} productos.`)

  for (let index = 0; index < items.length; index += 400) {
    const batch = db.batch()
    items.slice(index, index + 400).forEach((item) => {
      batch.set(db.collection(COLLECTION).doc(String(item.id)), item, { merge: true })
    })
    await batch.commit()
  }

  console.log(`✔ Catálogo sincronizado en Firestore: ${items.length} productos en "${COLLECTION}".`)
}

syncStoreItems().catch((error) => {
  console.error(`✖ No se pudo sincronizar el catálogo: ${error.message}`)
  process.exitCode = 1
})
