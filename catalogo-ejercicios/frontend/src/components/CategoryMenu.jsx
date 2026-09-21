import { useState } from 'react'
import '../styles/CategoryMenu.css'

function CategoryMenu({ categories, selectedCategory, onCategoryChange, language, onRequestAuth }) {
  const [isOpen, setIsOpen] = useState(false)

  const translations = {
    es: {
      menu: 'Categorías', all: 'Todos'
    },
    en: {
      menu: 'Categories', all: 'All'
    }
  }

  const t = translations[language]

  const handleCategoryClick = (category) => {
    if (!onRequestAuth()) return
    onCategoryChange(category === selectedCategory ? null : category)
    setIsOpen(false)
  }

  return (
    <div className="category-menu">
      <button 
        className="menu-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        ☰ {t.menu}
      </button>
      
      <div className={`menu-dropdown ${isOpen ? 'open' : ''}`}>
        <button 
          className={`menu-item ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => handleCategoryClick(null)}
        >
          {t.all}
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            className={`menu-item ${String(selectedCategory) === String(category.name) ? 'active' : ''}`}
            onClick={() => handleCategoryClick(category.name)}
          >
            {category.icon} {({ Brazos: 'Arms', Espalda: 'Back', Abdominales: 'Abs', Hombros: 'Shoulders', Pantorrillas: 'Calves', Pecho: 'Chest', Piernas: 'Legs', Cardio: 'Cardio' }[category.name] || category.name)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default CategoryMenu
