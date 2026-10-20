import PDFDocument from 'pdfkit';

const COLORS = {
  ink: '#173b43',
  teal: '#2d8b87',
  mint: '#e9f7f3',
  orange: '#d88b51',
  gold: '#f0bf67',
  text: '#334e52',
  muted: '#6b7f82',
  line: '#d8e8e4',
  white: '#ffffff'
};

const PAGE = { width: 595.28, height: 841.89, margin: 42 };
const contentWidth = PAGE.width - PAGE.margin * 2;

const text = value => String(value ?? '—');

function roundedBox(doc, x, y, width, height, fill, radius = 10) {
  doc.save().roundedRect(x, y, width, height, radius).fillColor(fill).fill().restore();
}

function header(doc, title, subtitle) {
  doc.rect(0, 0, PAGE.width, 96).fillColor(COLORS.ink).fill();
  doc.circle(PAGE.width - 64, 42, 34).fillColor(COLORS.teal).fill();
  doc.fontSize(21).fillColor(COLORS.white).font('Helvetica-Bold').text('TITAN', 42, 30);
  doc.fontSize(9).fillColor(COLORS.gold).font('Helvetica-Bold').text('GYM · PERFORMANCE STUDIO', 44, 58);
  doc.fontSize(16).fillColor(COLORS.white).font('Helvetica-Bold').text(title, 42, 78, { width: contentWidth - 50 });
  doc.fontSize(8).fillColor('#b8d8d3').font('Helvetica').text(subtitle, 42, 96);
  doc.y = 116;
}

function footer(doc, pageNumber, isSpanish) {
  const y = PAGE.height - 28;
  doc.moveTo(PAGE.margin, y - 8).lineTo(PAGE.width - PAGE.margin, y - 8)
    .strokeColor(COLORS.line).lineWidth(0.6).stroke();
  doc.fontSize(8).fillColor(COLORS.muted).font('Helvetica')
    .text('TITAN GYM', PAGE.margin, y, { continued: true })
    .text(`  ·  ${isSpanish ? 'Plan personalizado' : 'Personalized plan'}`, { continued: true })
    .text(`  ·  ${pageNumber}`, { align: 'right' });
}

function addPage(doc, title, subtitle, isSpanish) {
  doc.addPage();
  header(doc, title, subtitle);
  footer(doc, doc.bufferedPageRange().count, isSpanish);
}

function continueOnNewPage(doc, title, subtitle, isSpanish) {
  if (doc.y > PAGE.height - 220) addPage(doc, title, subtitle, isSpanish);
}

function sectionTitle(doc, title, icon = '✦') {
  if (doc.y > PAGE.height - 150) addPage(doc, title, '', true);
  doc.fontSize(15).fillColor(COLORS.ink).font('Helvetica-Bold').text(`${icon}  ${title}`);
  doc.moveTo(PAGE.margin, doc.y + 5).lineTo(PAGE.margin + 54, doc.y + 5)
    .strokeColor(COLORS.orange).lineWidth(2).stroke();
  doc.moveDown(0.75);
}

function metricCards(doc, cards) {
  const gap = 8;
  const width = (contentWidth - gap * (cards.length - 1)) / cards.length;
  const y = doc.y;
  cards.forEach((card, index) => {
    const x = PAGE.margin + index * (width + gap);
    roundedBox(doc, x, y, width, 54, card.fill || COLORS.mint, 9);
    doc.fontSize(15).fillColor(card.color || COLORS.teal).font('Helvetica-Bold')
      .text(text(card.value), x + 8, y + 8, { width: width - 16, height: 20, ellipsis: true, align: 'center' });
    doc.fontSize(8).fillColor(COLORS.text).font('Helvetica')
      .text(text(card.label), x + 6, y + 34, { width: width - 12, height: 12, ellipsis: true, align: 'center' });
  });
  doc.y = y + 68;
}

function table(doc, columns, rows, options = {}) {
  const rowHeight = options.rowHeight || 23;
  const headerHeight = options.headerHeight || 28;
  const startX = PAGE.margin;
  let y = doc.y;

  const drawHeader = () => {
    roundedBox(doc, startX, y, contentWidth, headerHeight, COLORS.ink, 6);
    let x = startX;
    columns.forEach(column => {
      doc.fontSize(8).fillColor(COLORS.white).font('Helvetica-Bold')
        .text(column.label, x + 7, y + 9, { width: column.width - 14, align: column.align || 'left' });
      x += column.width;
    });
    y += headerHeight;
  };

  drawHeader();
  rows.forEach((row, rowIndex) => {
    if (y + rowHeight > PAGE.height - 52) {
      doc.addPage();
      header(doc, options.pageTitle || '', options.pageSubtitle || '');
      footer(doc, doc.bufferedPageRange().count, options.isSpanish !== false);
      y = doc.y;
      drawHeader();
    }
    doc.rect(startX, y, contentWidth, rowHeight)
      .fillColor(rowIndex % 2 ? COLORS.white : '#f4faf8').fill()
      .strokeColor(COLORS.line).lineWidth(0.35).stroke();
    let x = startX;
    columns.forEach(column => {
      doc.fontSize(8).fillColor(COLORS.text).font('Helvetica')
        .text(text(row[column.key]), x + 7, y + 8, {
          width: column.width - 14,
          height: rowHeight - 10,
          ellipsis: true,
          align: column.align || 'left'
        });
      x += column.width;
    });
    y += rowHeight;
  });
  doc.y = y + 12;
}

