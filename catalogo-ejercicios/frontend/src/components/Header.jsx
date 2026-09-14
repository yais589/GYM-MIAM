import '../styles/Header.css'

function Header({ language, setLanguage }) {
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
        </div>
      </div>
      <h1 className="hero-title">GYMPOWER</h1>
      <div className="slogan-container">
        <p className="slogan">{slogan}</p>
      </div>
    </header>
  )
}

export default Header
