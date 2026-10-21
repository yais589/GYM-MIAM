import PDFDocument from 'pdfkit';

const COLORS = {
  ink: '#173b43',
  teal: '#2d8b87',
  mint: '#e9f7f3',
  orange: '#d88b51',
  text: '#334e52',
  muted: '#6b7f82',
  line: '#d8e8e4',
  white: '#ffffff'
};

const PAGE = { width: 595.28, height: 841.89, margin: 38 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const CONTENT_TOP = 112;
const CONTENT_BOTTOM = PAGE.height - 45;
const value = input => String(input ?? '—');

function roundedBox(doc, x, y, width, height, color, radius = 8) {
  doc.save().roundedRect(x, y, width, height, radius).fillColor(color).fill().restore();
}

function drawHeader(doc, title, subtitle) {
  doc.rect(0, 0, PAGE.width, 92).fillColor(COLORS.ink).fill();
  doc.circle(PAGE.width - 58, 43, 30).fillColor(COLORS.teal).fill();
  doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.white).text('TITAN', 38, 24);
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#f0bf67').text('GYM · PERFORMANCE STUDIO', 40, 50);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.white).text(title, 38, 68, { width: CONTENT_WIDTH - 45 });
  doc.font('Helvetica').fontSize(8).fillColor('#b8d8d3').text(subtitle, 38, 87);
  doc.y = CONTENT_TOP;
}

function drawFooter(doc, pageNumber, isSpanish) {
  const y = PAGE.height - 28;
  doc.moveTo(PAGE.margin, y - 8).lineTo(PAGE.width - PAGE.margin, y - 8)
    .strokeColor(COLORS.line).lineWidth(0.6).stroke();
  doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted)
    .text(`TITAN GYM · ${isSpanish ? 'Plan personalizado' : 'Personalized plan'}`, PAGE.margin, y, {
      continued: true
    })
    .text(`  ·  ${pageNumber}`, { align: 'right' });
}

function sectionTitle(doc, title) {
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.ink).text(`+  ${title}`);
  doc.moveTo(PAGE.margin, doc.y + 4).lineTo(PAGE.margin + 48, doc.y + 4)
    .strokeColor(COLORS.orange).lineWidth(2).stroke();
  doc.y += 12;
}

function metricCards(doc, cards) {
  const gap = 7;
  const width = (CONTENT_WIDTH - gap * (cards.length - 1)) / cards.length;
  const y = doc.y;
  cards.forEach((card, index) => {
    const x = PAGE.margin + index * (width + gap);
    roundedBox(doc, x, y, width, 50, card.color || COLORS.mint);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(card.valueColor || COLORS.teal)
      .text(value(card.value), x + 5, y + 8, { width: width - 10, height: 17, ellipsis: true, align: 'center' });
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.text)
      .text(value(card.label), x + 4, y + 31, { width: width - 8, height: 11, ellipsis: true, align: 'center' });
  });
  doc.y = y + 62;
}

function drawTable(doc, columns, rows, rowHeight = 21, headerHeight = 24) {
  let y = doc.y;
  roundedBox(doc, PAGE.margin, y, CONTENT_WIDTH, headerHeight, COLORS.ink, 5);
  let x = PAGE.margin;
  columns.forEach(column => {
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.white)
      .text(column.label, x + 5, y + 8, { width: column.width - 10, height: 10, ellipsis: true, align: column.align || 'left' });
    x += column.width;
  });
  y += headerHeight;
  rows.forEach((row, rowIndex) => {
    doc.rect(PAGE.margin, y, CONTENT_WIDTH, rowHeight)
      .fillColor(rowIndex % 2 ? COLORS.white : '#f4faf8').fill()
      .strokeColor(COLORS.line).lineWidth(0.35).stroke();
    x = PAGE.margin;
    columns.forEach(column => {
      doc.font('Helvetica').fontSize(column.fontSize || 7.5).fillColor(COLORS.text)
        .text(value(row[column.key]), x + 5, y + (rowHeight > 30 ? 7 : 6), {
          width: column.width - 10,
          height: rowHeight - 8,
          ellipsis: true,
          align: column.align || 'left'
        });
      x += column.width;
    });
    y += rowHeight;
  });
  doc.y = y + 9;
}

function callout(doc, title, body, color = '#fff5e9') {
  const y = doc.y;
  roundedBox(doc, PAGE.margin, y, CONTENT_WIDTH, 45, color);
  doc.rect(PAGE.margin, y, 4, 45).fillColor(COLORS.orange).fill();
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.ink).text(title, PAGE.margin + 14, y + 8);
  doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.text).text(value(body), PAGE.margin + 14, y + 22, {
    width: CONTENT_WIDTH - 25, height: 15, ellipsis: true
  });
  doc.y = y + 56;
}

function renderTraining(doc, section, isSpanish) {
  sectionTitle(doc, isSpanish ? 'Resumen del entrenamiento' : 'Training overview');
  metricCards(doc, [
    { value: section.goal, label: isSpanish ? 'Objetivo' : 'Goal' },
    { value: section.level, label: isSpanish ? 'Nivel' : 'Level' },
    { value: section.schedule?.length || 0, label: isSpanish ? 'Días / semana' : 'Days / week' },
    { value: `${section.progress?.weeklyMinutes || 0} min`, label: isSpanish ? 'Minutos / semana' : 'Minutes / week' }
  ]);
  sectionTitle(doc, isSpanish ? 'Rutina semanal' : 'Weekly routine');
  drawTable(doc, [
    { key: 'day', label: isSpanish ? 'DÍA' : 'DAY', width: 54 },
    { key: 'focus', label: isSpanish ? 'ENFOQUE' : 'FOCUS', width: 123 },
    { key: 'exercises', label: isSpanish ? 'EJERCICIOS' : 'EXERCISES', width: 205, fontSize: 7 },
    { key: 'volume', label: isSpanish ? 'SERIES' : 'SETS', width: 52 },
    { key: 'rest', label: isSpanish ? 'DESCANSO' : 'REST', width: 60 },
    { key: 'minutes', label: 'MIN', width: 25, align: 'center' }
  ], (section.schedule || []).map(day => ({
    day: day.day,
    focus: day.focus,
    exercises: (day.exercises || []).join(' · '),
    volume: `${day.sets} x ${day.reps}`,
    rest: day.rest,
    minutes: day.minutes
  })), 48);
  if (section.progress) {
    callout(doc, isSpanish ? 'Progreso estimado' : 'Estimated progress', section.progress.verdict, COLORS.mint);
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted)
      .text(`${isSpanish ? 'Gasto semanal' : 'Weekly burn'}: ${section.progress.weeklyCalories || 0} kcal`);
  }
}

