import '../styles/PlanSelector.css'

const PLANS = [
  {
    id: 'free',
    tag: { es: 'Ideal para empezar', en: 'Great for starters' },
    nameEs: 'Gratuito',
    nameEn: 'Free',
    priceEs: '0,00',
    priceEn: '0.00',
    priceExtraEs: '+ 4,99 € nutrición (opcional)',
    priceExtraEn: '+ €4.99 nutrition (optional)',
    description: {
      es: 'Prueba la plataforma sin compromiso y añade nutrición solo si la necesitas.',
      en: 'Try the platform without commitment and add nutrition only if you need it.'
    },
    features: {
      es: [
        { icon: '✓', text: 'Acceso a <strong>Cards</strong> (contenido básico)' },
        { icon: '★', text: 'Lista de <strong>favoritos</strong> para guardar lo que más uses', color: '#38ea67' },
        { icon: '⊕', text: '<strong>Plan de nutrición opcional</strong> por 4,99 €' }
      ],
      en: [
        { icon: '✓', text: 'Access to <strong>Cards</strong> (basic content)' },
        { icon: '★', text: '<strong>Favorites</strong> list to save what you use most', color: '#38ea67' },
        { icon: '⊕', text: '<strong>Optional nutrition plan</strong> for €4.99' }
      ]
    },
    ctaButton: { es: 'Elegir plan gratuito', en: 'Choose free plan' },
    ctaSubtitle: {
      es: '<span style="color: #38ea67">Sin permanencia.</span> Puedes cambiar de plan en cualquier momento.',
      en: '<span style="color: #38ea67">No commitment.</span> You can change plan anytime.'
    }
  },
  {
    id: 'pro',
    tag: { es: 'Compromiso corto', en: 'Short commitment' },
    badge: { es: 'MÁS ELEGIDO', en: 'MOST POPULAR' },
    nameEs: '3 meses',
    nameEn: '3 months',
    priceEs: '5,99',
    priceEn: '5.99',
    priceExtraEs: '+ 3,99 € nutrición (opcional)',
    priceExtraEn: '+ €3.99 nutrition (optional)',
    description: {
      es: 'Perfecto para marcar objetivos a corto plazo y seguir una rutina constante.',
      en: 'Perfect to set short-term goals and keep a steady routine.'
    },
    features: {
      es: [
        { icon: '✓', text: '<strong>Cards</strong> con más contenido y actualizaciones frecuentes' },
        { icon: '★', text: '<strong>Favoritos ilimitados</strong> para organizar tus recursos', color: '#38ea67' },
        { icon: '🏆', text: 'Acceso a <strong>rutinas</strong> de entrenamiento' },
        { icon: '⊕', text: '<strong>Plan de nutrición opcional</strong> por 3,99 €' }
      ],
      en: [
        { icon: '✓', text: '<strong>Cards</strong> with more content and frequent updates' },
        { icon: '★', text: '<strong>Unlimited favorites</strong> to organize your resources', color: '#38ea67' },
        { icon: '🏆', text: 'Access to training <strong>routines</strong>' },
        { icon: '⊕', text: '<strong>Optional nutrition plan</strong> for €3.99' }
      ]
    },
    ctaButton: { es: 'Elegir plan 3 meses', en: 'Choose 3-mo plan' },
    ctaSubtitle: {
      es: '<span style="color: #38ea67">Recomendado</span> si quieres probar rutinas y ver resultados rápidos.',
      en: '<span style="color: #38ea67">Recommended</span> to test routines and see fast results.'
    },
    isHighlight: true
  },
  {
    id: 'elite',
    tag: { es: 'Compromiso anual', en: 'Annual commitment' },
    badge: { es: 'MEJOR VALOR', en: 'BEST VALUE' },
    nameEs: '12 meses',
    nameEn: '12 months',
    priceEs: '11,99',
    priceEn: '11.99',
    priceExtraEs: 'Incluye nutrición + descuentos + agente',
    priceExtraEn: 'Includes nutrition + discounts + AI agent',
    priceExtraHighlight: true,
    description: {
      es: 'Para tomarte en serio tu cambio físico y nutricional, con soporte y ventajas extra.',
      en: 'To take your physical and nutritional change seriously, with extra support and perks.'
    },
    features: {
      es: [
        { icon: '✓', text: 'Acceso completo a <strong>Cards</strong> y contenido avanzado' },
        { icon: '★', text: '<strong>Favoritos</strong> y organización avanzada de tu contenido', color: '#38ea67' },
        { icon: '🏆', text: '<strong>Rutinas</strong> personalizadas y progresivas' },
        { icon: '🍽️', text: '<strong>Nutrición incluida</strong> durante todo el año', color: '#38ea67' },
        { icon: '%', text: '<strong>Descuentos en tienda</strong> de suplementos', color: '#38ea67' },
        { icon: '🤖', text: '<strong>Agente</strong> para soporte y acompañamiento' }
      ],
      en: [
        { icon: '✓', text: 'Full access to <strong>Cards</strong> and advanced content' },
        { icon: '★', text: '<strong>Favorites</strong> & advanced content organization', color: '#38ea67' },
        { icon: '🏆', text: 'Personalized and progressive <strong>routines</strong>' },
        { icon: '🍽️', text: '<strong>Nutrition included</strong> all year long', color: '#38ea67' },
        { icon: '%', text: '<strong>Store discounts</strong> on supplements', color: '#38ea67' },
        { icon: '🤖', text: '<strong>Agent</strong> for support and guidance' }
      ]
    },
    ctaButton: { es: 'Elegir plan 12 meses', en: 'Choose 12-mo plan' },
    ctaSubtitle: {
      es: '<span style="color: #38ea67">Máximo ahorro</span> y todas las funciones incluidas.<br/><span style="color: #ef4444; font-size: 0.85em; margin-top: 4px; display: inline-block;">Renovación anual. Revisa condiciones antes de confirmar.</span>',
      en: '<span style="color: #38ea67">Maximum savings</span> and all features included.<br/><span style="color: #ef4444; font-size: 0.85em; margin-top: 4px; display: inline-block;">Annual renewal. Check terms before confirming.</span>'
    }
  }
]

