import { useEffect, useState } from 'react'
import { getUsers, loginUser } from '../services/api'
import '../styles/LoginPage.css'

function LoginPage({ language, onSelect, onCreate }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [password, setPassword] = useState('')
  const isSpanish = language === 'es'

  const labels = isSpanish
    ? {
        kicker: 'GYMPOWER / TITANGYM',
        title: 'Inicia tu sesión',
        subtitle: 'Selecciona tu usuario para continuar',
        loading: 'Cargando usuarios...',
        empty: 'No hay usuarios creados todavía.',
        create: 'Crear nuevo usuario',
        error: 'No se pudieron cargar los usuarios.'
      }
    : {
        kicker: 'GYMPOWER / TITANGYM',
        title: 'Sign in',
        subtitle: 'Select your user to continue',
        loading: 'Loading users...',
        empty: 'There are no users yet.',
        create: 'Create new user',
        error: 'Users could not be loaded.'
      }
  const passwordLabel = isSpanish ? 'Contraseña' : 'Password'
  const enterLabel = isSpanish ? 'Entrar' : 'Sign in'
  const cancelLabel = isSpanish ? 'Cancelar' : 'Cancel'
  const invalidPassword = isSpanish ? 'Contraseña incorrecta.' : 'Incorrect password.'

  useEffect(() => {
    getUsers()
      .then(response => setUsers(response.data))
      .catch(() => setError(labels.error))
      .finally(() => setLoading(false))
  }, [])

  const getValue = (user, ...fields) => fields.map(field => user[field]).find(Boolean)

  const displayValue = (value) => {
    if (value == null) return ''
    if (typeof value !== 'object') return String(value)
    if (typeof value._seconds === 'number') {
      return new Date(value._seconds * 1000).toLocaleDateString('es-ES')
    }
    return String(value.value ?? '')
  }

  const normalizeUser = (user) => ({
    ...user,
    name: displayValue(getValue(user, 'name', 'Name')),
    lastName: displayValue(getValue(user, 'lastName', 'Last Name')),
    age: displayValue(getValue(user, 'age', 'Age')),
    city: displayValue(getValue(user, 'city', 'City', 'country', 'Country')),
    postalCode: displayValue(getValue(user, 'postalCode', 'Postal Code')),
    email: displayValue(getValue(user, 'email', 'Gmail', 'gmail')),
    goal: displayValue(getValue(user, 'goal', 'Goal')) || 'Ganar masa',
    level: displayValue(getValue(user, 'level', 'Level')) || 'Principiante'
  })

  const handleLogin = async (event) => {
    event.preventDefault()
    try {
      setError('')
      const response = await loginUser(selectedUser.id, password)
      onSelect(normalizeUser(response.data))
    } catch {
      setError(invalidPassword)
    }
  }

  return (
    <main className="login-page">
      <div className="login-box">
        <span className="login-kicker">{labels.kicker}</span>
        <h1>{labels.title}</h1>
        <p className="login-subtitle">{labels.subtitle}</p>

        {loading && <p className="login-status">{labels.loading}</p>}
        {error && <p className="login-error" role="alert">{error}</p>}
        {!loading && !error && (
          <div className="login-users">
            {users.length ? users.map(user => (
              <button className="login-user" type="button" key={user.id} onClick={() => { setSelectedUser(user); setPassword(''); setError('') }}>
                <strong>{getValue(user, 'name', 'Name') || 'Usuario'}</strong>
                <span>{getValue(user, 'email', 'Gmail', 'gmail') || 'Sin email'}</span>
              </button>
            )) : <p className="login-status">{labels.empty}</p>}
          </div>
        )}

        {selectedUser && (
          <form className="login-password-form" onSubmit={handleLogin}>
            <p>{getValue(selectedUser, 'name', 'Name') || 'Usuario'}</p>
            <label htmlFor="login-password">{passwordLabel}</label>
            <input id="login-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required autoFocus />
            <button className="login-create" type="submit">{enterLabel}</button>
            <button className="login-cancel" type="button" onClick={() => setSelectedUser(null)}>{cancelLabel}</button>
          </form>
        )}

        <button className="login-create" type="button" onClick={onCreate}>
          + {labels.create}
        </button>
      </div>
    </main>
  )
}

export default LoginPage
