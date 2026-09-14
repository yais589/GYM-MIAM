import { useState, useEffect } from 'react'
import { getStats, getWorkouts } from '../services/api'
import '../styles/Statistics.css'

function Statistics({ user, language }) {
  const [stats, setStats] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  const translations = {
    es: {
      title: 'Mis Estadísticas',
      totalWorkouts: 'Entrenamientos Totales',
      totalMinutes: 'Minutos Totales',
      totalCalories: 'Calorías Quemadas',
      recentActivity: 'Actividad Reciente',
      noData: 'Sin datos de entrenamientos'
    },
    en: {
      title: 'My Statistics',
      totalWorkouts: 'Total Workouts',
      totalMinutes: 'Total Minutes',
      totalCalories: 'Calories Burned',
      recentActivity: 'Recent Activity',
      noData: 'No workout data'
    }
  }

  const t = translations[language]

  useEffect(() => {
    if (user) loadStats()
  }, [user])

  const loadStats = async () => {
    try {
      const statsRes = await getStats(user.id)
      const workoutsRes = await getWorkouts(user.id)
      setStats(statsRes.data)
      setWorkouts(workoutsRes.data.slice(-5))
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <div className="stats-empty">Por favor crea un usuario</div>

  return (
    <div className="statistics">
      <h2>📊 {t.title}</h2>
      
      {loading ? (
        <p>Cargando...</p>
      ) : stats ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🏋️</div>
              <div className="stat-content">
                <h3>{stats.totalWorkouts || 0}</h3>
                <p>{t.totalWorkouts}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <h3>{stats.totalMinutes || 0}min</h3>
                <p>{t.totalMinutes}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <h3>{stats.totalCalories || 0}kcal</h3>
                <p>{t.totalCalories}</p>
              </div>
            </div>
          </div>

          <div className="recent-activity">
            <h3>{t.recentActivity}</h3>
            {workouts.length > 0 ? (
              <ul>
                {workouts.map(w => (
                  <li key={w.id}>
                    {new Date(w.date).toLocaleDateString()} - {w.duration}min - {w.calories}kcal
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t.noData}</p>
            )}
          </div>
        </>
      ) : (
        <p>{t.noData}</p>
      )}
    </div>
  )
}

export default Statistics