function renderNutrition(doc, section, isSpanish) {
  sectionTitle(doc, isSpanish ? 'Resumen nutricional' : 'Nutrition overview');
  metricCards(doc, [
    { value: `${section.calories || 0} kcal`, label: isSpanish ? 'Objetivo diario' : 'Daily target' },
    { value: `${section.bmr || 0} kcal`, label: 'BMR' },
    { value: `${section.tdee || 0} kcal`, label: 'TDEE' },
    { value: section.meals?.length || 0, label: isSpanish ? 'Comidas' : 'Meals' }
  ]);
  sectionTitle(doc, isSpanish ? 'Macronutrientes' : 'Macronutrients');
  drawTable(doc, [
    { key: 'macro', label: 'MACRO', width: 145 },
    { key: 'grams', label: isSpanish ? 'GRAMOS' : 'GRAMS', width: 100 },
    { key: 'role', label: isSpanish ? 'FUNCIÓN' : 'ROLE', width: 274 }
  ], [
    { macro: 'Proteína', grams: `${section.macros?.protein || 0} g`, role: isSpanish ? 'Recuperación y músculo' : 'Recovery and muscle' },
    { macro: isSpanish ? 'Carbohidratos' : 'Carbs', grams: `${section.macros?.carbs || 0} g`, role: isSpanish ? 'Energía para entrenar' : 'Training energy' },
    { macro: isSpanish ? 'Grasas saludables' : 'Healthy fats', grams: `${section.macros?.fat || 0} g`, role: isSpanish ? 'Hormonas y saciedad' : 'Hormones and satiety' }
  ], 20);
  sectionTitle(doc, isSpanish ? 'Distribución diaria' : 'Daily distribution');
  drawTable(doc, [
    { key: 'time', label: isSpanish ? 'COMIDA' : 'MEAL', width: 180 },
    { key: 'calories', label: 'KCAL', width: 100 },
    { key: 'tip', label: isSpanish ? 'RECOMENDACIÓN' : 'TIP', width: 239 }
  ], (section.meals || []).map((meal, index) => ({
    time: meal.time,
    calories: meal.calories,
    tip: index === 0 ? (isSpanish ? 'Empieza con proteína' : 'Start with protein') : isSpanish ? 'Mantén la hidratación' : 'Stay hydrated'
  })), 20);
  if (section.suggestedFoods?.length) {
    sectionTitle(doc, isSpanish ? 'Alimentos sugeridos' : 'Suggested foods');
    drawTable(doc, [
      { key: 'meal', label: isSpanish ? 'COMIDA' : 'MEAL', width: 75 },
      { key: 'name', label: isSpanish ? 'ALIMENTO' : 'FOOD', width: 220 },
      { key: 'grams', label: 'G', width: 45, align: 'center' },
      { key: 'calories', label: 'KCAL', width: 65, align: 'center' },
      { key: 'macros', label: 'P / C / G', width: 114, fontSize: 7 }
    ], section.suggestedFoods.map(food => ({
      meal: food.meal,
      name: food.name,
      grams: food.grams,
      calories: food.calories,
      macros: `${food.protein || 0} / ${food.carbohydrates || 0} / ${food.fat || 0}`
    })), 12, 20);
  }
}

export function buildPlanPdf(doc, plan, language = 'es') {
  const isSpanish = language !== 'en';
  const subtitle = `${isSpanish ? 'Guía personalizada de TITAN GYM' : 'Personalized TITAN GYM guide'} · ${value(plan.name || (isSpanish ? 'Atleta' : 'Athlete'))}`;
  const sections = plan.type === 'combined' ? [plan.trainingPlan, plan.nutritionPlan] : [plan];
  sections.filter(Boolean).forEach((section, index) => {
    (doc._addPlanPage || doc.addPage.bind(doc))();
    const title = section.type === 'training'
      ? (isSpanish ? 'Plan de entrenamiento' : 'Training plan')
      : (isSpanish ? 'Plan de nutrición' : 'Nutrition plan');
    drawHeader(doc, title, subtitle);
    drawFooter(doc, index + 1, isSpanish);
    doc.y = CONTENT_TOP;
    if (section.type === 'training') renderTraining(doc, section, isSpanish);
    else renderNutrition(doc, section, isSpanish);
  });
}

export function createPlanPdf(plan, language = 'es') {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, autoFirstPage: false, bufferPages: true });
  const addPlanPage = doc.addPage.bind(doc);
  // PDFKit intenta crear páginas cuando el cursor supera el margen inferior.
  // Los planes tienen un número fijo de hojas; los saltos solo los controla
  // buildPlanPdf mediante _addPlanPage.
  doc.addPage = () => doc;
  doc._addPlanPage = addPlanPage;
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  buildPlanPdf(doc, plan, language);
  doc.end();
  return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}
