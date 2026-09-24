import { useState } from 'react'
import '../styles/AIAssistant.css'

const API = '/api/ai'

const trainingExercises = {
  push: ['Press de banca', 'Flexiones', 'Press militar', 'Fondos en paralelas'],
  pull: ['Dominadas', 'Remo con barra', 'Jalón al pecho', 'Curl de bíceps'],
  legs: ['Sentadillas', 'Peso muerto rumano', 'Zancadas', 'Elevación de gemelos'],
  cardio: ['Carrera suave', 'Bicicleta', 'Burpees', 'Saltos de comba']
}

function AIAssistant({ language, onClose }) {
  const [type, setType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)
  const [message, setMessage] = useState('')
  const [trainingForm, setTrainingForm] = useState({ name: '', goal: 'Ganar músculo', level: 'Intermedio', days: '4' })
  const [nutritionForm, setNutritionForm] = useState({ name: '', age: '25', weight: '70', height: '175', sex: 'male', activity: '1.55', goal: 'Mantener peso' })
  const isSpanish = language === 'es'

  const labels = isSpanish ? {
    title: 'Asistente personal', choose: 'Elige un plan', training: 'Plan de entrenamiento', nutrition: 'Plan de nutrición', name: 'Nombre', goal: 'Objetivo', level: 'Nivel', days: 'Días por semana', age: 'Edad', weight: 'Peso (kg)', height: 'Altura (cm)', sex: 'Sexo', activity: 'Actividad', generate: 'Generar plan', back: 'Volver', close: 'Cerrar', download: 'Descargar PDF', generated: 'Plan generado correctamente', male: 'Hombre', female: 'Mujer', maintain: 'Mantener peso', lose: 'Perder grasa', gain: 'Ganar músculo', beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado', low: 'Baja', medium: 'Moderada', high: 'Alta', trainingResult: 'Rutina semanal', nutritionResult: 'Resumen nutricional', calories: 'Calorías diarias', basal: 'Metabolismo basal', macros: 'Macronutrientes', meals: 'Distribución de comidas', foods: 'Alimentos sugeridos', error: 'No se pudo generar el plan.'
  } : {
    title: 'Personal assistant', choose: 'Choose a plan', training: 'Training plan', nutrition: 'Nutrition plan', name: 'Name', goal: 'Goal', level: 'Level', days: 'Days per week', age: 'Age', weight: 'Weight (kg)', height: 'Height (cm)', sex: 'Sex', activity: 'Activity', generate: 'Generate plan', back: 'Back', close: 'Close', download: 'Download PDF', generated: 'Plan generated successfully', male: 'Male', female: 'Female', maintain: 'Maintain weight', lose: 'Lose fat', gain: 'Gain muscle', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', low: 'Low', medium: 'Moderate', high: 'High', trainingResult: 'Weekly routine', nutritionResult: 'Nutrition summary', calories: 'Daily calories', basal: 'Basal metabolism', macros: 'Macronutrients', meals: 'Meal distribution', foods: 'Suggested foods', error: 'The plan could not be generated.'
  }

  const update = (setter, name) => event => setter(previous => ({ ...previous, [name]: event.target.value }))

  const generateTraining = () => {
    const dayCount = Number(trainingForm.days)
    const focuses = ['push', 'pull', 'legs', 'cardio']
    const schedule = Array.from({ length: dayCount }, (_, index) => {
      const focus = focuses[index % focuses.length]
      return { day: `Día ${index + 1}`, focus: focus.toUpperCase(), exercises: trainingExercises[focus], sets: trainingForm.level === 'Principiante' ? 3 : 4, reps: trainingForm.level === 'Avanzado' ? '8-10' : '10-12', rest: '60-90 segundos' }
    })
    setPlan({ type: 'training', name: trainingForm.name || 'Cliente', goal: trainingForm.goal, level: trainingForm.level, schedule })
  }

  const generateNutrition = async () => {
    const weight = Number(nutritionForm.weight)
    const height = Number(nutritionForm.height)
    const age = Number(nutritionForm.age)
    const bmr = nutritionForm.sex === 'male' ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161
    const baseCalories = Math.round(bmr * Number(nutritionForm.activity))
    const calories = Math.max(1200, baseCalories + (nutritionForm.goal === 'Ganar músculo' ? 250 : nutritionForm.goal === 'Perder grasa' ? -300 : 0))
    const macros = { protein: Math.round(weight * 2), carbs: Math.round((calories * 0.45) / 4), fat: Math.round((calories * 0.25) / 9) }
    let suggestedFoods = []
    try {
      const response = await fetch(`${API}/suggest-foods`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ calories, macros }) })
      if (response.ok) suggestedFoods = (await response.json()).foods || []
    } catch {
      suggestedFoods = []
    }
    setPlan({ type: 'nutrition', name: nutritionForm.name || 'Cliente', bmr: Math.round(bmr), calories, macros, meals: [{ time: 'Desayuno', calories: Math.round(calories * 0.25) }, { time: 'Almuerzo', calories: Math.round(calories * 0.35) }, { time: 'Cena', calories: Math.round(calories * 0.3) }, { time: 'Snack', calories: Math.round(calories * 0.1) }], suggestedFoods })
  }

  const generate = async event => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      if (type === 'training') generateTraining()
      else await generateNutrition()
    } catch {
      setMessage(labels.error)
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API}/generate-pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, language }) })
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `plan-${plan.type}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch { setMessage(labels.error) } finally { setLoading(false) }
  }

  return (
    <div className="ai-assistant-overlay" onClick={onClose}>
      <section className="ai-assistant" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
        <button className="ai-close" type="button" onClick={onClose} aria-label={labels.close}>×</button>
        <span className="ai-kicker">TITAN GYM</span>
        <h2>{labels.title}</h2>
        {!type && !plan && <><p>{labels.choose}</p><div className="ai-choice-grid"><button type="button" onClick={() => setType('training')}>🏋️<strong>{labels.training}</strong></button><button type="button" onClick={() => setType('nutrition')}>🥗<strong>{labels.nutrition}</strong></button></div></>}
        {type && !plan && <form className="ai-form" onSubmit={generate}><button className="ai-back" type="button" onClick={() => setType(null)}>← {labels.back}</button><label>{labels.name}<input value={type === 'training' ? trainingForm.name : nutritionForm.name} onChange={type === 'training' ? update(setTrainingForm, 'name') : update(setNutritionForm, 'name')} /></label>{type === 'training' ? <><label>{labels.goal}<select value={trainingForm.goal} onChange={update(setTrainingForm, 'goal')}><option>{labels.gain}</option><option>{labels.lose}</option><option>{labels.maintain}</option></select></label><label>{labels.level}<select value={trainingForm.level} onChange={update(setTrainingForm, 'level')}><option>{labels.beginner}</option><option>{labels.intermediate}</option><option>{labels.advanced}</option></select></label><label>{labels.days}<input type="number" min="1" max="7" value={trainingForm.days} onChange={update(setTrainingForm, 'days')} /></label></> : <><div className="ai-form-row"><label>{labels.age}<input type="number" min="13" value={nutritionForm.age} onChange={update(setNutritionForm, 'age')} /></label><label>{labels.weight}<input type="number" min="30" value={nutritionForm.weight} onChange={update(setNutritionForm, 'weight')} /></label></div><div className="ai-form-row"><label>{labels.height}<input type="number" min="100" value={nutritionForm.height} onChange={update(setNutritionForm, 'height')} /></label><label>{labels.sex}<select value={nutritionForm.sex} onChange={update(setNutritionForm, 'sex')}><option value="male">{labels.male}</option><option value="female">{labels.female}</option></select></label></div><label>{labels.goal}<select value={nutritionForm.goal} onChange={update(setNutritionForm, 'goal')}><option>{labels.maintain}</option><option>{labels.lose}</option><option>{labels.gain}</option></select></label><label>{labels.activity}<select value={nutritionForm.activity} onChange={update(setNutritionForm, 'activity')}><option value="1.2">{labels.low}</option><option value="1.55">{labels.medium}</option><option value="1.725">{labels.high}</option></select></label></>}<button className="ai-primary" type="submit" disabled={loading}>{loading ? '...' : labels.generate}</button></form>}
        {plan && <div className="ai-result"><p className="ai-success">{labels.generated}</p>{plan.type === 'training' ? <><h3>{labels.trainingResult}</h3>{plan.schedule.map(day => <article key={day.day}><strong>{day.day} · {day.focus}</strong><p>{day.exercises.join(' · ')}</p><small>{day.sets} series · {day.reps} repeticiones · {day.rest}</small></article>)}</> : <><h3>{labels.nutritionResult}</h3><div className="ai-stats"><span>{labels.basal}<b>{plan.bmr} kcal</b></span><span>{labels.calories}<b>{plan.calories} kcal</b></span></div><h3>{labels.macros}</h3><p>Proteína: {plan.macros.protein} g · C: {plan.macros.carbs} g · G: {plan.macros.fat} g</p><h3>{labels.meals}</h3>{plan.meals.map(meal => <p key={meal.time}>{meal.time}: <strong>{meal.calories} kcal</strong></p>)}{plan.suggestedFoods?.length > 0 && <><h3>{labels.foods}</h3>{plan.suggestedFoods.map((food, index) => <p key={`${food.name}-${index}`}>{food.meal}: {food.name} ({food.grams} g)</p>)}</>}</>}<div className="ai-result-actions"><button type="button" onClick={downloadPdf} disabled={loading}>{labels.download}</button></div>{message && <p className="ai-message">{message}</p>}<button className="ai-back" type="button" onClick={() => { setPlan(null); setMessage('') }}>← {labels.back}</button></div>}
      </section>
    </div>
  )
}

export default AIAssistant
