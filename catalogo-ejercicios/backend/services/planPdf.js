// PDF del plan generado por el asistente IA. Soporta plan de entrenamiento,
// plan de nutrición y el plan COMBINADO (entrenamiento + nutrición) que se
// produce al aceptar la recomendación cruzada.

import PDFDocument from 'pdfkit';

const BRAND = '#173b43';
const ACCENT = '#d88b51';
const GRAY = '#6b7280';

export function buildPlanPdf(doc, plan, language = 'es') {
  const isSpanish = language !== 'en';
  const title = plan.type === 'training'
    ? (isSpanish ? 'Plan de Entrenamiento Personalizado' : 'Personalized Training Plan')
    : plan.type === 'nutrition'
      ? (isSpanish ? 'Plan de Nutrición Personalizado' : 'Personalized Nutrition Plan')
      : (isSpanish ? 'Plan Completo: Entrenamiento + Nutrición' : 'Full Plan: Training + Nutrition');

  doc.fontSize(24).fillColor(BRAND).text('TITAN GYM', { align: 'center' });
  doc.fontSize(16).fillColor(ACCENT).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).fillColor(GRAY).text(`${isSpanish ? 'Cliente' : 'Client'}: ${plan.name}`, { align: 'center' });
  doc.moveDown(2);

  const sections = plan.type === 'combined' ? [plan.trainingPlan, plan.nutritionPlan] : [plan];

  for (const section of sections) {
    if (!section) continue;
    if (section.type === 'training') {
      doc.fontSize(14).fillColor(BRAND).text(`${isSpanish ? 'Objetivo' : 'Goal'}: ${section.goal}  |  ${isSpanish ? 'Nivel' : 'Level'}: ${section.level}`);
      doc.moveDown(0.5);
      doc.fontSize(16).fillColor(ACCENT).text(isSpanish ? 'Rutina Semanal' : 'Weekly Routine');
      doc.moveDown(0.5);
      section.schedule.forEach(day => {
        doc.fontSize(12).fillColor(BRAND).text(`${day.day} — ${day.focus}`, { underline: true });
        doc.fontSize(10).fillColor(GRAY).text(`${day.sets} ${isSpanish ? 'series' : 'sets'} x ${day.reps} ${isSpanish ? 'repeticiones' : 'reps'} — ${isSpanish ? 'Descanso' : 'Rest'}: ${day.rest} — ${day.minutes} min`, { indent: 20 });
        day.exercises.forEach(name => doc.fontSize(10).fillColor(GRAY).text(`• ${name}`, { indent: 30 }));
        doc.moveDown(0.5);
      });
      if (section.progress) {
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor(ACCENT).text(isSpanish ? 'Progreso estimado' : 'Estimated progress');
        doc.fontSize(10).fillColor(GRAY).text(`${isSpanish ? 'Minutos semanales' : 'Weekly minutes'}: ${section.progress.weeklyMinutes} — ${isSpanish ? 'Gasto semanal' : 'Weekly burn'}: ${section.progress.weeklyCalories} kcal`);
        doc.fontSize(10).fillColor(GRAY).text(section.progress.verdict);
        doc.moveDown();
      }
    } else {
      doc.fontSize(14).fillColor(BRAND).text(`${isSpanish ? 'Metabolismo basal' : 'Basal metabolism'}: ${section.bmr} kcal  |  TDEE: ${section.tdee} kcal  |  ${isSpanish ? 'Calorías diarias' : 'Daily calories'}: ${section.calories} kcal`);
      doc.moveDown(0.5);
      doc.fontSize(16).fillColor(ACCENT).text(isSpanish ? 'Macronutrientes' : 'Macronutrients');
      doc.fontSize(11).fillColor(GRAY).text(`Proteína: ${section.macros.protein} g — ${isSpanish ? 'Carbohidratos' : 'Carbs'}: ${section.macros.carbs} g — ${isSpanish ? 'Grasas' : 'Fat'}: ${section.macros.fat} g`);
      doc.moveDown(0.5);
      doc.fontSize(16).fillColor(ACCENT).text(isSpanish ? 'Distribución de Comidas' : 'Meal Distribution');
      section.meals.forEach(meal => doc.fontSize(11).fillColor(BRAND).text(`${meal.time}: ${meal.calories} kcal`, { indent: 10 }));
      if (section.progress) {
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor(ACCENT).text(isSpanish ? 'Progreso estimado' : 'Estimated progress');
        doc.fontSize(10).fillColor(GRAY).text(`TDEE: ${section.progress.tdee} kcal — ${isSpanish ? 'Diferencia diaria' : 'Daily difference'}: ${section.progress.dailyDelta > 0 ? '+' : ''}${section.progress.dailyDelta} kcal — ${isSpanish ? 'Cambio semanal estimado' : 'Estimated weekly change'}: ${section.progress.weeklyChangeKg} kg`);
        doc.fontSize(10).fillColor(GRAY).text(section.progress.verdict);
        if (section.progress.weeksToTarget) {
          doc.fontSize(10).fillColor(GRAY).text(`${isSpanish ? 'Semanas hasta tu peso objetivo' : 'Weeks to target weight'}: ${section.progress.weeksToTarget}`);
        }
        doc.moveDown();
      }
      if (section.suggestedFoods?.length) {
        doc.moveDown(0.5);
        doc.fontSize(16).fillColor(ACCENT).text(isSpanish ? 'Dieta Sugerida' : 'Suggested Diet');
        section.suggestedFoods.forEach(food => {
          doc.fontSize(10).fillColor(GRAY).text(`• ${food.meal}: ${food.name}${food.brand ? ` (${food.brand})` : ''} — ${food.grams} g — ${food.calories} kcal — P ${food.protein} / C ${food.carbohydrates} / G ${food.fat}`, { indent: 20 });
        });
        if (section.foodTotals) {
          doc.moveDown(0.5);
          doc.fontSize(11).fillColor(BRAND).text(`${isSpanish ? 'Total calculado' : 'Calculated total'}: ${section.foodTotals.calories} kcal — P ${section.foodTotals.protein} g / C ${section.foodTotals.carbohydrates} g / G ${section.foodTotals.fat} g`);
        }
      }
      doc.moveDown();
    }
  }

  doc.moveDown(2);
  doc.fontSize(10).fillColor(GRAY).text(`© ${new Date().getFullYear()} TITAN GYM. ${isSpanish ? 'Todos los derechos reservados.' : 'All rights reserved.'}`, { align: 'center' });
}

export function createPlanPdf(plan, language = 'es') {
  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  buildPlanPdf(doc, plan, language);
  doc.end();
  return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}
