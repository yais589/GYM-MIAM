import { useState } from 'react'
import '../styles/ExerciseCard.css'

function ExerciseCard({ exercise, language, user, onAddFavorite, isFavorite }) {
  const cardSources = [...new Set([exercise.image, exercise.gif].filter(Boolean))]
  const modalSources = [...new Set([exercise.gif, exercise.image].filter(Boolean))]
  const [cardImageIndex, setCardImageIndex] = useState(0)
  const [modalImageIndex, setModalImageIndex] = useState(0)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const translations = {
    es: {
      difficulty: 'Dificultad',
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado',
      addFavorite: 'Agregar a favoritos',
      removeFavorite: 'Remover de favoritos'
    },
    en: {
      difficulty: 'Difficulty',
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      addFavorite: 'Add to favorites',
      removeFavorite: 'Remove from favorites'
    }
  }

  const t = translations[language]

  const getDifficultyLabel = (difficulty) => {
    return t[difficulty] || difficulty
  }

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'beginner': return '#4CAF50'
      case 'intermediate': return '#FFC107'
      case 'advanced': return '#FF5722'
      default: return '#2196F3'
    }
  }

  const noData = language === 'es' ? 'No indicado' : 'Not specified'
  const listValue = (value) => Array.isArray(value) && value.length ? value.join(', ') : value || noData
  const detailValue = (value) => Array.isArray(value) ? listValue(value) : value || noData
  const cardImageSource = cardSources[cardImageIndex]
  const modalImageSource = modalSources[modalImageIndex]
  const handleCardImageError = () => {
    setCardImageIndex((currentIndex) => currentIndex + 1)
  }
  const handleModalImageError = () => {
    setModalImageIndex((currentIndex) => currentIndex + 1)
  }
  const cardImageAvailable = Boolean(cardImageSource)
  const modalImageAvailable = Boolean(modalImageSource)

  return (
    <div
      className="exercise-card"
      role="button"
      tabIndex="0"
      onClick={() => setIsDetailsOpen(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') setIsDetailsOpen(true)
      }}
    >
      <div className="card-image">
        {cardImageAvailable ? (
          <img
            src={cardImageSource}
            alt={exercise.name}
            loading="lazy"
            decoding="async"
            onError={handleCardImageError}
          />
        ) : (
          <div className="card-placeholder" role="img" aria-label={exercise.name}>
            <span>FITNESS</span>
            <strong>{exercise.name}</strong>
          </div>
        )}
        {user && (
          <button 
            className={`favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              onAddFavorite(exercise.id)
            }}
            title={isFavorite ? t.removeFavorite : t.addFavorite}
          >
            ❤️
          </button>
        )}
      </div>
      <div className="card-content">
        <h3>{exercise.name}</h3>
        <p className="description">{exercise.description}</p>
        <div className="card-meta">
          <span className="category">{exercise.category}</span>
          <span 
            className="difficulty"
            style={{ backgroundColor: getDifficultyColor(exercise.difficulty) }}
          >
            {getDifficultyLabel(exercise.difficulty)}
          </span>
        </div>
        {exercise.duration && <p className="duration">⏱️ {exercise.duration}min</p>}
      </div>

      {isDetailsOpen && (
        <div className="exercise-modal-backdrop" onClick={() => setIsDetailsOpen(false)}>
          <article className="exercise-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="modal-close"
              type="button"
              onClick={() => setIsDetailsOpen(false)}
              aria-label={language === 'es' ? 'Cerrar detalles' : 'Close details'}
            >
              ×
            </button>
            <div className="modal-media">
              {modalImageAvailable ? (
                <img src={modalImageSource} alt={exercise.name} onError={handleModalImageError} />
              ) : (
                <div className="card-placeholder" role="img" aria-label={exercise.name}>
                  <span>FITNESS</span>
                  <strong>{exercise.name}</strong>
                </div>
              )}
            </div>
            <div className="modal-content">
              <span className="modal-kicker">{exercise.category}</span>
              <h2>{exercise.name}</h2>
              <p className="modal-description">{exercise.description || noData}</p>
              <div className="modal-stats">
                <div><span>{t.difficulty}</span><strong>{getDifficultyLabel(exercise.difficulty)}</strong></div>
                <div><span>{language === 'es' ? 'Duración' : 'Duration'}</span><strong>{exercise.duration ? `${exercise.duration} min` : noData}</strong></div>
                <div><span>{language === 'es' ? 'Calorías' : 'Calories'}</span><strong>{exercise.calories || noData}</strong></div>
                <div><span>{language === 'es' ? 'Repeticiones' : 'Reps'}</span><strong>{exercise.reps || exercise.repetitions || noData}</strong></div>
                <div><span>{language === 'es' ? 'Series' : 'Sets'}</span><strong>{exercise.sets || noData}</strong></div>
                <div><span>{language === 'es' ? 'Peso' : 'Weight'}</span><strong>{exercise.weight || noData}</strong></div>
              </div>
              <div className="modal-sections">
                <div><h3>{language === 'es' ? 'Equipamiento' : 'Equipment'}</h3><p>{detailValue(exercise.equipment)}</p></div>
                <div><h3>{language === 'es' ? 'Músculos principales' : 'Primary muscles'}</h3><p>{detailValue(exercise.muscles)}</p></div>
                <div><h3>{language === 'es' ? 'Músculos secundarios' : 'Secondary muscles'}</h3><p>{detailValue(exercise.muscles_secondary)}</p></div>
                <div><h3>{language === 'es' ? 'Instrucciones' : 'Instructions'}</h3><p>{detailValue(exercise.instructions)}</p></div>
              </div>
            </div>
          </article>
        </div>
      )}
    </div>
  )
}

export default ExerciseCard
