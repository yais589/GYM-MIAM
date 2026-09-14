import '../styles/Footer.css'

function Footer({ language }) {
  const translations = {
    es: {
      about: 'Acerca de',
      contact: 'Contacto',
      privacy: 'Privacidad',
      terms: 'Términos',
      copyright: '© 2024 Catálogo de Ejercicios. Todos los derechos reservados.',
      description: 'Tu plataforma de confianza para descubrir y practicar ejercicios.'
    },
    en: {
      about: 'About',
      contact: 'Contact',
      privacy: 'Privacy',
      terms: 'Terms',
      copyright: '© 2024 Exercise Catalog. All rights reserved.',
      description: 'Your trusted platform to discover and practice exercises.'
    }
  }

  const t = translations[language]

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>Catálogo de Ejercicios</h3>
          <p>{t.description}</p>
        </div>
        
        <div className="footer-section">
          <h4>Navegación</h4>
          <ul>
            <li><a href="#about">{t.about}</a></li>
            <li><a href="#contact">{t.contact}</a></li>
            <li><a href="#privacy">{t.privacy}</a></li>
            <li><a href="#terms">{t.terms}</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Redes Sociales</h4>
          <ul>
            <li><a href="#facebook">Facebook</a></li>
            <li><a href="#twitter">Twitter</a></li>
            <li><a href="#instagram">Instagram</a></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>{t.copyright}</p>
      </div>
    </footer>
  )
}

export default Footer