function PlanSelector({ language, onSelectPlan }) {
  const isEs = language === 'es'

  const handleSelect = (planId) => {
    onSelectPlan(planId)
  }

  return (
    <div className="plan-selector">
      <div className="plan-cards">
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`plan-card ${plan.isHighlight ? 'plan-card--highlight' : ''}`}
          >
            <header className="plan-card-header">
              <div className="plan-card-tag">
                <span className="dot"></span> {plan.tag[language]}
              </div>
              {plan.badge && (
                <div className="plan-card-badge">{plan.badge[language]}</div>
              )}
            </header>

            <div className="plan-card-pricing">
              <div className="pricing-row">
                <h2 className="plan-name">{isEs ? plan.nameEs : plan.nameEn}</h2>
                <div className="plan-price-group">
                  <span className="plan-price-value">{isEs ? plan.priceEs : plan.priceEn}</span>
                  <span className="plan-price-currency"> € / {isEs ? 'mes' : 'mo'}</span>
                </div>
              </div>
              <div className={`plan-price-extra ${plan.priceExtraHighlight ? 'highlight' : ''}`}>
                {isEs ? plan.priceExtraEs : plan.priceExtraEn}
              </div>
            </div>

            <p className="plan-card-description">{plan.description[language]}</p>

            <ul className="plan-features">
              {plan.features[language].map((f, i) => (
                <li key={i}>
                  <span className="feature-icon" style={{ color: f.color || '#6b7280' }}>
                    {f.icon}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: f.text }} />
                </li>
              ))}
            </ul>

            <div className="plan-card-footer">
              <button
                className="plan-cta-circle"
                onClick={() => handleSelect(plan.id)}
              >
                <div className="cta-text">
                  {plan.ctaButton[language].split(' ').map((word, i) => (
                    <span key={i}>{word}<br/></span>
                  ))}
                </div>
              </button>
              <div
                className="plan-cta-subtitle"
                dangerouslySetInnerHTML={{ __html: plan.ctaSubtitle[language] }}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default PlanSelector