function callout(doc, title, body, fill = '#fff5e9') {
  const height = 57;
  if (doc.y + height > PAGE.height - 52) {
    addPage(doc, title, '', true);
  }
  const y = doc.y;
  roundedBox(doc, PAGE.margin, y, contentWidth, height, fill, 9);
  doc.rect(PAGE.margin, y, 5, height).fillColor(COLORS.orange).fill();
  doc.fontSize(10).fillColor(COLORS.ink).font('Helvetica-Bold').text(title, PAGE.margin + 17, y + 11);
  doc.fontSize(9).fillColor(COLORS.text).font('Helvetica').text(text(body), PAGE.margin + 17, y + 28, {
    width: contentWidth - 32, height: 22, ellipsis: true
  });
  doc.y = y + height + 15;
}

function trainingSection(doc, section, isSpanish) {
  sectionTitle(doc, isSpanish ? 'Resumen de entrenamiento' : 'Training overview', '+');
  metricCards(doc, [
    { value: section.goal, label: isSpanish ? 'Objetivo' : 'Goal' },
    { value: section.level, label: isSpanish ? 'Nivel' : 'Level' },
    { value: `${section.schedule?.length || 0}`, label: isSpanish ? 'Días por semana' : 'Days per week' },
    { value: `${section.progress?.weeklyMinutes || 0} min`, label: isSpanish ? 'Minutos semanales' : 'Weekly minutes' }
  ]);
  table(doc, [
    { key: 'day', label: isSpanish ? 'DÍA' : 'DAY', width: 82 },
    { key: 'focus', label: isSpanish ? 'ENFOQUE' : 'FOCUS', width: 190 },
    { key: 'volume', label: isSpanish ? 'VOLUMEN' : 'VOLUME', width: 95 },
    { key: 'rest', label: isSpanish ? 'DESCANSO' : 'REST', width: 80 },
    { key: 'minutes', label: 'MIN', width: 58 }
  ], (section.schedule || []).map(day => ({
    day: day.day,
    focus: day.focus,
    volume: `${day.sets} x ${day.reps}`,
    rest: day.rest,
    minutes: day.minutes
  })), { pageTitle: isSpanish ? 'Rutina semanal' : 'Weekly routine', pageSubtitle: '', isSpanish });

  sectionTitle(doc, isSpanish ? 'Ejercicios de la semana' : 'Exercises for the week', '+');
  const exerciseRows = [];
  section.schedule?.forEach(day => {
    (day.exercises || []).forEach((exercise, index) => exerciseRows.push({
      day: index === 0 ? day.day : '',
      exercise,
      series: day.sets,
      reps: day.reps,
      rest: day.rest
    }));
  });
  table(doc, [
    { key: 'day', label: isSpanish ? 'DÍA' : 'DAY', width: 72 },
    { key: 'exercise', label: isSpanish ? 'EJERCICIO' : 'EXERCISE', width: 235 },
    { key: 'series', label: isSpanish ? 'SERIES' : 'SETS', width: 62 },
    { key: 'reps', label: isSpanish ? 'REPS' : 'REPS', width: 62 },
    { key: 'rest', label: isSpanish ? 'DESCANSO' : 'REST', width: 80 }
  ], exerciseRows, { pageTitle: isSpanish ? 'Ejercicios semanales' : 'Weekly exercises', pageSubtitle: '', isSpanish });
  if (section.progress) {
    callout(doc, isSpanish ? 'Lectura de progreso' : 'Progress insight', section.progress.verdict);
    metricCards(doc, [
      { value: `${section.progress.weeklyMinutes || 0}`, label: isSpanish ? 'Minutos / semana' : 'Minutes / week' },
      { value: `${section.progress.weeklyCalories || 0}`, label: isSpanish ? 'Kcal / semana' : 'Kcal / week' }
    ]);
  }
}

