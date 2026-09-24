import '../styles/Header.css'

function Header({ language, setLanguage, onProfile, onShop }) {
  const slogan = language === 'es'
    ? 'Entrena · Supera · Evoluciona'
    : 'Train · Overcome · Evolve'
  return (
    <header className="header hero-container">
      <div className="overlay" aria-hidden="true" />
      <div className="header-content">
        <div className="language-selector">
          <button
            className={language === 'es' ? 'active' : ''}
            onClick={() => setLanguage('es')}
          >ES</button>
          <button
            className={language === 'en' ? 'active' : ''}
            onClick={() => setLanguage('en')}
          >EN</button>
          {onShop && (
            <button
              className="shop-button"
              type="button"
              onClick={onShop}
              aria-label={language === 'es' ? 'Abrir tienda' : 'Open shop'}
              title={language === 'es' ? 'Tienda' : 'Shop'}
            >
              🛒
            </button>
          )}
          {onProfile && (
            <button
              className="profile-button"
              type="button"
              onClick={onProfile}
              aria-label={language === 'es' ? 'Abrir perfil' : 'Open profile'}
              title={language === 'es' ? 'Perfil' : 'Profile'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="8" r="3.25" />
                <path d="M5.5 20c.45-3.25 2.7-5.1 6.5-5.1s6.05 1.85 6.5 5.1" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <h1 className="hero-title">TITAN GYM</h1>
      <div className="slogan-container">
        <p className="slogan">{slogan}</p>
      </div>
    </header>
  )
}

export default Header
