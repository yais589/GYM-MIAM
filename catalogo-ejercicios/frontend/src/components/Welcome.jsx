import '../styles/Welcome.css'

function Welcome({ user, language, onEdit, onLogout, plan, onChangePlan }) {
  const isSpanish = language === 'es'
  const labels = isSpanish
    ? {
        subtitle: 'Tu información personal',
        name: 'Nombre',
        lastName: 'Apellidos',
        age: 'Edad',
        city: 'Ciudad',
        postalCode: 'Código Postal',
        email: 'Email',
        trainingLocation: 'Lugar de entrenamiento',
        nutritionTracking: 'Seguimiento nutricional',
        gender: 'Sexo',
        edit: 'Editar perfil',
        logout: 'Cerrar sesión',
        empty: 'No indicado',
        currentPlan: 'Plan actual',
        changePlan: 'Cambiar plan',
        planFree: 'Gratuito',
        planPro: 'Pro (3 meses)',
        planElite: 'Elite (12 meses)'
      }
    : {
        subtitle: 'Your personal information',
        name: 'Name',
        lastName: 'Last name',
        age: 'Age',
        city: 'City',
        postalCode: 'Postal code',
        email: 'Email',
        trainingLocation: 'Training location',
        nutritionTracking: 'Nutrition tracking',
        gender: 'Gender',
        edit: 'Edit profile',
        logout: 'Log out',
        empty: 'Not specified',
        currentPlan: 'Current plan',
        changePlan: 'Change plan',
        planFree: 'Free',
        planPro: 'Pro (3 months)',
        planElite: 'Elite (12 months)'
      }

  const value = (field) => {
    const rawValue = user?.[field]
    if (!rawValue) return labels.empty
    if (typeof rawValue !== 'object') return rawValue
    if (typeof rawValue._seconds === 'number') {
      return new Date(rawValue._seconds * 1000).toLocaleDateString('es-ES')
    }
    return String(rawValue.value ?? labels.empty)
  }

  return (
    <section className="welcome-section" aria-labelledby="welcome-title">
      <div className="welcome-box">
        <span className="welcome-kicker">GYMPOWER / TITANGYM</span>
        <h2 id="welcome-title">{isSpanish ? `Bienvenido ${value('name')}` : `Welcome ${value('name')}`}</h2>
        <p className="welcome-subtitle">{labels.subtitle}</p>

        <div className="welcome-info">
          <p><strong>{labels.name}:</strong> {value('name')}</p>
          <p><strong>{labels.lastName}:</strong> {value('lastName')}</p>
          <p><strong>{labels.age}:</strong> {value('age')}</p>
          <p><strong>{labels.city}:</strong> {value('city')}</p>
          <p><strong>{labels.postalCode}:</strong> {value('postalCode')}</p>
          <p><strong>{labels.email}:</strong> {value('email')}</p>
          <p><strong>{labels.gender}:</strong> {user?.isMale == null ? labels.empty : user.isMale ? (isSpanish ? 'Hombre' : 'Male') : (isSpanish ? 'Mujer' : 'Female')}</p>
          <p><strong>{labels.trainingLocation}:</strong> {value('trainingLocation')}</p>
          <p><strong>{labels.nutritionTracking}:</strong> {user?.followsDiet ? (isSpanish ? 'Sigo una dieta' : 'I follow a diet') : (isSpanish ? 'No sigo una dieta' : "I don't follow a diet")}</p>
          <p>
            <strong>{labels.currentPlan}:</strong>{' '}
            {plan === 'elite' ? labels.planElite : plan === 'pro' ? labels.planPro : plan === 'free' ? labels.planFree : labels.empty}
          </p>
        </div>

        <div className="welcome-actions">
          <button className="welcome-edit-btn" type="button" onClick={onEdit}>{labels.edit}</button>
          {onChangePlan && (
            <button className="welcome-plan-btn" type="button" onClick={onChangePlan}>{labels.changePlan}</button>
          )}
          <button className="welcome-logout-btn" type="button" onClick={onLogout}>{labels.logout}</button>
        </div>
      </div>
    </section>
  )
}

export default Welcome
