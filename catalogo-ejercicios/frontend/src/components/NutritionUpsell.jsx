import { NUTRITION_PRICE, NUTRITION_PRO_PRICE } from '../services/usePlan'
import '../styles/PlanSelector.css'

function NutritionUpsell({ language, plan, onUnlock, onBack }) {
  const isEs = language === 'es'
  const isPro = plan === 'pro'
  const price = isPro ? NUTRITION_PRO_PRICE : NUTRITION_PRICE
  const originalPrice = NUTRITION_PRICE

  return (
    <div className="plan-selector nutrition-upsell">
      <div className="plan-selector-hero">
        <span className="plan-kicker">GYMPOWER / NUTRICIÓN</span>
        <h1>{isEs ? 'Desbloquea Nutrición' : 'Unlock Nutrition'}</h1>
        <p>{isEs
          ? 'Accede al catálogo de alimentos, favoritos nutricionales y planificación semanal.'
          : 'Access the food catalog, nutrition favorites and weekly planning.'
        }</p>
      </div>

      <div className="plan-cards" style={{ maxWidth: 440, margin: '0 auto', gridTemplateColumns: '1fr' }}>
        <article className="plan-card" style={{ '--plan-color': '#d88b51', '--plan-accent': '#f7e5d7' }}>
          <div className="plan-icon">🥗</div>
          <h2 className="plan-name">{isEs ? 'Módulo de Nutrición' : 'Nutrition Module'}</h2>
          <div className="plan-price">
            {isPro && (
              <span style={{ textDecoration: 'line-through', fontSize: '1rem', color: '#9ca3af', marginRight: 8 }}>
                {originalPrice.toFixed(2)}€
              </span>
            )}
            {price.toFixed(2)}€
          </div>
          <div className="plan-permanence">
            {isPro
              ? (isEs ? 'Precio rebajado por ser Plan Pro' : 'Discounted price as a Pro member')
              : (isEs ? 'Pago único · acceso permanente' : 'One-time payment · lifetime access')
            }
          </div>
          <ul className="plan-features">
            {(isEs
              ? ['✅ Catálogo completo de alimentos', '✅ Favoritos nutricionales', '✅ Plan semanal de comidas', '✅ Datos calóricos y macros']
              : ['✅ Full food catalog', '✅ Nutrition favorites', '✅ Weekly meal plan', '✅ Calories and macros']
            ).map((f, i) => <li key={i}>{f}</li>)}
          </ul>
          <button className="plan-cta" onClick={onUnlock}>
            {isEs ? `Comprar por ${price.toFixed(2)}€` : `Buy for €${price.toFixed(2)}`}
          </button>
        </article>
      </div>

      <p className="plan-note">
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
        >
          {isEs ? '← Volver a ejercicios' : '← Back to exercises'}
        </button>
      </p>
    </div>
  )
}

export default NutritionUpsell
