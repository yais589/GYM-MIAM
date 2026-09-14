import { useState } from 'react'
import { createWorkout } from '../services/api'
import '../styles/WorkoutLogger.css'

function WorkoutLogger({ user, exercises, language }) {
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [duration, setDuration] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const translations = {
    es: {
      title: 'Registrar Entrenamiento',
      selectExercise: 'Selecciona un ejercicio',
      duration: 'Duración (minutos)',
      register: 'Registrar',
      success: '¡Entrenamiento registrado!',
      error: 'Error al registrar'
    },
    en: {
      title: 'Log Workout',
      selectExercise: 'Select exercise',
      duration: 'Duration (minutes)',
      register: 'Register',
      success: 'Workout logged!',
      error: 'Error logging workout'
    }
  }

  const t = translations[language]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedExercise || !duration) return

    setLoading(true)
    try {
      const exercise = exercises.find(ex => ex.id === parseInt(selectedExercise))
      await createWorkout(user.id, {
        exerciseId: parseInt(selectedExercise),
        duration: parseInt(duration),
        calories: Math.round((exercise.calories || 5) * parseInt(duration) / 15)
      })
      setMessage(t.success)
      setSelectedExercise(null)
      setDuration('')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(t.error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <div className="workout-empty">Por favor crea un usuario</div>

  return (
    <div className="workout-logger">
      <h2>💪 {t.title}</h2>
      <form onSubmit={handleSubmit} className="workout-form">
        <div className="form-group">
          <label>{t.selectExercise}</label>
          <select 
            value={selectedExercise} 
            onChange={(e) => setSelectedExercise(e.target.value)}
            required
          >
            <option value="">-- {t.selectExercise} --</option>
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.category})
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>{t.duration}</label>
          <input 
            type="number" 
            value={duration} 
            onChange={(e) => setDuration(e.target.value)}
            placeholder="15"
            min="1"
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Registrando...' : t.register}
        </button>
        {message && <p className={`message ${message === t.success ? 'success' : 'error'}`}>{message}</p>}
      </form>
    </div>
  )
}

export default WorkoutLogger
