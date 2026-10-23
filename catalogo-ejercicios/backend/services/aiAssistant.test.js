import assert from 'node:assert/strict';
import test from 'node:test';
import { buildExactCatalogReply, buildFallbackReply, classifyMessage } from './aiAssistant.js';

// ─────────────────────────────────────────────────────────────
// Datos de ejemplo con la misma forma que los de la web
// ─────────────────────────────────────────────────────────────
const EXERCISES = [
  { id: 1, name: 'Flexiones', category: 'Pecho', difficulty: 'beginner' },
  { id: 2, name: 'Fondos en paralelas', category: 'Pecho', difficulty: 'advanced' },
  { id: 3, name: 'Remo con barra', category: 'Espalda', difficulty: 'intermediate' },
  { id: 4, name: 'Dominadas', category: 'Espalda', difficulty: 'advanced' },
  { id: 5, name: 'Sentadillas', category: 'Piernas', difficulty: 'intermediate' },
  { id: 6, name: 'Zancadas', category: 'Piernas', difficulty: 'beginner' },
  { id: 7, name: 'Curl de bíceps', category: 'Brazos', difficulty: 'beginner' },
  { id: 8, name: 'Plancha', category: 'Abdominales', difficulty: 'beginner' },
  { id: 9, name: 'Burpees', category: 'Cardio', difficulty: 'intermediate' }
];

const INGREDIENTS = [
  { id: 1, name: 'Pollo pechuga', energy: 165, protein: 31, carbohydrates: 0, fat: 3.6, fiber: 0 },
  { id: 2, name: 'Brócoli', energy: 34, protein: 2.8, carbohydrates: 7, fat: 0.4, fiber: 2.6 },
  { id: 3, name: 'Arroz blanco', energy: 130, protein: 2.7, carbohydrates: 28, fat: 0.3, fiber: 0.4 },
  { id: 4, name: 'Aguacate', energy: 160, protein: 2, carbohydrates: 8.5, fat: 15, fiber: 6.7 },
  { id: 5, name: 'Atún al natural', energy: 116, protein: 26, carbohydrates: 0, fat: 1, fiber: 0 },
  { id: 6, name: 'Salmón', energy: 208, protein: 20, carbohydrates: 0, fat: 13, fiber: 0 }
];

const STORE_ITEMS = [
  { id: 1, name: 'Whey Protein 2 kg', category: 'Proteínas', price: 49.9, stock: 42, description: 'Proteína de suero para recuperar', isAvailable: true },
  { id: 2, name: 'Creatina Monohidrato 300 g', category: 'Creatina', price: 24.9, stock: 88, description: 'Fuerza y rendimiento', isAvailable: true },
  { id: 3, name: 'BCAA 2:1:1 400 g', category: 'Aminoácidos', price: 19.9, stock: 0, description: 'Recuperación muscular', isAvailable: true },
  { id: 4, name: 'Shaker TITAN', category: 'Accesorios', price: 7.5, stock: 12, description: 'Botella mezcladora', isAvailable: true },
  { id: 5, name: 'Pre-Entreno 300 g', category: 'Energía', price: 29.9, stock: 9, description: 'Energía antes de entrenar', isAvailable: true }
];

const ask = (message) => buildFallbackReply({ message, exercises: EXERCISES, ingredients: INGREDIENTS, storeItems: STORE_ITEMS });

// ─────────────────────────────────────────────────────────────
// Filtro de tema: lo de fuera de la web no se responde
// ─────────────────────────────────────────────────────────────

test('clasifica los temas de fuera de la web como off-topic', () => {
  assert.equal(classifyMessage('¿Quién ganó el mundial de fútbol?'), 'off-topic');
  assert.equal(classifyMessage('explícame la ley de la gravedad en física cuántica'), 'off-topic');
  assert.equal(classifyMessage('escríbeme un poema de amor'), 'off-topic');
});

test('un tema de fuera de la web reencauza a lo que hace la web', () => {
  const reply = ask('¿Quién ganó el mundial de fútbol?');
  assert.match(reply, /TITAN GYM/);
  assert.match(reply, /catálogo de ejercicios/);
  assert.match(reply, /¿Con cuál seguimos\?/);
  assert.doesNotMatch(reply, /Messi|Argentina|Francia/);
});

