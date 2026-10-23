// Historial de movimientos de stock.
//
// Firestore solo guarda el estado actual de cada producto, así que sin este
// registro no se puede responder "¿qué ha pasado con el stock este mes?".
// Cada ajuste manual, cada reserva al iniciar un pago y cada liberación deja
// aquí un documento con el antes, el después y quién lo provocó.

export const STOCK_MOVEMENT_TYPES = ['manual', 'reserva', 'liberacion', 'ajuste'];

/**
 * Normaliza un movimiento. Es pura a propósito: también se usa dentro de
 * transacciones de Firestore, donde no se puede esperar a una escritura extra.
 */
export function buildStockMovement({
  productId,
  productName,
  type,
  before,
  after,
  units,
  orderId,
  actorUid,
  actorEmail,
  reason
} = {}) {
  const parsedBefore = Number(before);
  const parsedAfter = Number(after);
  const previous = Number.isFinite(parsedBefore) ? parsedBefore : null;
  const next = Number.isFinite(parsedAfter) ? parsedAfter : null;
  const delta = previous != null && next != null ? next - previous : Number(units) || 0;

  return {
    productId: String(productId ?? ''),
    productName: String(productName ?? ''),
    type: STOCK_MOVEMENT_TYPES.includes(type) ? type : 'ajuste',
    before: previous,
    after: next,
    delta,
    units: Math.abs(delta),
    orderId: orderId ? String(orderId) : null,
    actorUid: actorUid || null,
    actorEmail: actorEmail || null,
    reason: reason ? String(reason).slice(0, 200) : null,
    createdAt: new Date()
  };
}

/**
 * Guarda un movimiento fuera de transacción. Nunca lanza: si el registro
 * falla, la operación de negocio (una compra, un ajuste) debe seguir.
 */
export async function recordStockMovement(firestore, movement) {
  try {
    if (!firestore || !movement?.productId) return null;
    const reference = await firestore.collection('stockMovements').add(buildStockMovement(movement));
    return reference.id;
  } catch (error) {
    console.error(`No se pudo registrar el movimiento de stock: ${error.message}`);
    return null;
  }
}
