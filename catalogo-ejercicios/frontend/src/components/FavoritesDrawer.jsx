import { useState } from 'react'
import '../styles/FavoritesDrawer.css'

function FavoritesDrawer({ exercises, language, isOpen, schedule, onToggle, onRemove, onScheduleChange }) {
  const isSpanish = language === 'es'
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

  const scheduledExercises = exercises.filter(exercise => (schedule[String(exercise.id)] || []).includes(selectedDay))
  const selectedDayLabel = days.find(([value]) => value === selectedDay)?.[2]

  return (
    <>
      <button className={`favorites-tab ${isOpen ? 'drawer-open' : ''}`} type="button" onClick={onToggle} aria-expanded={isOpen}>
        ♥ <span>{isSpanish ? 'Favoritos' : 'Favorites'}</span>
      </button>
      <aside className={`favorites-drawer ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <div className="favorites-drawer-header">
          <div>
            <span className="favorites-kicker">GYMPOWER / PLAN</span>
            <h2>{isSpanish ? 'Mi entrenamiento' : 'My training'}</h2>
          </div>
          <button className="favorites-close" type="button" onClick={onToggle} aria-label={isSpanish ? 'Cerrar favoritos' : 'Close favorites'}>×</button>
        </div>
        <div className="favorites-tabs" role="tablist">
          <button className={view === 'favorites' ? 'active' : ''} type="button" onClick={() => setView('favorites')} role="tab" aria-selected={view === 'favorites'}>
            ♥ {isSpanish ? 'Favoritos' : 'Favorites'}
          </button>
          <button className={view === 'week' ? 'active' : ''} type="button" onClick={() => setView('week')} role="tab" aria-selected={view === 'week'}>
            ◷ {isSpanish ? 'Plan semanal' : 'Weekly plan'}
          </button>
        </div>

        {view === 'favorites' && (
          <>
            <div className="favorites-intro">
              <strong>{exercises.length} {isSpanish ? 'ejercicios guardados' : 'saved exercises'}</strong>
              <span>{isSpanish ? 'Organiza cada ejercicio en los días que quieras entrenarlo.' : 'Organize each exercise on the days you want to train it.'}</span>
            </div>
            {exercises.length ? exercises.map(exercise => (
              <article className="favorite-row" key={exercise.id}>
                <img src={exercise.image || exercise.gif} alt="" />
                <div className="favorite-details">
                  <strong>{exercise.name}</strong>
                  <span>{exercise.category}</span>
                  <small>{isSpanish ? 'Añadir a los días' : 'Add to days'}</small>
                  <div className="favorite-days" aria-label={isSpanish ? 'Días de entrenamiento' : 'Workout days'}>
                    {days.map(([value, label]) => (
                      <label key={value} className="favorite-day">
                        <input type="checkbox" checked={(schedule[String(exercise.id)] || []).includes(value)} onChange={() => toggleDay(exercise.id, value)} />
                        <span title={days.find(day => day[0] === value)?.[2]}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button className="favorite-remove" type="button" onClick={() => onRemove(exercise.id)} aria-label={isSpanish ? 'Quitar favorito' : 'Remove favorite'}>×</button>
              </article>
            )) : <p className="favorites-empty">{isSpanish ? 'Todavía no tienes favoritos.' : 'You have no favorites yet.'}</p>}
          </>
        )}

        {view === 'week' && (
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
                <img src={exercise.image || exercise.gif} alt="" />
                <div><strong>{exercise.name}</strong><span>{exercise.category}</span></div>
                <button className="favorite-remove" type="button" onClick={() => toggleDay(exercise.id, selectedDay)} aria-label={isSpanish ? 'Quitar del día' : 'Remove from day'}>−</button>
              </article>
            )) : <div className="weekly-empty"><span>◌</span><strong>{isSpanish ? 'Día libre' : 'Rest day'}</strong><p>{isSpanish ? 'No hay ejercicios asignados a este día.' : 'No exercises assigned to this day.'}</p></div>}
          </section>
        )}
      </aside>
    </>
  )
}

export default FavoritesDrawer