function nutritionSection(doc, section, isSpanish) {
  sectionTitle(doc, isSpanish ? 'Resumen nutricional' : 'Nutrition overview', '+');
  metricCards(doc, [
    { value: `${section.calories || 0} kcal`, label: isSpanish ? 'Objetivo diario' : 'Daily target' },
    { value: `${section.bmr || 0} kcal`, label: 'BMR' },
    { value: `${section.tdee || 0} kcal`, label: 'TDEE' },
    { value: `${section.meals?.length || 0}`, label: isSpanish ? 'Comidas' : 'Meals' }
  ]);
  table(doc, [
    { key: 'macro', label: isSpanish ? 'MACRO' : 'MACRO', width: 170 },
    { key: 'grams', label: isSpanish ? 'GRAMOS' : 'GRAMS', width: 120 },
    { key: 'share', label: isSpanish ? 'FUNCIÓN' : 'ROLE', width: 200 }
  ], [
    { macro: 'Proteína', grams: `${section.macros?.protein || 0} g`, share: isSpanish ? 'Recuperación y músculo' : 'Recovery and muscle' },
    { macro: isSpanish ? 'Carbohidratos' : 'Carbs', grams: `${section.macros?.carbs || 0} g`, share: isSpanish ? 'Energía para entrenar' : 'Training energy' },
    { macro: isSpanish ? 'Grasas saludables' : 'Healthy fats', grams: `${section.macros?.fat || 0} g`, share: isSpanish ? 'Hormonas y saciedad' : 'Hormones and satiety' }
  ], { pageTitle: isSpanish ? 'Macronutrientes' : 'Macronutrients', pageSubtitle: '', isSpanish });
  sectionTitle(doc, isSpanish ? 'Distribución diaria' : 'Daily distribution', '+');
  table(doc, [
    { key: 'time', label: isSpanish ? 'MOMENTO' : 'MEAL', width: 220 },
    { key: 'calories', label: 'KCAL', width: 120 },
    { key: 'tip', label: isSpanish ? 'RECOMENDACIÓN' : 'TIP', width: 150 }
  ], (section.meals || []).map((meal, index) => ({
    time: meal.time,
    calories: meal.calories,
    tip: index === 0 ? (isSpanish ? 'Empieza con proteína' : 'Start with protein') : index === 1 ? (isSpanish ? 'Comida principal' : 'Main meal') : (isSpanish ? 'Hidratación' : 'Stay hydrated')
  })), { pageTitle: isSpanish ? 'Distribución de comidas' : 'Meal distribution', pageSubtitle: '', isSpanish });
  if (section.suggestedFoods?.length) {
    sectionTitle(doc, isSpanish ? 'Lista de alimentos sugeridos' : 'Suggested food list', '+');
    table(doc, [
      { key: 'meal', label: isSpanish ? 'COMIDA' : 'MEAL', width: 82 },
      { key: 'name', label: isSpanish ? 'ALIMENTO' : 'FOOD', width: 145 },
      { key: 'grams', label: 'G', width: 45 },
      { key: 'calories', label: 'KCAL', width: 65 },
      { key: 'macros', label: 'P / C / G', width: 125 }
    ], section.suggestedFoods.map(food => ({
      meal: food.meal,
      name: food.name,
      grams: food.grams,
      calories: food.calories,
      macros: `${food.protein || 0} / ${food.carbohydrates || 0} / ${food.fat || 0}`
    })), { pageTitle: isSpanish ? 'Alimentos sugeridos' : 'Suggested foods', pageSubtitle: '', isSpanish });
  }
  if (section.progress) {
    callout(doc, isSpanish ? 'Lectura de progreso' : 'Progress insight', section.progress.verdict, COLORS.mint);
    metricCards(doc, [
      { value: `${section.progress.dailyDelta > 0 ? '+' : ''}${section.progress.dailyDelta || 0}`, label: isSpanish ? 'Balance diario (kcal)' : 'Daily balance (kcal)' },
      { value: `${section.progress.weeklyChangeKg || 0} kg`, label: isSpanish ? 'Cambio semanal estimado' : 'Estimated weekly change' },
      { value: `${section.progress.monthChangeKg || 0} kg`, label: isSpanish ? 'Cambio mensual estimado' : 'Estimated monthly change' }
    ]);
  }
}

