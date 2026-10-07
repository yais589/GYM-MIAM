import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { apiUrl } from '../services/apiBase'
import CategoryMenu from './CategoryMenu'
import ExerciseCard from './ExerciseCard'
import FavoritesDrawer from './FavoritesDrawer'
import { getProfileFavorites, saveProfileFavorites, isFavorited, sameId } from '../services/profile'
import '../styles/Catalog.css'

function Catalog({ language, user, onRequestAuth, canUseCalendar = false }) {
  const [exercises, setExercises] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [favoriteSchedule, setFavoriteSchedule] = useState({})
  const [visibleCount, setVisibleCount] = useState(4)
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [quickSession, setQuickSession] = useState(null)
  const [quickFocus, setQuickFocus] = useState('full')
  const [quickIntensity, setQuickIntensity] = useState('medium')
  const [quickMinutes, setQuickMinutes] = useState(20)
  const [quickDetail, setQuickDetail] = useState(null)

  const translations = {
    es: {
      title: 'Catálogo de Ejercicios',
      allCategories: 'Todas las Categorías',
      loading: 'Cargando...',
      error: 'Error al cargar los ejercicios',
      showMore: 'Mostrar más'
      ,categories: 'categorías', exercises: 'ejercicios', noExercises: 'No hay ejercicios disponibles'
    },
    en: {
      title: 'Exercise Catalog',
      allCategories: 'All Categories',
      loading: 'Loading...',
      error: 'Error loading exercises',
      showMore: 'Show more'
      ,categories: 'categories', exercises: 'exercises', noExercises: 'No exercises available'
    }
  }

  const t = translations[language]

  const sortByMedia = (exerciseList) => [...exerciseList].sort((first, second) => {
    const firstScore = (first.gif ? 2 : 0) + (first.image ? 1 : 0)
    const secondScore = (second.gif ? 2 : 0) + (second.image ? 1 : 0)
    return secondScore - firstScore
  })

  useEffect(() => {
    const loadFavorites = () => {
      if (!user) {
        setFavorites([])
        setFavoriteSchedule({})
        return
      }
      getProfileFavorites().then(data => {
        setFavorites(Array.isArray(data) ? data : data.exerciseIds || [])
        setFavoriteSchedule(Array.isArray(data) ? {} : data.schedule || {})
      }).catch(() => {
        setFavorites([])
        setFavoriteSchedule({})
      })
    }
    loadFavorites()
    window.addEventListener('titan:favorites-updated', loadFavorites)
    return () => window.removeEventListener('titan:favorites-updated', loadFavorites)
  }, [user])

  useEffect(() => {
    fetchCategories()
    fetchExercises()
  }, [])

  useEffect(() => {
    if (!user) setFavoriteSchedule({})
  }, [user])

  useEffect(() => {
    if (selectedCategory) {
      fetchExercisesByCategory(selectedCategory)
    } else {
      fetchExercises()
    }
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const response = await axios.get(apiUrl('/categories'))
      setCategories(response.data)
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(t.error)
    }
  }

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const response = await axios.get(apiUrl('/exercises'))
      setAllExercises(response.data)
      const exercisesByCategory = new Map()

      response.data.forEach(exercise => {
        const category = String(exercise.category || 'general')
        const currentBest = exercisesByCategory.get(category)
        const mediaScore = (exercise.gif ? 2 : 0) + (exercise.image ? 1 : 0)
        const currentScore = currentBest
          ? (currentBest.gif ? 2 : 0) + (currentBest.image ? 1 : 0)
          : -1

        if (!currentBest || mediaScore > currentScore) {
          exercisesByCategory.set(category, exercise)
        }
      })

      const onePerCategory = [...exercisesByCategory.values()]

      setExercises(onePerCategory)
      setVisibleCount(onePerCategory.length)
    } catch (err) {
      console.error('Error fetching exercises:', err)
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExercisesByCategory = async (category) => {
    try {
      setLoading(true)
      const response = await axios.get(apiUrl(`/exercises/category/${encodeURIComponent(category)}`))
      setExercises(sortByMedia(response.data))
      setVisibleCount(Math.min(4, response.data.length))
    } catch (err) {
      console.error('Error fetching exercises:', err)
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
  }

  const handleShowMore = () => {
    setVisibleCount(currentCount => Math.min(currentCount + 4, exercises.length))
  }

  const handleAddFavorite = async (exercise) => {
    const alreadySaved = isFavorited(favorites, exercise.id)
    const nextFavorites = alreadySaved
      ? favorites.filter(id => !sameId(id, exercise.id))
      : [...favorites, String(exercise.id)]
    setFavorites(nextFavorites)
    const nextSchedule = { ...favoriteSchedule }
    if (alreadySaved) delete nextSchedule[exercise.id]
    setFavoriteSchedule(nextSchedule)
    try { await saveProfileFavorites(nextFavorites, nextSchedule) } catch {
      setFavorites(favorites)
      setFavoriteSchedule(favoriteSchedule)
    }
  }

  const handleScheduleChange = async (exerciseId, days) => {
    const nextSchedule = { ...favoriteSchedule, [exerciseId]: days }
    setFavoriteSchedule(nextSchedule)
    try {
      await saveProfileFavorites(favorites, nextSchedule)
    } catch {
      setFavoriteSchedule(favoriteSchedule)
    }
  }

  const favoriteExercises = allExercises.filter(exercise => isFavorited(favorites, exercise.id))

  const createQuickSession = (minutes, focus = quickFocus, intensity = quickIntensity) => {
    if (!user) {
      onRequestAuth()
      return
    }
    const pool = allExercises.length ? allExercises : exercises
    const filteredPool = focus === 'full'
      ? pool
      : pool.filter(exercise => String(exercise.category || '').toLowerCase().includes(focus))
    const source = filteredPool.length >= 3 ? filteredPool : pool
    const amount = minutes <= 10 ? 3 : minutes <= 20 ? 4 : 5
    const selected = [...source]
      .sort(() => Math.random() - 0.5)
      .slice(0, amount)
    const warmup = minutes <= 10 ? 2 : 4
    const cooldown = minutes <= 10 ? 2 : 4
    setQuickSession({ minutes, exercises: selected, focus, intensity, warmup, cooldown })
  }

  return (
    <section className="catalog">
      <div className="catalog-container">
        <CategoryMenu
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          language={language}
          requiresAuth={true}
          isAuthenticated={!!user}
          onRequestAuth={onRequestAuth}
        />
        
        <div className="exercises-section">
          <div className="exercises-header">
            <div>
              <span className="catalog-kicker">GYMPOWER / TRAINING LIBRARY</span>
              <h2>
                {selectedCategory
                  ? ({ Brazos: language === 'en' ? 'Arms' : 'Brazos', Espalda: language === 'en' ? 'Back' : 'Espalda', Abdominales: language === 'en' ? 'Abs' : 'Abdominales', Hombros: language === 'en' ? 'Shoulders' : 'Hombros', Pantorrillas: language === 'en' ? 'Calves' : 'Pantorrillas', Pecho: language === 'en' ? 'Chest' : 'Pecho', Piernas: language === 'en' ? 'Legs' : 'Piernas', Cardio: 'Cardio' }[selectedCategory] || selectedCategory)
                  : t.allCategories}
              </h2>
              <p className="catalog-lead">{language === 'es' ? 'Explora, guarda y domina cada movimiento.' : 'Explore, save and master every movement.'}</p>
            </div>
            <div className="catalog-summary" aria-label="Resumen del catálogo">
              <span><strong>{categories.length}</strong> {t.categories}</span>
              <span><strong>{exercises.length}</strong> {t.exercises}</span>
            </div>
          </div>
          <div className="catalog-insight" aria-label="Información del catálogo">
            <div><span className="insight-dot" /> <strong>{language === 'es' ? 'CATÁLOGO ACTIVO' : 'CATALOG ONLINE'}</strong><small>{language === 'es' ? 'Datos actualizados' : 'Updated data'}</small></div>
            <div><strong>{allExercises.length || '—'}</strong><small>{language === 'es' ? 'movimientos disponibles' : 'available movements'}</small></div>
            <div><strong>24/7</strong><small>{language === 'es' ? 'listo para entrenar' : 'ready to train'}</small></div>
          </div>

          {loading && <p className="loading">{t.loading}</p>}
          {error && <p className="error">{error}</p>}

          <div className="exercises-grid">
            {exercises.slice(0, visibleCount).map(exercise => (
              <ExerciseCard 
                key={exercise.id} 
                exercise={exercise}
                language={language}
                user={user}
                onAddFavorite={handleAddFavorite}
                isFavorite={isFavorited(favorites, exercise.id)}
                onRequestAuth={onRequestAuth}
              />
            ))}
          </div>

          {selectedCategory && visibleCount < exercises.length && (
            <button className="show-more-btn" onClick={handleShowMore}>
              {t.showMore}
            </button>
          )}

          {!loading && exercises.length === 0 && (
            <p className="no-exercises">{t.noExercises}</p>
          )}

          <section className="quick-session" aria-labelledby="quick-session-title">
            <div className="quick-session-copy">
              <span className="catalog-kicker">TITAN / QUICK START 02</span>
              <h3 id="quick-session-title">{language === 'es' ? 'Tu entrenamiento empieza aquí' : 'Your workout starts here'}</h3>
              <p>{language === 'es'
                ? 'Crea una sesión guiada en segundos. Elige duración, enfoque e intensidad: TITAN hará el resto.'
                : 'Build a guided session in seconds. Choose duration, focus and intensity: TITAN does the rest.'}</p>
              <div className="quick-option-group">
                <span>{language === 'es' ? 'ENFOQUE' : 'FOCUS'}</span>
                <div className="quick-choice-row">
                  {[
                    ['full', language === 'es' ? 'Cuerpo completo' : 'Full body'],
                    ['pierna', language === 'es' ? 'Piernas' : 'Legs'],
                    ['espalda', language === 'es' ? 'Espalda' : 'Back'],
                    ['pecho', language === 'es' ? 'Pecho' : 'Chest']
                  ].map(([value, label]) => (
                    <button key={value} type="button" className={quickFocus === value ? 'selected' : ''} onClick={() => setQuickFocus(value)}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="quick-option-group">
                <span>{language === 'es' ? 'INTENSIDAD' : 'INTENSITY'}</span>
                <div className="quick-choice-row intensity-row">
                  {[
                    ['low', '◌', language === 'es' ? 'Controlada' : 'Controlled'],
                    ['medium', '◒', language === 'es' ? 'Equilibrada' : 'Balanced'],
                    ['high', '◉', language === 'es' ? 'Desafío' : 'Challenge']
                  ].map(([value, icon, label]) => (
                    <button key={value} type="button" className={quickIntensity === value ? 'selected' : ''} onClick={() => setQuickIntensity(value)}>{icon} {label}</button>
                  ))}
                </div>
              </div>
              <div className="quick-session-actions">
                {[10, 20, 30].map(minutes => (
                  <button
                    key={minutes}
                    type="button"
                    className={quickMinutes === minutes ? 'selected' : ''}
                    onClick={() => setQuickMinutes(minutes)}
                  >
                    <strong>{minutes}</strong> {language === 'es' ? 'MINUTOS' : 'MINUTES'}
                  </button>
                ))}
              </div>
              <button className="quick-generate" type="button" onClick={() => createQuickSession(quickMinutes)}>
                ⚡ {language === 'es' ? 'Generar mi sesión' : 'Generate my session'}
              </button>
              <small className="quick-session-note">⚡ {language === 'es' ? 'Sin esperas · ejercicios del catálogo TITAN' : 'No waiting · exercises from the TITAN catalog'}</small>
            </div>
            <div className="quick-session-result">
              {quickSession ? (
                <>
                  <div className="quick-session-result-header">
                    <div><strong>{language === 'es' ? 'Sesión lista para ti' : 'Session ready for you'}</strong><small>{language === 'es' ? 'PROGRAMA GENERADO POR TITAN' : 'TITAN GENERATED PROGRAM'}</small></div>
                    <span>{quickSession.minutes} min · {quickSession.exercises.length} {language === 'es' ? 'bloques' : 'blocks'}</span>
                  </div>
                  <div className="quick-session-stats">
                    <span><strong>{quickSession.warmup}</strong> min <small>{language === 'es' ? 'calentamiento' : 'warm-up'}</small></span>
                    <span><strong>{quickSession.exercises.length}</strong> <small>{language === 'es' ? 'ejercicios' : 'exercises'}</small></span>
                    <span><strong>{quickSession.cooldown}</strong> min <small>{language === 'es' ? 'vuelta a la calma' : 'cool-down'}</small></span>
                  </div>
                  <div className="quick-session-timeline">
                    <div><span>01</span><strong>{language === 'es' ? 'Activa tu cuerpo' : 'Activate your body'}</strong><small>{quickSession.warmup} min</small></div>
                    {quickSession.exercises.map((exercise, index) => (
                      <button type="button" className="quick-session-exercise" key={`${exercise.id}-${index}`} onClick={() => setQuickDetail(exercise)}><span>{String(index + 2).padStart(2, '0')}</span><strong>{exercise.name}</strong><small>{quickSession.intensity === 'high' ? '4 × 12' : quickSession.intensity === 'low' ? '2 × 10' : '3 × 10'}</small><b>›</b></button>
                    ))}
                    <div><span>END</span><strong>{language === 'es' ? 'Recupera y respira' : 'Recover and breathe'}</strong><small>{quickSession.cooldown} min</small></div>
                  </div>
                  <button className="quick-regenerate" type="button" onClick={() => createQuickSession(quickSession.minutes, quickSession.focus, quickSession.intensity)}>↻ {language === 'es' ? 'Regenerar sesión' : 'Regenerate session'}</button>
                </>
              ) : (
                <div className="quick-session-empty">
                  <span className="quick-session-orbit">✦</span>
                  <strong>{language === 'es' ? 'Elige una duración' : 'Choose a duration'}</strong>
                  <small>{language === 'es' ? 'TITAN prepara tu siguiente sesión.' : 'TITAN prepares your next session.'}</small>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      {user && <FavoritesDrawer exercises={favoriteExercises} language={language} isOpen={favoritesOpen} schedule={favoriteSchedule} onToggle={() => setFavoritesOpen(open => !open)} onRemove={exerciseId => handleAddFavorite({ id: exerciseId })} onScheduleChange={handleScheduleChange} canUseCalendar={canUseCalendar} />}
      {quickDetail && createPortal((
        <div className="quick-detail-backdrop" onClick={() => setQuickDetail(null)}>
          <article className="quick-detail-modal" onClick={event => event.stopPropagation()}>
            <button className="quick-detail-close" type="button" onClick={() => setQuickDetail(null)} aria-label={language === 'es' ? 'Cerrar detalle' : 'Close details'}>×</button>
            <div className="quick-detail-media">
              {quickDetail.gif || quickDetail.image
                ? <img src={quickDetail.gif || quickDetail.image} alt={quickDetail.name} />
                : <div className="card-placeholder"><span>FITNESS</span><strong>{quickDetail.name}</strong></div>}
            </div>
            <div className="quick-detail-content">
              <span className="catalog-kicker">{quickDetail.category || 'FITNESS'} / TITAN LIBRARY</span>
              <h2>{quickDetail.name}</h2>
              <p>{quickDetail.description || (language === 'es' ? 'Movimiento seleccionado del catálogo TITAN.' : 'Movement selected from the TITAN catalog.')}</p>
              <div className="quick-detail-metrics">
                <span><b>{quickDetail.difficulty || '—'}</b><small>{language === 'es' ? 'nivel' : 'level'}</small></span>
                <span><b>{quickDetail.duration || '—'}{quickDetail.duration ? ' min' : ''}</b><small>{language === 'es' ? 'duración' : 'duration'}</small></span>
                <span><b>{quickDetail.calories || '—'}</b><small>{language === 'es' ? 'kcal' : 'kcal'}</small></span>
              </div>
              <div className="quick-detail-info">
                <div><strong>{language === 'es' ? 'Músculos principales' : 'Primary muscles'}</strong><p>{quickDetail.muscles || quickDetail.category || '—'}</p></div>
                <div><strong>{language === 'es' ? 'Equipamiento' : 'Equipment'}</strong><p>{quickDetail.equipment || (language === 'es' ? 'No requiere equipamiento específico' : 'No specific equipment')}</p></div>
                <div><strong>{language === 'es' ? 'Instrucciones' : 'Instructions'}</strong><p>{Array.isArray(quickDetail.instructions) ? quickDetail.instructions.join(' · ') : quickDetail.instructions || (language === 'es' ? 'Consulta la técnica en la ficha completa.' : 'Check the full card for technique.')}</p></div>
              </div>
            </div>
          </article>
        </div>
      ), document.body)}
    </section>
  )
}

export default Catalog
