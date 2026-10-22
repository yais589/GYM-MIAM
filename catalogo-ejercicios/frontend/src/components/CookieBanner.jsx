import { useEffect, useState } from 'react'
import '../styles/CookieBanner.css'

const COOKIE_CONSENT_KEY = 'TitanGymCookiesV3'

function CookieBanner({ language }) {
  const [visible, setVisible] = useState(false)
  const isSpanish = language === 'es'

  useEffect(() => {
    try {
      setVisible(!window.localStorage.getItem(COOKIE_CONSENT_KEY))
    } catch {
      setVisible(true)
    }
  }, [])

  const choose = (value) => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, value)
    } catch {
      // La decisión sigue siendo válida durante esta sesión si el navegador bloquea el almacenamiento.
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <aside className="cookie-banner" role="dialog" aria-label={isSpanish ? 'Preferencias de cookies' : 'Cookie preferences'}>
      <div>
        <span className="cookie-kicker">TITANGYM / PRIVACIDAD</span>
        <h2>{isSpanish ? 'Tu privacidad importa' : 'Your privacy matters'}</h2>
        <p>{isSpanish
          ? 'Usamos cookies para mejorar la experiencia, analizar el uso de la web y optimizar nuestros servicios.'
          : 'We use cookies to improve your experience, understand site usage and optimize our services.'}</p>
      </div>
      <div className="cookie-actions">
        <button type="button" className="cookie-reject" onClick={() => choose('rejected')}>
          {isSpanish ? 'Rechazar' : 'Reject'}
        </button>
        <button type="button" className="cookie-accept" onClick={() => choose('accepted')}>
          {isSpanish ? 'Aceptar' : 'Accept'}
        </button>
      </div>
    </aside>
  )
}

export default CookieBanner
