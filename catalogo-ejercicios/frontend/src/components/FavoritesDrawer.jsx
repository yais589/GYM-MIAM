import { useState } from 'react'
import '../styles/FavoritesDrawer.css'

function FavoritesDrawer({ exercises = [], items, language, isOpen, schedule, onToggle, onRemove, onScheduleChange, type = 'exercise', canUseCalendar = false }) {
  const isSpanish = language === 'es'
  const savedItems = items || exercises
  const isNutrition = type === 'nutrition'
  const [view, setView] = useState('favorites')
  const [selectedDay, setSelectedDay] = useState('lun')
  const days = isSpanish
    ? [['lun', 'L', 'Lunes'], ['mar', 'M', 'Martes'], ['mie', 'X', 'Miércoles'], ['jue', 'J', 'Jueves'], ['vie', 'V', 'Viernes'], ['sab', 'S', 'Sábado'], ['dom', 'D', 'Domingo']]
    : [['lun', 'M', 'Monday'], ['mar', 'T', 'Tuesday'], ['mie', 'W', 'Wednesday'], ['jue', 'T', 'Thursday'], ['vie', 'F', 'Friday'], ['sab', 'S', 'Saturday'], ['dom', 'S', 'Sunday']]

  const toggleDay = (exerciseId, day) => {
    const currentDays = schedule[String(exerciseId)] || []
    const nextDays = currentDays.includes(day)
      ? currentDays.filter(currentDay => currentDay !== day)
      : [...currentDays, day]
    onScheduleChange(exerciseId, nextDays)
  }

  const scheduledExercises = savedItems.filter(exercise => (schedule[String(exercise.id)] || []).includes(selectedDay))
  const selectedDayLabel = days.find(([value]) => value === selectedDay)?.[2]
  const getImageUrl = (item) => (
    typeof item.image === 'string'
      ? item.image
      : item.image?.image || item.thumbnails?.medium || item.thumbnails?.small || item.gif
  )

  return (
    <>
      <button className={`favorites-tab ${isOpen ? 'drawer-open' : ''}`} type="button" onClick={onToggle} aria-expanded={isOpen}>
        ♥ <span>{isSpanish ? 'Favoritos' : 'Favorites'}</span>
      </button>
      <aside className={`favorites-drawer ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <div className="favorites-drawer-header">
          <div>
            <span className="favorites-kicker">GYMPOWER / PLAN</span>
            <h2>{isNutrition ? (isSpanish ? 'Mi plan nutricional' : 'My nutrition plan') : (isSpanish ? 'Mi entrenamiento' : 'My training')}</h2>
          </div>
          <button className="favorites-close" type="button" onClick={onToggle} aria-label={isSpanish ? 'Cerrar favoritos' : 'Close favorites'}>×</button>
        </div>
        {canUseCalendar && (
          <div className="favorites-tabs" role="tablist">
            <button className={view === 'favorites' ? 'active' : ''} type="button" onClick={() => setView('favorites')} role="tab" aria-selected={view === 'favorites'}>
              ♥ {isSpanish ? 'Favoritos' : 'Favorites'}
            </button>
            <button className={view === 'week' ? 'active' : ''} type="button" onClick={() => setView('week')} role="tab" aria-selected={view === 'week'}>
              ◷ {isSpanish ? 'Plan semanal' : 'Weekly plan'}
            </button>
          </div>
        )}

        {view === 'favorites' && (
          <>
            <div className="favorites-intro">
              <strong>{savedItems.length} {isNutrition ? (isSpanish ? 'alimentos guardados' : 'saved foods') : (isSpanish ? 'ejercicios guardados' : 'saved exercises')}</strong>
              <span>{canUseCalendar
                ? (isNutrition ? (isSpanish ? 'Organiza tus alimentos en los días que quieras planificarlos.' : 'Organize your foods across the days you want to plan them.') : (isSpanish ? 'Organiza cada ejercicio en los días que quieras entrenarlo.' : 'Organize each exercise on the days you want to train it.'))
                : (isSpanish ? 'Mejora tu plan para desbloquear el calendario semanal.' : 'Upgrade your plan to unlock the weekly calendar.')
              }</span>
            </div>
            {savedItems.length ? savedItems.map(exercise => (
              <article className="favorite-row" key={exercise.id}>
                <img src={getImageUrl(exercise)} alt="" />
                <div className="favorite-details">
                  <strong>{exercise.name}</strong>
                  <span>{isNutrition ? `${exercise.energy || 0} kcal` : exercise.category}</span>
                  {canUseCalendar && (
                    <>
                      <small>{isSpanish ? 'Añadir a los días' : 'Add to days'}</small>
                      <div className="favorite-days" aria-label={isSpanish ? 'Días de entrenamiento' : 'Workout days'}>
                        {days.map(([value, label]) => (
                          <label key={value} className="favorite-day">
                            <input type="checkbox" checked={(schedule[String(exercise.id)] || []).includes(value)} onChange={() => toggleDay(exercise.id, value)} />
                            <span title={days.find(day => day[0] === value)?.[2]}>{label}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button className="favorite-remove" type="button" onClick={() => onRemove(exercise.id)} aria-label={isSpanish ? 'Quitar favorito' : 'Remove favorite'}>×</button>
              </article>
            )) : <p className="favorites-empty">{isSpanish ? 'Todavía no tienes favoritos.' : 'You have no favorites yet.'}</p>}
          </>
        )}

        {canUseCalendar && view === 'week' && (
          <section className="weekly-plan" aria-label={isSpanish ? 'Plan semanal' : 'Weekly plan'}>
            <p className="weekly-plan-copy">{isSpanish ? 'Elige un día para ver tu entrenamiento.' : 'Choose a day to see your workout.'}</p>
            <div className="week-selector">
              {days.map(([value, label, name]) => (
                <button key={value} className={selectedDay === value ? 'active' : ''} type="button" onClick={() => setSelectedDay(value)}>
                  <span>{label}</span><small>{name.slice(0, 3)}</small>
                </button>
              ))}
            </div>
            <div className="selected-day-heading">
              <span>{isSpanish ? 'Entrenamiento del día' : 'Day workout'}</span>
              <h3>{selectedDayLabel}</h3>
            </div>
            {scheduledExercises.length ? scheduledExercises.map(exercise => (
              <article className="weekly-exercise" key={exercise.id}>
                <img src={getImageUrl(exercise)} alt="" />
                <div><strong>{exercise.name}</strong><span>{isNutrition ? `${exercise.energy || 0} kcal` : exercise.category}</span></div>
                <button className="favorite-remove" type="button" onClick={() => toggleDay(exercise.id, selectedDay)} aria-label={isSpanish ? 'Quitar del día' : 'Remove from day'}>−</button>
              </article>
            )) : <div className="weekly-empty"><span>◌</span><strong>{isSpanish ? 'Día libre' : 'Rest day'}</strong><p>{isNutrition ? (isSpanish ? 'No hay alimentos asignados a este día.' : 'No foods assigned to this day.') : (isSpanish ? 'No hay ejercicios asignados a este día.' : 'No exercises assigned to this day.')}</p></div>}
          </section>
        )}
      </aside>
    </>
  )
}

export default FavoritesDrawer
