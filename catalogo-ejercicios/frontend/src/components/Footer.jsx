import '../styles/Footer.css'

function Footer({ language }) {
  const translations = {
    es: {
      description: 'Construye tu mejor versión. Entrena fuerte, vive mejor.',
      quickLinks: 'Enlaces rápidos', schedule: 'Horario', contact: 'Contacto',
      services: 'Servicios', coaches: 'Entrenadores', rates: 'Tarifas',
      weekdays: 'Lunes - Viernes: 06:00 - 23:00', saturday: 'Sábados: 08:00 - 20:00',
      sunday: 'Domingos: 09:00 - 14:00', privacy: 'Política de privacidad',
      cookies: 'Política de cookies', legal: 'Aviso legal',
      copyright: '© 2026 TitanGYM. Todos los derechos reservados.'
    },
    en: {
      description: 'Build your best version. Train hard, live better.',
      quickLinks: 'Quick links', schedule: 'Schedule', contact: 'Contact',
      services: 'Services', coaches: 'Coaches', rates: 'Rates',
      weekdays: 'Monday - Friday: 06:00 - 23:00', saturday: 'Saturday: 08:00 - 20:00',
      sunday: 'Sunday: 09:00 - 14:00', privacy: 'Privacy policy',
      cookies: 'Cookie policy', legal: 'Legal notice',
      copyright: '© 2026 TitanGYM. All rights reserved.'
    }
  }

  const t = translations[language]

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <section className="footer-brand">
          <h2>Titan<span>GYM</span></h2>
          <p>{t.description}</p>
          <div className="social-links" aria-label="Redes sociales">
            <a href="#instagram">Instagram</a>
            <a href="#facebook">Facebook</a>
            <a href="#tiktok">TikTok</a>
            <a href="#youtube">YouTube</a>
          </div>
        </section>

        <section>
          <h3>{t.quickLinks}</h3>
          <ul>
            <li><a href="#inicio">Inicio</a></li>
            <li><a href="#servicios">{t.services}</a></li>
            <li><a href="#entrenadores">{t.coaches}</a></li>
            <li><a href="#tarifas">{t.rates}</a></li>
            <li><a href="#contacto">{t.contact}</a></li>
          </ul>
        </section>

        <section>
          <h3>{t.schedule}</h3>
          <p>{t.weekdays}</p><p>{t.saturday}</p><p>{t.sunday}</p>
        </section>

        <section id="contacto">
          <h3>{t.contact}</h3>
          <address>
            <p>📍 Calle Titanes, 24, Madrid</p>
            <p>📞 <a href="tel:+34900123456">900 123 456</a></p>
            <p>✉️ <a href="mailto:info@titangym.com">info@titangym.com</a></p>
          </address>
        </section>
      </div>
      
      <div className="footer-bottom">
        <p>{t.copyright}</p>
        <nav aria-label="Enlaces legales">
          <a href="/politica-privacidad">{t.privacy}</a>
          <a href="/politica-cookies">{t.cookies}</a>
          <a href="/aviso-legal">{t.legal}</a>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
