import { useState, useRef, useEffect } from 'react'
import { auth } from '../services/firebase'
import { getProfileFavorites, saveProfileFavorites, isFavorited } from '../services/profile'
import '../styles/AIAssistant.css'

const API = '/api/ai'

const COPY = {
  es: {
    title: 'TITAN IA',
    subtitle: 'Tu entrenador y nutricionista virtual · Plan Elite',
    welcome: '¡Hola! 👋 Soy TITAN, tu entrenador y nutricionista virtual. Pregúntame lo que quieras: ejercicios por grupo muscular ("dame 2 de espalda y 4 de pierna"), alimentos concretos ("¿cuántas calorías tiene el pollo?", "alimentos con menos de 100 kcal"), la tienda... o crea tu plan personalizado hablando conmigo. ¿Empezamos?',
    placeholder: 'Escribe tu mensaje...',
    planTrigger: '📋 Crear mi plan con TITAN',
    suggestions: [
      { icon: '🏋️', text: 'Dame 2 ejercicios de espalda y 4 de pierna' },
      { icon: '🥗', text: 'Alimentos con menos de 100 kcal' },
      { icon: '🥩', text: '¿Qué alimentos tienen más proteína?' },
      { icon: '🛒', text: '¿Qué productos de la tienda me recomiendas?' },
      { icon: '🔥', text: 'Quiero perder grasa, ¿por dónde empiezo?' }
    ]
  },
  en: {
    title: 'TITAN AI',
    subtitle: 'Your virtual trainer & nutritionist · Elite Plan',
    welcome: 'Hi! 👋 I am TITAN, your virtual trainer and nutritionist. Ask me anything: exercises by muscle group ("give me 2 back and 4 leg exercises"), specific foods ("how many calories does chicken have?", "foods under 100 kcal"), the shop... or build your personalized plan by chatting with me. Shall we start?',
    placeholder: 'Type your message...',
    planTrigger: '📋 Build my plan with TITAN',
    suggestions: [
      { icon: '🏋️', text: 'Give me 2 back and 4 leg exercises' },
      { icon: '🥗', text: 'Foods under 100 kcal' },
      { icon: '🥩', text: 'Which foods have the most protein?' },
      { icon: '🛒', text: 'Which shop products do you recommend?' },
      { icon: '🔥', text: 'I want to lose fat, where do I start?' }
    ]
  }
}

