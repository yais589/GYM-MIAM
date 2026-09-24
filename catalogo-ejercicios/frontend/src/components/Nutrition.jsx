import { useState, useEffect } from 'react'
import NutritionCard from './NutritionCard'
import FavoritesDrawer from './FavoritesDrawer'
import CategoryMenu from './CategoryMenu'
import { getProfileFavorites, saveProfileFavorites } from '../services/profile'
import '../styles/Catalog.css'

function Nutrition({ language, user, onRequestAuth, canUseCalendar = false }) {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [visibleCount, setVisibleCount] = useState(8)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [exerciseFavorites, setExerciseFavorites] = useState([])
  const [exerciseSchedule, setExerciseSchedule] = useState({})
  const [favoriteSchedule, setFavoriteSchedule] = useState({})
  const [favoritesOpen, setFavoritesOpen] = useState(false)

  const translations = {
    es: {
      title: 'Catálogo de Nutrición',
      kicker: 'NUTRICIÓN',
      loading: 'Cargando...',
      error: 'Error al cargar ingredientes',
      showMore: 'Mostrar más',
      ingredients: 'ingredientes',
      categories: 'Categorías nutricionales',
      all: 'Todos',
      protein: 'Proteína',
      fat: 'Grasas',
      carbohydrates: 'Carbohidratos',
      fiber: 'Fibra',
      sodium: 'Sodio',
      highestCalories: 'Más calorías',
      lowestCalories: 'Menos calorías'
    },
    en: {
      title: 'Nutrition Catalog',
      kicker: 'NUTRITION',
      loading: 'Loading...',
      error: 'Error loading ingredients',
      showMore: 'Show more',
      ingredients: 'ingredients',
      categories: 'Nutrition categories',
      all: 'All',
      protein: 'Protein',
      fat: 'Fat',
      carbohydrates: 'Carbohydrates',
      fiber: 'Fiber',
      sodium: 'Sodium',
      highestCalories: 'Highest calories',
      lowestCalories: 'Lowest calories'
    }
  }

  const t = translations[language]

  useEffect(() => {
    fetchIngredients()
  }, [])

  useEffect(() => {
    if (!user) {
      setFavorites([])
      setFavoriteSchedule({})
      return
    }
    getProfileFavorites().then(data => {
      setFavorites(data.nutritionIds || [])
      setExerciseFavorites(data.exerciseIds || [])
      setExerciseSchedule(data.schedule || {})
      setFavoriteSchedule(data.nutritionSchedule || {})
    }).catch(() => {
      setFavorites([])
      setExerciseFavorites([])
      setExerciseSchedule({})
      setFavoriteSchedule({})
    })
  }, [user])

  const fetchIngredients = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/nutrition')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setIngredients(data)
      setError(null)
    } catch (err) {
      console.error('Error loading ingredients:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="catalog"><div className="loading">{t.loading}</div></div>
  if (error) return <div className="catalog"><div className="error">{t.error}</div></div>

  const categories = [
    { id: 'protein', name: 'protein', labels: { es: t.protein, en: t.protein }, icon: '◈' },
    { id: 'fat', name: 'fat', labels: { es: t.fat, en: t.fat }, icon: '◒' },
    { id: 'carbohydrates', name: 'carbohydrates', labels: { es: t.carbohydrates, en: t.carbohydrates }, icon: '◆' },
    { id: 'fiber', name: 'fiber', labels: { es: t.fiber, en: t.fiber }, icon: '✦' },
    { id: 'sodium', name: 'sodium', labels: { es: t.sodium, en: t.sodium }, icon: '◇' },
    { id: 'highCalories', name: 'highCalories', labels: { es: t.highestCalories, en: t.highestCalories }, icon: '↑' },
    { id: 'lowCalories', name: 'lowCalories', labels: { es: t.lowestCalories, en: t.lowestCalories }, icon: '↓' }
  ]
  const nutrientIngredients = [...ingredients].sort((first, second) => {
    if (!selectedCategory) return 0
    const nutrientKey = selectedCategory === 'highCalories' || selectedCategory === 'lowCalories'
      ? 'energy'
      : selectedCategory
    const firstValue = Number(first[nutrientKey] ?? 0)
    const secondValue = Number(second[nutrientKey] ?? 0)
    return selectedCategory === 'lowCalories'
      ? firstValue - secondValue
      : secondValue - firstValue
  })
  const visibleNutrientIngredients = nutrientIngredients.slice(0, visibleCount)

  const handleAddFavorite = async (ingredient) => {
    const nextFavorites = favorites.includes(ingredient.id)
      ? favorites.filter(id => id !== ingredient.id)
      : [...favorites, ingredient.id]
    const nextSchedule = { ...favoriteSchedule }
    if (favorites.includes(ingredient.id)) delete nextSchedule[ingredient.id]
    setFavorites(nextFavorites)
    setFavoriteSchedule(nextSchedule)
    try {
      await saveProfileFavorites(exerciseFavorites, exerciseSchedule, nextFavorites, nextSchedule)
    } catch {
      setFavorites(favorites)
      setFavoriteSchedule(favoriteSchedule)
    }
  }

  const handleScheduleChange = async (ingredientId, days) => {
    const nextSchedule = { ...favoriteSchedule, [ingredientId]: days }
    setFavoriteSchedule(nextSchedule)
    try {
      await saveProfileFavorites(exerciseFavorites, exerciseSchedule, favorites, nextSchedule)
    } catch {
      setFavoriteSchedule(favoriteSchedule)
    }
  }

  return (
    <div className="catalog">
      <div className="catalog-container">
        <section className="exercises-section">
          <div className="exercises-header">
            <div>
              <span className="catalog-kicker">{t.kicker}</span>
              <h2>{t.title}</h2>
            </div>
            <div className="catalog-summary">
              <span><strong>{ingredients.length}</strong> {t.ingredients}</span>
            </div>
          </div>
          <CategoryMenu
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={(category) => {
              setSelectedCategory(category)
              setVisibleCount(8)
            }}
            language={language}
            requiresAuth={true}
            isAuthenticated={!!user}
            onRequestAuth={onRequestAuth}
          />
          <div className="exercises-grid">
            {visibleNutrientIngredients.map((ingredient) => (
              <NutritionCard
                key={ingredient.id}
                ingredient={ingredient}
                language={language}
                user={user}
                onRequestAuth={onRequestAuth}
                onAddFavorite={handleAddFavorite}
                isFavorite={favorites.includes(ingredient.id)}
              />
            ))}
          </div>
          {user && visibleCount < nutrientIngredients.length && (
            <button className="show-more-btn" onClick={() => setVisibleCount(prev => prev + 12)}>
              {t.showMore}
            </button>
          )}
        </section>
      </div>
      {user && (
        <FavoritesDrawer
          items={ingredients.filter(ingredient => favorites.includes(ingredient.id))}
          language={language}
          type="nutrition"
          isOpen={favoritesOpen}
          schedule={favoriteSchedule}
          onToggle={() => setFavoritesOpen(open => !open)}
          onRemove={ingredientId => handleAddFavorite({ id: ingredientId })}
          onScheduleChange={handleScheduleChange}
          canUseCalendar={canUseCalendar}
        />
      )}
    </div>
  )
}

export default Nutrition