test('los temas médicos no se diagnostican', () => {
  const reply = ask('me duele la rodilla al hacer sentadillas');
  assert.match(reply, /No soy profesional sanitario/);
  assert.match(reply, /médico o un fisioterapeuta/);
});

// ─────────────────────────────────────────────────────────────
// Cortesía y presentación
// ─────────────────────────────────────────────────────────────

test('responde a saludos presentándose', () => {
  assert.equal(classifyMessage('hola'), 'greeting');
  assert.match(ask('hola'), /Soy TITAN/);
});

test('explica qué puede hacer sin inventar', () => {
  const reply = ask('¿qué puedes hacer?');
  assert.match(reply, /ejercicios reales del catálogo/);
  assert.match(reply, /Lo que no hago/);
});

// ─────────────────────────────────────────────────────────────
// La web: planes, cuenta y tienda
// ─────────────────────────────────────────────────────────────

test('los planes salen con precios reales', () => {
  const reply = ask('¿qué planes hay y cuánto cuestan?');
  assert.match(reply, /Free/);
  assert.match(reply, /5,99/);
  assert.match(reply, /11,99/);
  assert.match(reply, /Elite/);
});

test('explica cómo se gestiona la cuenta', () => {
  const reply = ask('¿cómo cambio mi contraseña del perfil?');
  assert.match(reply, /perfil/);
  assert.match(reply, /cerrar sesión|cierra sesión/);
});

test('un producto concreto responde con precio y stock reales', () => {
  const reply = ask('¿cuánto cuesta el whey?');
  assert.match(reply, /Whey Protein 2 kg/);
  assert.match(reply, /49,90 €/);
  assert.match(reply, /42 unidades en stock/);
});

test('recomendar para recuperar prioriza proteína/aminoácidos', () => {
  const reply = ask('¿qué me recomiendas para recuperar después de entrenar?');
  assert.match(reply, /Whey Protein 2 kg/);
  assert.ok(reply.indexOf('Whey Protein 2 kg') < reply.indexOf('Shaker TITAN'));
});

test('un producto agotado se dice claramente', () => {
  const reply = ask('¿tienes BCAA?');
  assert.match(reply, /BCAA 2:1:1 400 g/);
  assert.match(reply, /agotado/);
});

// ─────────────────────────────────────────────────────────────
// Catálogo real: alimentos y ejercicios
// ─────────────────────────────────────────────────────────────

test('filtra alimentos por calorías reales', () => {
  const reply = ask('dame alimentos con menos de 100 kcal');
  assert.match(reply, /Brócoli/);
  assert.doesNotMatch(reply, /Salmón/);
  assert.doesNotMatch(reply, /Aguacate/);
});

test('ordena alimentos por proteína con sus gramos', () => {
  const reply = ask('¿qué alimentos tienen más proteína?');
  assert.match(reply, /Pollo pechuga/);
  assert.ok(reply.indexOf('Pollo pechuga') < reply.indexOf('Arroz blanco'));
});

test('un alimento suelto devuelve sus valores por 100 g', () => {
  const reply = ask('cuántas calorías tiene el pollo');
  assert.match(reply, /Pollo pechuga/);
  assert.match(reply, /165 kcal/);
  assert.match(reply, /31 g proteína/);
});

test('reparte ejercicios por grupo muscular con las cantidades pedidas', () => {
  const reply = ask('dame 2 de espalda y 4 de pierna');
  assert.match(reply, /2 de espalda y 4 de pierna/);
  assert.match(reply, /Remo con barra|Dominadas/);
  assert.match(reply, /Sentadillas|Zancadas/);
});

test('una rutina para principiantes usa solo ejercicios de nivel fácil', () => {
  assert.equal(classifyMessage('dame una rutina para principiantes'), 'exercise');
  const reply = ask('dame una rutina para principiantes');
  assert.match(reply, /nivel principiante/);
  assert.match(reply, /Flexiones|Zancadas|Curl de bíceps|Plancha/);
  assert.doesNotMatch(reply, /Dominadas|Fondos en paralelas/);
});

test('pide una rutina también sin grupo muscular ("ejercicios para el tenis")', () => {
  const reply = ask('ejercicios para el tenis');
  assert.match(reply, /rutina full body/);
  assert.doesNotMatch(reply, /Dominadas|Fondos en paralelas/);
});

