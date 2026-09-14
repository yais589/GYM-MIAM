import { useState, useEffect } from 'react'
import axios from 'axios'
import CategoryMenu from './CategoryMenu'
import ExerciseCard from './ExerciseCard'
import '../styles/Catalog.css'

function Catalog({ language, user }) {
  const [exercises, setExercises] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [visibleCount, setVisibleCount] = useState(4)

  const translations = {
    es: {
      title: 'Catálogo de Ejercicios',
      allCategories: 'Todas las Categorías',
      loading: 'Cargando...',
      error: 'Error al cargar los ejercicios',
      showMore: 'Mostrar más'
    },
    en: {
      title: 'Exercise Catalog',
      allCategories: 'All Categories',
      loading: 'Loading...',
      error: 'Error loading exercises',
      showMore: 'Show more'
    }
  }

  const t = translations[language]

  const sortByMedia = (exerciseList) => [...exerciseList].sort((first, second) => {
    const firstScore = (first.gif ? 2 : 0) + (first.image ? 1 : 0)
    const secondScore = (second.gif ? 2 : 0) + (second.image ? 1 : 0)
    return secondScore - firstScore
  })

  useEffect(() => {
    fetchCategories()
    fetchExercises()
  }, [])

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

  const handleAddFavorite = (exerciseId) => {
    if (favorites.includes(exerciseId)) {
      setFavorites(favorites.filter(id => id !== exerciseId))
    } else {
      setFavorites([...favorites, exerciseId])
    }
  }

  return (
    <section className="catalog">
      <div className="catalog-container">
        <CategoryMenu 
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          language={language}
        />
        
        <div className="exercises-section">
          <div className="exercises-header">
            <div>
              <span className="catalog-kicker">GYMPOWER / TRAINING LIBRARY</span>
              <h2>
                {selectedCategory
                  ? categories.find(category => String(category.name) === String(selectedCategory))?.name || selectedCategory
                  : t.allCategories}
              </h2>
            </div>
            <div className="catalog-summary" aria-label="Resumen del catálogo">
              <span><strong>{categories.length}</strong> categorías</span>
              <span><strong>{selectedCategory ? exercises.length : exercises.length}</strong> ejercicios</span>
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
              />
            ))}
          </div>

          {selectedCategory && visibleCount < exercises.length && (
            <button className="show-more-btn" onClick={handleShowMore}>
              {t.showMore}
            </button>
          )}

          {!loading && exercises.length === 0 && (
            <p className="no-exercises">No hay ejercicios disponibles</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default Catalog
