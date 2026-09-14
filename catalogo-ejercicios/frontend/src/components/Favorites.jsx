import { useState, useEffect } from 'react'
import { getFavorites, removeFavorite, addFavorite } from '../services/api'
import '../styles/Favorites.css'

function Favorites({ user, language }) {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  const translations = {
    es: { title: 'Mis Favoritos', noFavorites: 'No tienes ejercicios favoritos', remove: 'Remover' },
    en: { title: 'My Favorites', noFavorites: 'No favorite exercises', remove: 'Remove' }
  }

  const t = translations[language]

  useEffect(() => {
    if (user) loadFavorites()
  }, [user])

  const loadFavorites = async () => {
    try {
      const res = await getFavorites(user.id)
      setFavorites(res.data)
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (exerciseId) => {
    try {
      await removeFavorite(user.id, exerciseId)
      setFavorites(favorites.filter(f => f.id !== exerciseId))
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }

  if (!user) return <div className="favorites-empty">{t.noFavorites}</div>

  return (
    <div className="favorites">
      <h2>❤️ {t.title}</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : favorites.length === 0 ? (
        <p className="no-items">{t.noFavorites}</p>
      ) : (
        <div className="favorites-grid">
          {favorites.map(fav => (
            <div key={fav.id} className="favorite-item">
              <img src={fav.image} alt={fav.name} />
              <h3>{fav.name}</h3>
              <p>{fav.category}</p>
              <button onClick={() => handleRemove(fav.id)}>{t.remove}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Favorites
