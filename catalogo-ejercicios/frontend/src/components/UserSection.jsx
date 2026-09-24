import { useEffect, useState } from 'react'
import '../styles/UserSection.css'

const emptyForm = {
  name: '',
  lastName: '',
  age: '',
  city: '',
  postalCode: '',
  email: '',
  isMale: null,
  trainingLocation: 'Casa',
  followsDiet: false
}

function UserSection({ user, onUserChange, language, onCancel }) {
  const [formData, setFormData] = useState({ ...emptyForm, ...user })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setFormData({ ...emptyForm, ...user })
  }, [user])

  const isSpanish = language === 'es'
  const labels = isSpanish
    ? {
        subtitle: 'Transforma tu cuerpo. Empieza hoy.',
        name: 'Nombre',
        lastName: 'Apellidos',
        age: 'Edad',
        city: 'Ciudad',
        postalCode: 'Código Postal',
        email: 'Email',
        gender: 'Sexo',
        trainingLocation: 'Lugar de entrenamiento',
        home: 'Casa',
        gym: 'Gimnasio',
        nutritionTracking: 'Seguimiento nutricional',
        followsDiet: '¿Sigo una dieta?',
        namePlaceholder: 'Tu nombre',
        lastNamePlaceholder: 'Tus apellidos',
        agePlaceholder: 'Tu edad',
        cityPlaceholder: 'Tu ciudad',
        postalCodePlaceholder: 'Tu código postal',
        emailPlaceholder: 'Tu correo',
        submit: 'Guardar perfil',
        cancel: 'Volver al inicio de sesión',
        saved: 'Perfil guardado correctamente',
        required: 'Completa el nombre y el email.'
      }
    : {
        subtitle: 'Transform your body. Start today.',
        name: 'Name',
        lastName: 'Last name',
        age: 'Age',
        city: 'City',
        postalCode: 'Postal code',
        email: 'Email',
        gender: 'Gender',
        trainingLocation: 'Training location',
        home: 'Home',
        gym: 'Gym',
        nutritionTracking: 'Nutrition tracking',
        followsDiet: 'Do I follow a diet?',
        namePlaceholder: 'Your name',
        lastNamePlaceholder: 'Your last name',
        agePlaceholder: 'Your age',
        cityPlaceholder: 'Your city',
        postalCodePlaceholder: 'Your postal code',
        emailPlaceholder: 'Your email',
        submit: 'Save profile',
        cancel: 'Back to sign in',
        saved: 'Profile saved successfully',
        required: 'Name and email are required.'
      }

  const updateField = (event) => {
    const { name, value, type, checked } = event.target
    setFormData(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setSaved(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!formData.name || !formData.email) {
      window.alert(labels.required)
      return
    }

    onUserChange({ ...formData })
    setSaved(true)
  }

  return (
    <section className="user-section">
      <div className="titan-form-box">
        <span className="section-kicker">GYMPOWER</span>
        <h2 className="titulo-titangym">TITANGYM</h2>
        <p className="subtitulo-titangym">{labels.subtitle}</p>

        <form className="horizontal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">{labels.name}</label>
            <input id="name" name="name" value={formData.name} onChange={updateField} placeholder={labels.namePlaceholder} required />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">{labels.lastName}</label>
            <input id="lastName" name="lastName" value={formData.lastName} onChange={updateField} placeholder={labels.lastNamePlaceholder} />
          </div>
          <div className="form-group">
            <label htmlFor="age">{labels.age}</label>
            <input id="age" name="age" type="number" min="10" max="100" value={formData.age} onChange={updateField} placeholder={labels.agePlaceholder} />
          </div>
          <div className="form-group">
            <label htmlFor="city">{labels.city}</label>
            <input id="city" name="city" value={formData.city} onChange={updateField} placeholder={labels.cityPlaceholder} />
          </div>
          <div className="form-group">
            <label htmlFor="postalCode">{labels.postalCode}</label>
            <input id="postalCode" name="postalCode" maxLength="10" value={formData.postalCode} onChange={updateField} placeholder={labels.postalCodePlaceholder} />
          </div>
          <div className="form-group">
            <label htmlFor="email">{labels.email}</label>
            <input id="email" name="email" type="email" value={formData.email} onChange={updateField} placeholder={labels.emailPlaceholder} required />
          </div>
          <div className="form-group gender-field">
            <span>{labels.gender}</span>
            <label><input type="radio" name="isMale" checked={formData.isMale === true} onChange={() => setFormData(current => ({ ...current, isMale: true }))} /> {isSpanish ? 'Hombre' : 'Male'}</label>
            <label><input type="radio" name="isMale" checked={formData.isMale === false} onChange={() => setFormData(current => ({ ...current, isMale: false }))} /> {isSpanish ? 'Mujer' : 'Female'}</label>
          </div>
          <div className="form-group">
            <label htmlFor="trainingLocation">{labels.trainingLocation}</label>
            <select id="trainingLocation" name="trainingLocation" value={formData.trainingLocation} onChange={updateField}>
              <option value="Casa">{labels.home}</option>
              <option value="Gimnasio">{labels.gym}</option>
            </select>
          </div>
          <label className="preference-checkbox">
            <input type="checkbox" name="followsDiet" checked={Boolean(formData.followsDiet)} onChange={updateField} />
            <span>{labels.nutritionTracking}: {labels.followsDiet}</span>
          </label>
          <button className="titan-submit" type="submit">{labels.submit}</button>
          {onCancel && <button className="titan-cancel" type="button" onClick={onCancel}>{labels.cancel}</button>}
          {saved && <p className="save-message" role="status">{labels.saved}</p>}
        </form>
      </div>
    </section>
  )
}

export default UserSection