// Guion conversacional del plan: TITAN pregunta, tú respondes
const PLAN_SCRIPT = {
  es: {
    training: [
      { key: 'goal', question: '¡Genial! 💪 ¿Cuál es tu objetivo?', chips: [['💪 Ganar músculo', 'Ganar músculo'], ['🔥 Perder grasa', 'Perder grasa'], ['⚖️ Mantener peso', 'Mantener peso']] },
      { key: 'level', question: '¿Cuál es tu nivel actual?', chips: [['🌱 Principiante', 'Principiante'], ['⚡ Intermedio', 'Intermedio'], ['🏆 Avanzado', 'Avanzado']] },
      { key: 'days', question: '¿Cuántos días por semana quieres entrenar? (1 a 7)', numeric: { min: 1, max: 7 } }
    ],
    nutrition: [
      { key: 'goal', question: '¡Vamos con la nutrición! 🥗 ¿Cuál es tu objetivo?', chips: [['⚖️ Mantener peso', 'Mantener peso'], ['🔥 Perder grasa', 'Perder grasa'], ['💪 Ganar músculo', 'Ganar músculo']] },
      { key: 'age', question: '¿Cuántos años tienes?', numeric: { min: 10, max: 100 } },
      { key: 'weight', question: '¿Cuánto pesas? (en kg)', numeric: { min: 30, max: 300 } },
      { key: 'height', question: '¿Cuánto mides? (en cm)', numeric: { min: 100, max: 250 } },
      { key: 'sex', question: '¿Eres chico o chica?', chips: [['👨 Hombre', 'male'], ['👩 Mujer', 'female']] },
      { key: 'activity', question: '¿Cuánta actividad física haces en tu día a día?', chips: [['🛋️ Baja (oficina, poco movimiento)', 'low'], ['🚶 Moderada (caminas a menudo)', 'medium'], ['🏃 Alta (trabajo físico o deporte diario)', 'high']] },
      { key: 'targetWeight', question: '¿Tienes un peso objetivo en kg? (si no, escribe "no")', optional: true },
      { key: 'restrictions', question: '¿Alguna restricción alimentaria? (vegano, sin lactosa, sin gluten... o "no")', optional: true }
    ],
    chooseType: { question: '¡Perfecto! 🚀 ¿Qué plan quieres que te cree?', chips: [['🏋️ Plan de entrenamiento', 'training'], ['🥗 Plan de nutrición', 'nutrition']] },
    invalidNumber: minMax => `Escribe un número entre ${minMax.min} y ${minMax.max} para continuar 🙂`,
    done: '¡Ya tengo todo lo que necesito! 🎯 Calculando tu plan con tus datos...'
  },
  en: {
    training: [
      { key: 'goal', question: 'Great! 💪 What is your goal?', chips: [['💪 Gain muscle', 'Gain músculo'], ['🔥 Lose fat', 'Perder grasa'], ['⚖️ Maintain weight', 'Mantener peso']] },
      { key: 'level', question: 'What is your current level?', chips: [['🌱 Beginner', 'Principiante'], ['⚡ Intermediate', 'Intermedio'], ['🏆 Advanced', 'Avanzado']] },
      { key: 'days', question: 'How many days per week do you want to train? (1 to 7)', numeric: { min: 1, max: 7 } }
    ],
    nutrition: [
      { key: 'goal', question: "Let's talk nutrition! 🥗 What is your goal?", chips: [['⚖️ Maintain weight', 'Mantener peso'], ['🔥 Lose fat', 'Perder grasa'], ['💪 Gain muscle', 'Ganar músculo']] },
      { key: 'age', question: 'How old are you?', numeric: { min: 10, max: 100 } },
      { key: 'weight', question: 'How much do you weigh? (kg)', numeric: { min: 30, max: 300 } },
      { key: 'height', question: 'How tall are you? (cm)', numeric: { min: 100, max: 250 } },
      { key: 'sex', question: 'Are you male or female?', chips: [['👨 Male', 'male'], ['👩 Female', 'female']] },
      { key: 'activity', question: 'How much physical activity do you do daily?', chips: [['🛋️ Low (desk job)', 'low'], ['🚶 Moderate (walk often)', 'medium'], ['🏃 High (physical job or daily sport)', 'high']] },
      { key: 'targetWeight', question: 'Do you have a target weight in kg? (if not, type "no")', optional: true },
      { key: 'restrictions', question: 'Any dietary restrictions? (vegan, lactose-free, gluten-free... or "no")', optional: true }
    ],
    chooseType: { question: 'Perfect! 🚀 Which plan should I create for you?', chips: [['🏋️ Training plan', 'training'], ['🥗 Nutrition plan', 'nutrition']] },
    invalidNumber: minMax => `Type a number between ${minMax.min} and ${minMax.max} to continue 🙂`,
    done: 'I have everything I need! 🎯 Calculating your plan with your data...'
  }
}

const GOAL_MAP = {
  'ganar músculo': 'Ganar músculo', 'perder grasa': 'Perder grasa', 'mantener peso': 'Mantener peso',
  'gain muscle': 'Ganar músculo', 'lose fat': 'Perder grasa', 'maintain weight': 'Mantener peso'
}

// Temas prohibidos (fallback local si el backend no responde)
const OFF_TOPIC_PATTERN = /(clima|tiempo atmosférico|chiste|película|películas|política|presidente|fútbol|música|programación|código|javascript|matemáticas|historia|geografía)/i
const TOPIC_BOUNCE = 'Lo siento, no puedo dar esta información. Solo puedo ayudarte con temas de nutrición, ejercicio y la tienda de TITAN GYM.'

// Adjunta un código de error para poder distinguir la causa real del fallo
function withCode(error, code) {
  error.code = code
  return error
}
const PLAN_INTENT = /(quiero|hazme|crea|créame|genera|generarme|dame|necesito|preparame|prepárame).*\b(plan|rutina|dieta)\b|^\s*plan\s+(de\s+)?(entrenamiento|nutricion|nutrición)\s*$|^\s*(plan|rutina|dieta)\s*$/i
// Un mensaje con un alimento concreto cuenta como pregunta de nutrición
// Marcadores [[FAV:{...}]] que envía el backend para pintar el botón de favoritos
const FAV_PATTERN = /\[\[FAV:(\{"type":"(?:exercise|food)"[^\]]*\})\]\]/g

