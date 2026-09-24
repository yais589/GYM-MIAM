import { useState } from 'react'
import '../styles/ExerciseCard.css'

function NutritionCard({ ingredient, language, user, onRequestAuth, onAddFavorite, isFavorite }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  const translations = {
    es: {
      calories: 'Calorías',
      protein: 'Proteína',
      carbs: 'Carbohidratos',
      fat: 'Grasa',
      fiber: 'Fibra',
      sodium: 'Sodio',
      perServing: 'Por 100g',
      brand: 'Marca',
      source: 'Fuente',
      noBrand: 'Sin marca',
      nutrition: 'Información Nutricional'
    },
    en: {
      calories: 'Calories',
      protein: 'Protein',
      carbs: 'Carbs',
      fat: 'Fat',
      fiber: 'Fiber',
      sodium: 'Sodium',
      perServing: 'Per 100g',
      brand: 'Brand',
      source: 'Source',
      noBrand: 'No brand',
      nutrition: 'Nutrition Facts'
    }
  }

  const t = translations[language]

  const imageUrl = typeof ingredient.image === 'string'
    ? ingredient.image
    : ingredient.image?.image || ingredient.thumbnails?.medium || ingredient.thumbnails?.small
  const name = ingredient.name || ingredient.common_name || 'Sin nombre'
  const brand = ingredient.brand || t.noBrand

  const formatValue = (value, unit = 'g') => {
    if (value == null) return '-'
    return `${Math.round(value * 10) / 10}${unit}`
  }

  return (
    <div
      className="exercise-card"
      role="button"
      tabIndex="0"
      onClick={() => user ? setIsDetailsOpen(true) : onRequestAuth()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') user ? setIsDetailsOpen(true) : onRequestAuth()
      }}
    >
      <div className="card-image">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="card-placeholder" role="img" aria-label={name}>
            <span>NUTRITION</span>
            <strong>{name}</strong>
          </div>
        )}
        <button
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            user ? onAddFavorite(ingredient) : onRequestAuth()
          }}
          aria-label={isFavorite
            ? (language === 'es' ? 'Quitar de favoritos' : 'Remove from favorites')
            : (language === 'es' ? 'Añadir a favoritos' : 'Add to favorites')}
          title={isFavorite
            ? (language === 'es' ? 'Quitar de favoritos' : 'Remove from favorites')
            : (language === 'es' ? 'Añadir a favoritos' : 'Add to favorites')}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      </div>
      <div className="card-content">
        <h3>{name}</h3>
        {brand !== t.noBrand && <p className="description">{brand}</p>}
        <div className="card-meta">
          <span className="category">{formatValue(ingredient.energy, ' kcal')}</span>
          <span className="difficulty" style={{ backgroundColor: '#3d8b72' }}>
            {formatValue(ingredient.protein, 'g')} {t.protein.toLowerCase()}
          </span>
        </div>
      </div>

      {isDetailsOpen && (
        <div className="exercise-modal-backdrop" onClick={() => setIsDetailsOpen(false)}>
          <article className="exercise-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              type="button"
              onClick={() => setIsDetailsOpen(false)}
              aria-label={language === 'es' ? 'Cerrar' : 'Close'}
            >
              ×
            </button>
            <div className="modal-media">
              {imageUrl && !imageError ? (
                <img src={imageUrl} alt={name} onError={() => setImageError(true)} />
              ) : (
                <div className="card-placeholder" role="img" aria-label={name}>
                  <span>NUTRITION</span>
                  <strong>{name}</strong>
                </div>
              )}
            </div>
            <div className="modal-content">
              <span className="modal-kicker">{t.nutrition}</span>
              <h2>{name}</h2>
              {brand !== t.noBrand && <p className="modal-description">{brand}</p>}
              <div className="modal-stats">
                <div><span>{t.calories}</span><strong>{formatValue(ingredient.energy, ' kcal')}</strong></div>
                <div><span>{t.protein}</span><strong>{formatValue(ingredient.protein, 'g')}</strong></div>
                <div><span>{t.carbs}</span><strong>{formatValue(ingredient.carbohydrates, 'g')}</strong></div>
                <div><span>{t.fat}</span><strong>{formatValue(ingredient.fat, 'g')}</strong></div>
                <div><span>{t.fiber}</span><strong>{formatValue(ingredient.fiber, 'g')}</strong></div>
                <div><span>{t.sodium}</span><strong>{formatValue(ingredient.sodium, 'mg')}</strong></div>
              </div>
              <div className="modal-sections">
                {ingredient.carbohydrates_sugar != null && (
                  <div>
                    <h3>{language === 'es' ? 'Azúcares' : 'Sugars'}</h3>
                    <p>{formatValue(ingredient.carbohydrates_sugar, 'g')}</p>
                  </div>
                )}
                {ingredient.fat_saturated != null && (
                  <div>
                    <h3>{language === 'es' ? 'Grasa saturada' : 'Saturated fat'}</h3>
                    <p>{formatValue(ingredient.fat_saturated, 'g')}</p>
                  </div>
                )}
                {ingredient.source_name && (
                  <div>
                    <h3>{t.source}</h3>
                    <p>{ingredient.source_name}</p>
                  </div>
                )}
              </div>
            </div>
          </article>
        </div>
      )}
    </div>
  )
}

export default NutritionCard
