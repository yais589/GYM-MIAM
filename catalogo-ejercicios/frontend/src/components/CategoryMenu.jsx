import { useState } from 'react'
import '../styles/CategoryMenu.css'

function CategoryMenu({ categories, selectedCategory, onCategoryChange, language }) {
  const [isOpen, setIsOpen] = useState(false)

  const translations = {
    es: {
      menu: 'Categorías'
    },
    en: {
      menu: 'Categories'
    }
  }

  const t = translations[language]

  const handleCategoryClick = (category) => {
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
          Todos
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            className={`menu-item ${String(selectedCategory) === String(category.name) ? 'active' : ''}`}
            onClick={() => handleCategoryClick(category.name)}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default CategoryMenu