export function buildPlanPdf(doc, plan, language = 'es') {
  const isSpanish = language !== 'en';
  const title = plan.type === 'training'
    ? (isSpanish ? 'Plan de entrenamiento' : 'Training plan')
    : plan.type === 'nutrition'
      ? (isSpanish ? 'Plan de nutrición' : 'Nutrition plan')
      : (isSpanish ? 'Plan completo' : 'Complete plan');
  const subtitle = isSpanish ? 'Tu guía visual para entrenar, comer y progresar' : 'Your visual guide to train, eat and progress';

  header(doc, title, subtitle);
  roundedBox(doc, PAGE.margin, doc.y, contentWidth, 112, COLORS.mint, 14);
  doc.fontSize(10).fillColor(COLORS.teal).font('Helvetica-Bold').text(isSpanish ? 'PLAN PERSONALIZADO PARA' : 'PERSONALIZED PLAN FOR', PAGE.margin + 22, doc.y + 20);
  doc.fontSize(25).fillColor(COLORS.ink).font('Helvetica-Bold').text(text(plan.name || (isSpanish ? 'Atleta TITAN' : 'TITAN athlete')), PAGE.margin + 22, doc.y + 10);
  doc.fontSize(9).fillColor(COLORS.muted).font('Helvetica').text(isSpanish ? 'Diseñado a partir de tus objetivos y tus datos' : 'Designed around your goals and personal data', PAGE.margin + 22, doc.y + 8);
  doc.y += 145;
  callout(doc, isSpanish ? 'Cómo utilizar este plan' : 'How to use this plan', isSpanish
    ? 'Sigue la estructura durante 4 semanas, registra tus sensaciones y ajusta con un profesional si tus circunstancias cambian.'
    : 'Follow this structure for 4 weeks, track how you feel and adjust with a professional if your circumstances change.');
  metricCards(doc, [
    { value: '01', label: isSpanish ? 'Entrena con técnica' : 'Train with technique' },
    { value: '02', label: isSpanish ? 'Come con estructura' : 'Eat with structure' },
    { value: '03', label: isSpanish ? 'Mide tu progreso' : 'Track your progress' }
  ]);

  const sections = plan.type === 'combined' ? [plan.trainingPlan, plan.nutritionPlan] : [plan];
  sections.forEach((section, index) => {
    if (!section) return;
    const sectionTitleText = section.type === 'training'
      ? (isSpanish ? 'Entrenamiento' : 'Training')
      : (isSpanish ? 'Nutrición' : 'Nutrition');
    if (index === 0 || doc.y > PAGE.height - 360) {
      addPage(doc, sectionTitleText, subtitle, isSpanish);
    } else {
      doc.moveDown(1);
    }
    if (section.type === 'training') trainingSection(doc, section, isSpanish);
    else nutritionSection(doc, section, isSpanish);
  });
  continueOnNewPage(doc, isSpanish ? 'Notas y seguimiento' : 'Notes and tracking', subtitle, isSpanish);
  sectionTitle(doc, isSpanish ? 'Checklist semanal' : 'Weekly checklist', '+');
  table(doc, [
    { key: 'item', label: isSpanish ? 'HÁBITO' : 'HABIT', width: 245 },
    { key: 'mon', label: 'L', width: 38 }, { key: 'tue', label: 'M', width: 38 },
    { key: 'wed', label: 'X', width: 38 }, { key: 'thu', label: 'J', width: 38 },
    { key: 'fri', label: 'V', width: 38 }, { key: 'sat', label: 'S', width: 38 },
    { key: 'sun', label: 'D', width: 38 }
  ], [
    { item: isSpanish ? 'Cumplí mi entrenamiento' : 'Completed my training', mon: '[ ]', tue: '[ ]', wed: '[ ]', thu: '[ ]', fri: '[ ]', sat: '[ ]', sun: '[ ]' },
    { item: isSpanish ? 'Respeté mi objetivo nutricional' : 'Met my nutrition target', mon: '[ ]', tue: '[ ]', wed: '[ ]', thu: '[ ]', fri: '[ ]', sat: '[ ]', sun: '[ ]' },
    { item: isSpanish ? 'Bebí suficiente agua y descansé' : 'Hydrated and rested well', mon: '[ ]', tue: '[ ]', wed: '[ ]', thu: '[ ]', fri: '[ ]', sat: '[ ]', sun: '[ ]' }
  ], { pageTitle: isSpanish ? 'Seguimiento' : 'Tracking', pageSubtitle: '', isSpanish });
  callout(doc, isSpanish ? 'Importante' : 'Important', isSpanish
    ? 'Este documento es orientativo y no sustituye la valoración de un entrenador o profesional sanitario.'
    : 'This document is guidance and does not replace advice from a trainer or healthcare professional.', '#fff5e9');
  doc.fontSize(8).fillColor(COLORS.muted).font('Helvetica').text(`© ${new Date().getFullYear()} TITAN GYM · ${isSpanish ? 'Todos los derechos reservados' : 'All rights reserved'}`, { align: 'center' });
}

export function createPlanPdf(plan, language = 'es') {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, autoFirstPage: true, bufferPages: true });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  buildPlanPdf(doc, plan, language);
  doc.end();
  return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}
