import { useState, useEffect } from 'react'
import axios from 'axios'
import CategoryMenu from './CategoryMenu'
import ExerciseCard from './ExerciseCard'
import FavoritesDrawer from './FavoritesDrawer'
import { getProfileFavorites, saveProfileFavorites } from '../services/profile'
import '../styles/Catalog.css'

function Catalog({ language, user, onRequestAuth }) {
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
    if (!user) {
      setFavorites([])
      return
    }
    getProfileFavorites().then(data => {
      setFavorites(Array.isArray(data) ? data : data.exerciseIds || [])
      setFavoriteSchedule(Array.isArray(data) ? {} : data.schedule || {})
    }).catch(() => {
      setFavorites([])
      setFavoriteSchedule({})
    })
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
      const response = await axios.get('/api/categories')
      setCategories(response.data)
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(t.error)
    }
  }

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/exercises')
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
      const response = await axios.get(`/api/exercises/category/${encodeURIComponent(category)}`)
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
    const nextFavorites = favorites.includes(exercise.id)
      ? favorites.filter(id => id !== exercise.id)
      : [...favorites, exercise.id]
    setFavorites(nextFavorites)
    const nextSchedule = { ...favoriteSchedule }
    if (favorites.includes(exercise.id)) delete nextSchedule[exercise.id]
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

  const favoriteExercises = allExercises.filter(exercise => favorites.includes(exercise.id))

  return (
    <section className="catalog">
      <div className="catalog-container">
        <CategoryMenu 
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          language={language}
          onRequestAuth={() => {
            if (!user) { onRequestAuth(); return false }
            return true
          }}
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
            </div>
            <div className="catalog-summary" aria-label="Resumen del catálogo">
              <span><strong>{categories.length}</strong> {t.categories}</span>
              <span><strong>{exercises.length}</strong> {t.exercises}</span>
            </div>
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
                isFavorite={favorites.includes(exercise.id)}
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
        </div>
      </div>
      {user && <FavoritesDrawer exercises={favoriteExercises} language={language} isOpen={favoritesOpen} schedule={favoriteSchedule} onToggle={() => setFavoritesOpen(open => !open)} onRemove={exerciseId => handleAddFavorite({ id: exerciseId })} onScheduleChange={handleScheduleChange} />}
    </section>
  )
}

export default Catalog