test('una duda de técnica no se contesta con una rutina al azar', () => {
  const reply = ask('explícame el entrenamiento de fuerza');
  assert.doesNotMatch(reply, /rutina full body/);
  assert.match(reply, /Te ayudo con esto/);
});

test('un objetivo de grasa da pautas concretas y ofrece el plan', () => {
  const reply = ask('quiero perder grasa');
  assert.match(reply, /déficit/i);
  assert.match(reply, /Crear mi plan con TITAN/);
});

test('una pregunta vacía pide aclaración en lugar de no responder', () => {
  const reply = ask('y eso');
  assert.match(reply, /No estoy seguro de qué necesitas/);
  assert.match(reply, /Dame 3 ejercicios de espalda/);
});

test('una pregunta genérica ofrece las opciones reales de la web', () => {
  const reply = ask('cuéntame algo interesante');
  assert.match(reply, /Te ayudo con esto/);
  assert.match(reply, /Nutrición/);
  assert.match(reply, /Tienda/);
});

// ─────────────────────────────────────────────────────────────
// Regresión: el catálogo no secuestra preguntas que no son de alimentos
// (pasaba con fichas que contenían «grasa» o «hacer» en el nombre)
// ─────────────────────────────────────────────────────────────
const TRICKY_FOODS = [
  ...INGREDIENTS,
  { id: 90, name: 'Queso Panela Reducido En Grasa', energy: 228, protein: 18, carbohydrates: 4.5, fat: 15.3, fiber: 0 },
  { id: 91, name: 'Harina preparada completamente para hacer Hot Cakes', energy: 356, protein: 6.8, carbohydrates: 76.3, fat: 1.7, fiber: 1.7 }
];
const exact = (message) => buildExactCatalogReply(message, { exercises: EXERCISES, ingredients: TRICKY_FOODS });

test('«quiero perder grasa» no devuelve la ficha de un queso con grasa', () => {
  assert.equal(classifyMessage('Quiero perder grasa, ¿por dónde empiezo?'), 'goal');
  assert.equal(exact('Quiero perder grasa, ¿por dónde empiezo?'), null);
  const reply = ask('Quiero perder grasa, ¿por dónde empiezo?');
  assert.match(reply, /déficit/i);
  assert.doesNotMatch(reply, /Queso Panela|Harina preparada/);
});

test('«¿qué puedes hacer?» responde al menú y no a una harina con «hacer» en el nombre', () => {
  assert.equal(classifyMessage('¿Qué puedes hacer?'), 'capabilities');
  assert.equal(exact('¿Qué puedes hacer?'), null);
  const reply = ask('¿Qué puedes hacer?');
  assert.match(reply, /Puedo:/);
  assert.doesNotMatch(reply, /Harina preparada|Hot Cakes/);
});

test('«pollo» lleva a la pechuga y no a un plato con pollo en el nombre', () => {
  const foods = [
    // Sin el «Pollo pechuga» del catálogo base, para probar el desempate real
    ...TRICKY_FOODS.filter(food => food.name !== 'Pollo pechuga'),
    { id: 92, name: 'Cesar con pollo y queso', energy: 250, protein: 8.2, carbohydrates: 9.1, fat: 19.8, fiber: 0 },
    { id: 93, name: 'Pollo alla parmigiana con penne', energy: 166, protein: 11.9, carbohydrates: 19.6, fat: 4.2, fiber: 1.4 },
    { id: 94, name: 'Pechuga de pollo', energy: 104, protein: 21.5, carbohydrates: 1, fat: 1.5, fiber: 0 }
  ];
  const reply = buildExactCatalogReply('¿cuántas calorías tiene el pollo?', { exercises: EXERCISES, ingredients: foods });
  assert.match(reply, /Pechuga de pollo/);
  assert.doesNotMatch(reply, /Cesar con pollo|parmigiana/);
});

test('las preguntas reales de alimentos siguen saliendo del catálogo', () => {
  const reply = exact('¿cuánta grasa tiene el aguacate?');
  assert.match(reply, /Aguacate/);
  assert.match(reply, /15 g grasa/);
  assert.doesNotMatch(reply, /Queso Panela|Harina preparada/);
});