// Convierte **negritas** del texto en <strong>
function renderTextWithBold(text, keyPrefix) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((chunk, index) => {
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4) {
      return <strong key={`${keyPrefix}-b${index}`}>{chunk.slice(2, -2)}</strong>
    }
    return chunk
  })
}

function renderFavoriteMarkers(content, onFavorite, savedKeys) {
  const parts = []
  let lastIndex = 0
  let match
  const pattern = new RegExp(FAV_PATTERN)
  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(renderTextWithBold(content.slice(lastIndex, match.index), `t${match.index}`))
    try {
      const data = JSON.parse(match[1])
      const key = `${data.type}-${data.id}`
      const saved = savedKeys?.has(key)
      parts.push(
        <span className="ai-fav-item" key={key}>
          <span>{renderTextWithBold(data.label, key)}</span>
          <button
            type="button"
            className={`ai-fav-btn ${saved ? 'saved' : ''}`}
            onClick={() => onFavorite(data)}
            title={saved ? 'En favoritos' : 'Añadir a favoritos'}
            disabled={saved}
          >
            {saved ? '❤️' : '🤍'}
          </button>
        </span>
      )
    } catch {
      parts.push(match[0])
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < content.length) parts.push(renderTextWithBold(content.slice(lastIndex), `t${lastIndex}`))
  return parts
}

function AIAssistant({ language, onClose }) {
  const isSpanish = language === 'es'
  const t = COPY[isSpanish ? 'es' : 'en']
  const script = PLAN_SCRIPT[isSpanish ? 'es' : 'en']

  const [messages, setMessages] = useState([{ id: 1, role: 'assistant', content: t.welcome, kind: 'welcome' }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [plan, setPlan] = useState(null)
  const [recommendation, setRecommendation] = useState(null)
  const [combinedPlan, setCombinedPlan] = useState(null)
  const [wizard, setWizard] = useState(null) // { planType: null|'training'|'nutrition', step: number, data: {} }
  const [wizardMode, setWizardMode] = useState('main') // 'main' | 'complementary'
  const [savedFavorites, setSavedFavorites] = useState(() => new Set())
  const listRef = useRef(null)
  const nextId = useRef(2)

  const labels = {
    basal: isSpanish ? 'Metabolismo basal' : 'Basal metabolism', tdee: isSpanish ? 'Gasto total (TDEE)' : 'Total expenditure (TDEE)',
    calories: isSpanish ? 'Calorías diarias' : 'Daily calories', macros: isSpanish ? 'Macronutrientes' : 'Macronutrients',
    meals: isSpanish ? 'Distribución de comidas' : 'Meal distribution', foods: isSpanish ? 'Dieta sugerida' : 'Suggested diet',
    total: isSpanish ? 'Total diario' : 'Daily total', progress: isSpanish ? 'Progreso estimado' : 'Estimated progress',
    accept: isSpanish ? 'Sí, añádelo a mi plan' : 'Yes, add it to my plan', dismiss: isSpanish ? 'No, gracias' : 'No, thanks',
    download: isSpanish ? '⬇️ Descargar en PDF' : '⬇️ Download as PDF',
    error: isSpanish ? 'Algo salió mal. Inténtalo de nuevo.' : 'Something went wrong. Please try again.',
    training: isSpanish ? 'Entrenamiento' : 'Training', nutrition: isSpanish ? 'Nutrición' : 'Nutrition',
    cancel: isSpanish ? '✖ Cancelar plan' : '✖ Cancel plan',
    offline: isSpanish ? 'Ahora mismo no puedo conectarme con el asistente. Comprueba que el servidor está activo.' : 'I cannot reach the assistant right now. Please check that the server is running.',
    session: isSpanish ? 'Tu sesión no es válida o ha caducado. Vuelve a iniciar sesión y te atiendo al momento. 🔑' : 'Your session is invalid or has expired. Please sign in again and I will help you right away. 🔑',
    server: isSpanish ? 'El asistente ha tenido un problema al responder. Inténtalo de nuevo en unos segundos.' : 'The assistant had a problem answering. Please try again in a few seconds.'
  }

  // Traduce el fallo real (sin sesión / sin servidor / error interno) a un mensaje útil
  const explainError = (error) => {
    const code = error?.code
    if (code === 'no-session' || code === 'token') return labels.session
    if (code === 'offline') return labels.offline
    return labels.server
  }

  const pushMessage = (role, content, extra = {}) =>
    setMessages(previous => [...previous, { id: nextId.current++, role, content, ...extra }])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  // ─── Favoritos desde el chat ─────────────────────────────────────────────
  // Carga los favoritos que ya tiene el usuario para que el ❤️ salga relleno
  useEffect(() => {
    let cancelled = false
    if (!auth.currentUser) return undefined
    getProfileFavorites()
      .then(data => {
        if (cancelled) return
        setSavedFavorites(new Set([
          ...data.exerciseIds.map(id => `exercise-${id}`),
          ...data.nutritionIds.map(id => `food-${id}`)
        ]))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const toggleFavorite = async (item) => {
    const key = `${item.type}-${item.id}`
    if (savedFavorites.has(key)) return
    const isExercise = item.type === 'exercise'
    try {
      const current = await getProfileFavorites()
      const ids = isExercise ? current.exerciseIds : current.nutritionIds
      if (isFavorited(ids, item.id)) {
        setSavedFavorites(previous => new Set([...previous, key]))
        pushMessage('assistant', isSpanish ? `**${item.name}** ya estaba en tus favoritos ❤️` : `**${item.name}** was already in your favorites ❤️`)
        return
      }
      const nextIds = [...ids, String(item.id)]
      if (isExercise) {
        await saveProfileFavorites(nextIds, current.schedule, current.nutritionIds, current.nutritionSchedule)
      } else {
        await saveProfileFavorites(current.exerciseIds, current.schedule, nextIds, current.nutritionSchedule)
      }
      setSavedFavorites(previous => new Set([...previous, key]))
      window.dispatchEvent(new CustomEvent('titan:favorites-updated'))
      pushMessage('assistant', isSpanish
        ? `¡**${item.name}** añadido a ${isExercise ? 'tus ejercicios favoritos' : 'tus alimentos favoritos'}! ❤️ Lo verás en la pestaña de favoritos.`
        : `**${item.name}** added to your ${isExercise ? 'favorite exercises' : 'favorite foods'}! ❤️ You will see it in your favorites tab.`)
    } catch (error) {
      const detail = error?.message ? ` (${error.message})` : ''
      pushMessage('assistant', isSpanish
        ? `No pude añadirlo a favoritos${detail}. Comprueba tu sesión e inténtalo de nuevo.`
        : `Could not add it to favorites${detail}. Check your session and try again.`)
    }
  }

  // Petición autenticada: refresca el token y reintenta una vez si el servidor
  // responde 401 (token caducado), y etiqueta el error para poder explicarlo.
  const authedRequest = async (url, body) => {
    const currentUser = auth.currentUser
    if (!currentUser) throw withCode(new Error('Sin sesión activa'), 'no-session')

    const post = (token) => fetch(`${API}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body)
    })

    const token = await currentUser.getIdToken().catch(() => null)
    let response
    try {
      response = await post(token)
    } catch {
      throw withCode(new Error('Sin conexión con el servidor'), 'offline')
    }

    if (response.status === 401) {
      const refreshed = await currentUser.getIdToken(true).catch(() => null)
      if (refreshed) {
        try {
          const retry = await post(refreshed)
          if (retry.ok) return retry.json()
          response = retry
        } catch {
          throw withCode(new Error('Sin conexión con el servidor'), 'offline')
        }
      }
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      const error = new Error(data.error || `HTTP ${response.status}`)
      error.status = response.status
      throw withCode(error, response.status === 401 ? 'no-session' : 'server')
    }
    return response.json()
  }

  // ─── Asistente del guion conversacional ────────────────────────────────────
  const askStep = (wizardState) => {
    const steps = wizardState.planType ? script[wizardState.planType] : null
    if (!wizardState.planType) {
      pushMessage('assistant', script.chooseType.question, { kind: 'question', chips: script.chooseType.chips })
      return
    }
    if (wizardState.step >= steps.length) return
    const step = steps[wizardState.step]
    pushMessage('assistant', step.question, {
      kind: 'question',
      chips: step.chips || null,
      expectsNumber: Boolean(step.numeric)
    })
  }

  const startWizard = () => {
    setShowSuggestions(false)
    setWizardMode('main')
    setWizard({ planType: null, step: 0, data: {} })
    pushMessage('assistant', script.chooseType.question, { kind: 'question', chips: script.chooseType.chips })
  }

  const cancelWizard = () => {
    setWizard(null)
    setWizardMode('main')
    pushMessage('assistant', isSpanish ? 'Sin problema. 😊 Sigueme preguntando lo que quieras o pulsa el botón de arriba cuando quieras crear tu plan.' : 'No problem. 😊 Keep asking me anything or press the button above when you want to create your plan.')
  }

  const finishWizard = async (wizardState) => {
    const d = wizardState.data
    const input = wizardState.planType === 'training'
      ? { goal: d.goal, level: d.level, days: Number(d.days) }
      : { goal: d.goal, age: Number(d.age), weight: Number(d.weight), height: Number(d.height), sex: d.sex, activity: d.activity, targetWeight: d.targetWeight, restrictions: d.restrictions }
    setThinking(true)
    try {
      const data = await authedRequest('/generate-plan', { type: wizardState.planType, input })
      const generated = data.plan
      setThinking(false)

      if (wizardMode === 'complementary' && plan) {
        // Unir con el plan existente → plan combinado
        const complementary = generated
        const original = plan
        setCombinedPlan({
          type: 'combined',
          name: original.name,
          trainingPlan: original.type === 'training' ? original : complementary,
          nutritionPlan: original.type === 'nutrition' ? original : complementary
        })
        setWizard(null)
        setWizardMode('main')
        setRecommendation(null)
        pushMessage('assistant', isSpanish
          ? `¡Listo! 💪 He unido tu ${original.type === 'training' ? 'entrenamiento' : 'nutrición'} con el nuevo plan: ahora tienes el plan completo abajo y el PDF incluye las dos partes.`
          : `Done! 💪 I merged your ${original.type === 'training' ? 'training' : 'nutrition'} with the new plan: the full plan is below and the PDF includes both parts.`)
        return
      }

      setPlan(generated)
      setRecommendation(data.recommendation || null)
      setCombinedPlan(null)
      // Cerramos el cuestionario: si se quedaba abierto, el input seguía en modo
      // "responde para continuar" y se comía los mensajes del usuario.
      setWizard(null)
      setWizardMode('main')
      pushMessage('assistant', isSpanish
        ? `¡Aquí tienes tu ${wizardState.planType === 'training' ? 'plan de entrenamiento' : 'plan de nutrición'}! 🎉 Puedes descargarlo en PDF aquí abajo.`
        : `Here is your ${wizardState.planType === 'training' ? 'training' : 'nutrition'} plan! 🎉 You can download it as PDF below.`)
    } catch (error) {
      pushMessage('assistant', explainError(error))
      setThinking(false)
      setWizard(null)
    }
  }

  const handleWizardAnswer = (rawText) => {
    const text = rawText.trim()
    let state = { ...wizard, data: { ...wizard.data } }

    // Paso 0: elegir tipo
    if (!state.planType) {
      const picked = script.chooseType.chips.find(([, value]) => text.includes(value) || /entrenamiento|training/i.test(text) && value === 'training' || /nutric/i.test(text) && value === 'nutrition')
      if (!picked) {
        pushMessage('assistant', script.chooseType.question, { kind: 'question', chips: script.chooseType.chips })
        return
      }
      state.planType = picked[1]
      setWizard(state)
      pushMessage('user', picked[0])
      setTimeout(() => askStep(state), 150)
      return
    }

    const steps = script[state.planType]
    const step = steps[state.step]
    pushMessage('user', text)

    // Pregunta numérica
    if (step.numeric) {
      const number = Number(text.replace(',', '.'))
      if (!Number.isFinite(number) || number < step.numeric.min || number > step.numeric.max) {
        pushMessage('assistant', script.invalidNumber(step.numeric), { kind: 'question', expectsNumber: true })
        return
      }
      state.data[step.key] = number
    } else if (step.key === 'goal') {
      const goal = GOAL_MAP[text.toLowerCase()] || steps[0].chips.find(([, value]) => value && text.toLowerCase().includes(value.toLowerCase()))?.[1] || step.chips.find(([label]) => text.includes(label.split(' ').slice(1).join(' ')))?.[1]
      state.data.goal = goal || 'Mantener peso'
    } else if (step.key === 'sex') {
      state.data.sex = /mujer|female|chica/i.test(text) ? 'female' : 'male'
    } else if (step.key === 'activity') {
      state.data.activity = /alta|high/i.test(text) ? 'high' : /baja|low/i.test(text) ? 'low' : 'medium'
    } else if (step.key === 'level') {
      state.data.level = /principiante|beginner/i.test(text) ? 'Principiante' : /avanzado|advanced/i.test(text) ? 'Avanzado' : 'Intermedio'
    } else {
      // opcionales: targetWeight / restrictions
      const value = /^(no|nada|ningun|ninguna|nop|no gracias)$/i.test(text.trim()) ? '' : text.trim()
      state.data[step.key] = value
    }

    const nextStep = state.step + 1
    state.step = nextStep
    setWizard(state)

    if (nextStep >= steps.length) {
      pushMessage('assistant', script.done)
      setTimeout(() => finishWizard(state), 400)
    } else {
      setTimeout(() => askStep(state), 150)
    }
  }

  // ─── Chat normal ───────────────────────────────────────────────────────────
  const sendMessage = async (rawText) => {
    const text = String(rawText ?? input).trim()
    if (!text || thinking) return
    setInput('')

    // ¿Estamos en medio del cuestionario del plan?
    if (wizard) { handleWizardAnswer(text); return }

    // ¿Pide un plan? → iniciar cuestionario en vez de llamar a la IA
    if (PLAN_INTENT.test(text) && text.length < 80) {
      setShowSuggestions(false)
      pushMessage('user', text)
      setWizard({ planType: null, step: 0, data: {} })
      setTimeout(() => pushMessage('assistant', script.chooseType.question, { kind: 'question', chips: script.chooseType.chips }), 150)
      return
    }

    setShowSuggestions(false)
    pushMessage('user', text)
    setThinking(true)
    try {
      const history = messages
        .filter(entry => entry.id !== 1 && entry.kind !== 'question')
        .slice(-12)
        .map(entry => ({ role: entry.role, content: entry.content }))
      const data = await authedRequest('/chat', { message: text, history })
      pushMessage('assistant', data.reply)
    } catch (error) {
      // Si el servidor está caído y la pregunta es de otro tema, se mantiene el filtro local
      if (error?.code === 'offline' && OFF_TOPIC_PATTERN.test(text)) pushMessage('assistant', TOPIC_BOUNCE)
      else pushMessage('assistant', explainError(error))
    } finally {
      setThinking(false)
    }
  }

  // ─── Recomendación cruzada y PDF ───────────────────────────────────────────
  const acceptRecommendation = () => {
    if (!plan || !recommendation) return
    // Evita reiniciar el cuestionario si ya está en marcha (parecía que el botón no hacía nada)
    if (wizard) {
      pushMessage('assistant', isSpanish
        ? 'Ya estamos creando el plan complementario 😊 Responde a la última pregunta de abajo o pulsa «✖ Cancelar plan» para empezar de nuevo.'
        : 'We are already building the complementary plan 😊 Answer the last question below or press “✖ Cancel plan” to start over.')
      return
    }
    const complementaryType = recommendation.kind === 'training' ? 'training' : 'nutrition'
    // El objetivo se hereda del plan ya creado, así que empezamos por la siguiente pregunta
    const startState = { planType: complementaryType, step: 1, data: { goal: plan.goal } }
    setShowSuggestions(false)
    setWizardMode('complementary')
    setWizard(startState)
    // Confirmación inmediata visible antes de que aparezca la pregunta (feedback claro al usuario)
    setAcceptingRecommendation(true)
    pushMessage('assistant', isSpanish
      ? `¡Genial! 🎯 Vamos a crear la otra mitad de tu plan (${complementaryType === 'training' ? 'entrenamiento' : 'nutrición'}). Heredo tu objetivo (${plan.goal}) y te hago unas preguntas rápidas aquí abajo 👇.`
      : `Great! 🎯 Let us build the other half of your plan (${complementaryType === 'training' ? 'training' : 'nutrition'}). I keep your goal (${plan.goal}) and ask you a few quick questions below 👇.`)
    setTimeout(() => {
      askStep(startState)
      setAcceptingRecommendation(false)
    }, 150)
  }

  const [acceptingRecommendation, setAcceptingRecommendation] = useState(false)

  const downloadPdf = async () => {
    const target = combinedPlan || plan
    if (!target) return
    setThinking(true)
    try {
      if (!auth.currentUser) throw withCode(new Error('Sin sesión activa'), 'no-session')
      const token = await auth.currentUser.getIdToken().catch(() => null)
      let response
      try {
        response = await fetch(`${API}/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ plan: target, language })
        })
      } catch {
        throw withCode(new Error('Sin conexión con el servidor'), 'offline')
      }
      if (!response.ok) throw withCode(new Error(`HTTP ${response.status}`), response.status === 401 ? 'no-session' : 'server')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `plan-${target.type}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      pushMessage('assistant', explainError(error))
    } finally {
      setThinking(false)
    }
  }

  // Pregunta activa del cuestionario: se muestra fija arriba del campo de texto
  // para que el usuario siempre vea qué tiene que responder.
  const activeQuestion = wizard ? [...messages].reverse().find(entry => entry.kind === 'question') : null

  return (
    <div className="ai-widget-overlay" onClick={onClose}>
      <section className={`ai-widget ${expanded ? 'ai-widget--expanded' : ''}`} onClick={event => event.stopPropagation()}>
        <header className="ai-widget-header">
          <div className="ai-widget-avatar">🤖</div>
          <div className="ai-widget-title">
            <strong>{t.title}</strong>
            <span className="ai-widget-status"><i />{isSpanish ? 'En línea' : 'Online'}</span>
          </div>
          <div className="ai-widget-header-actions">
            <button type="button" onClick={() => setExpanded(value => !value)} title={expanded ? '—' : '+'}>{expanded ? '🗗' : '⛶'}</button>
            <button type="button" onClick={onClose} title={isSpanish ? 'Cerrar' : 'Close'}>×</button>
          </div>
        </header>

        <div className="ai-widget-chat" ref={listRef}>
          {messages.map(entry => (
            <div key={entry.id} className={`ai-msg ai-msg--${entry.role} ${entry.kind ? `ai-msg--${entry.kind}` : ''}`}>
              {entry.role === 'assistant' && <span className="ai-msg-avatar">🤖</span>}
              <div className="ai-msg-bubble">
                {renderFavoriteMarkers(entry.content, toggleFavorite, savedFavorites)}
                {entry.kind === 'welcome' && (
                  <div className="ai-msg-actions">
                    <button type="button" onClick={startWizard}>{t.planTrigger}</button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {plan && (
            <div className="ai-plan-panel">
              {(combinedPlan ? [combinedPlan.trainingPlan, combinedPlan.nutritionPlan] : [plan]).map(section => (
                <article className="ai-plan-card" key={section.type}>
                  <h4>{section.type === 'training' ? `🏋️ ${labels.training}` : `🥗 ${labels.nutrition}`}</h4>
                  {section.type === 'training' ? (
                    <>
                      <p className="ai-plan-meta">{section.goal} · {section.level}</p>
                      {section.schedule.map(day => (
                        <div className="ai-day" key={day.day}>
                          <strong>{day.day} · {day.focus}</strong>
                          <p>{day.exercises.join(' · ')}</p>
                          <small>{day.sets} series · {day.reps} reps · {day.rest} · {day.minutes} min</small>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="ai-stats">
                        <span>{labels.basal}<b>{section.bmr}</b></span>
                        <span>{labels.tdee}<b>{section.tdee}</b></span>
                        <span>{labels.calories}<b>{section.calories}</b></span>
                        <span>{labels.macros}<b>{section.macros.protein}P/{section.macros.carbs}C/{section.macros.fat}G</b></span>
                      </div>
                      <h5>{labels.meals}</h5>
                      {section.meals.map(meal => <p className="ai-meal-line" key={meal.time}>{meal.time}: <strong>{meal.calories} kcal</strong></p>)}
                      {section.suggestedFoods?.length > 0 && (
                        <>
                          <h5>{labels.foods}</h5>
                          {section.suggestedFoods.map((food, index) => (
                            <p className="ai-meal-line" key={`${food.name}-${index}`}>{food.meal}: {food.name} ({food.grams} g)</p>
                          ))}
                          {section.foodTotals && <p className="ai-meal-line ai-total">{labels.total}: {section.foodTotals.calories} kcal · P {section.foodTotals.protein} g · C {section.foodTotals.carbohydrates} g · G {section.foodTotals.fat} g</p>}
                        </>
                      )}
                    </>
                  )}
                  {section.progress && (
                    <div className="ai-progress-box">
                      <h5>📈 {labels.progress}</h5>
                      <p>{section.type === 'training'
                        ? `${section.progress.weeklyMinutes} min/semana · ${section.progress.weeklyCalories} kcal · ${section.progress.strengthGainPct}`
                        : `TDEE ${section.progress.tdee} kcal · ${section.progress.dailyDelta > 0 ? '+' : ''}${section.progress.dailyDelta} kcal/día · ${section.progress.weeklyChangeKg > 0 ? '+' : ''}${section.progress.weeklyChangeKg} kg/semana`}</p>
                      <p className="ai-verdict">{section.progress.verdict}</p>
                    </div>
                  )}
                </article>
              ))}
              <div className="ai-plan-actions" style={{ position: 'relative' }}>
                <button type="button" onClick={downloadPdf} disabled={thinking}>{labels.download}</button>
                {acceptingRecommendation && (
                  <div className="ai-accepting-recommendation">
                    <span className="ai-typing"><i /><i /><i /></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {recommendation && !wizard && (
            <div className="ai-recommendation">
              <p>💡 {recommendation.reason}</p>
              <div className="ai-recommendation-actions">
                <button type="button" onClick={acceptRecommendation} disabled={thinking}>✅ {labels.accept}</button>
                <button type="button" className="ai-ghost" onClick={() => setRecommendation(null)}>{labels.dismiss}</button>
              </div>
            </div>
          )}

          {thinking && (
            <div className="ai-msg ai-msg--assistant ai-msg--typing">
              <span className="ai-msg-avatar">🤖</span>
              <div className="ai-msg-bubble"><span className="ai-typing"><i /><i /><i /></span></div>
            </div>
          )}

          {wizard && (
            <div className="ai-wizard-bar">
              <div className="ai-wizard-bar-head">
                <span>{isSpanish ? 'Creando tu plan…' : 'Building your plan…'}</span>
                <button type="button" onClick={cancelWizard}>{labels.cancel}</button>
              </div>
              {activeQuestion && (
                <p className="ai-wizard-question">{renderTextWithBold(activeQuestion.content, 'wizard-q')}</p>
              )}
              {activeQuestion?.chips && (
                <div className="ai-chips">
                  {activeQuestion.chips.map(([label]) => (
                    <button key={label} type="button" onClick={() => sendMessage(label)}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {showSuggestions && (
          <div className="ai-widget-suggestions">
            {t.suggestions.map(suggestion => (
              <button key={suggestion.text} type="button" onClick={() => sendMessage(suggestion.text)}>
                <span>{suggestion.icon}</span> {suggestion.text}
              </button>
            ))}
          </div>
        )}

        <form className="ai-widget-input" onSubmit={event => { event.preventDefault(); sendMessage() }}>
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder={wizard ? (isSpanish ? 'Responde para continuar...' : 'Answer to continue...') : t.placeholder}
            maxLength={2000}
          />
          <button type="submit" disabled={!input.trim() || thinking} aria-label={isSpanish ? 'Enviar' : 'Send'}>➤</button>
        </form>
      </section>
    </div>
  )
}

export default AIAssistant
