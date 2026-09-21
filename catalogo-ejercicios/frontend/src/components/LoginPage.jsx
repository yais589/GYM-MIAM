import { useEffect, useState } from 'react'
import { GoogleAuthProvider, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, signInWithPopup } from 'firebase/auth'
import { auth } from '../services/firebase'
import '../styles/LoginPage.css'

function LoginPage({ language, onSignedIn, onBack }) {
  const [email, setEmail] = useState(localStorage.getItem('emailForSignIn') || '')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [completingEmailLink, setCompletingEmailLink] = useState(false)
  const isSpanish = language === 'es'
  const text = isSpanish
    ? { title: 'Inicia sesión', subtitle: 'Te enviaremos un enlace seguro a tu correo electrónico.', email: 'Correo electrónico', send: 'Enviar enlace', complete: 'Completar inicio de sesión', google: 'Continuar con Google', or: 'o', sent: 'Revisa tu correo y pulsa el enlace para entrar.', enterEmail: 'Escribe el correo con el que solicitaste el enlace.', error: 'No se pudo iniciar sesión.', configError: 'El inicio de sesión por enlace no está habilitado en Firebase.', domainError: 'Este dominio no está autorizado en Firebase.', networkError: 'No se pudo conectar con Firebase.', quotaError: 'Se ha alcanzado el límite de envíos de Firebase. Espera un rato antes de volver a intentarlo.' }
    : { title: 'Sign in', subtitle: 'We will send a secure sign-in link to your email.', email: 'Email address', send: 'Send sign-in link', complete: 'Complete sign-in', google: 'Continue with Google', or: 'or', sent: 'Check your email and open the link to continue.', enterEmail: 'Enter the email address used to request the link.', error: 'Could not sign in.', configError: 'Email link sign-in is not enabled in Firebase.', domainError: 'This domain is not authorized in Firebase.', networkError: 'Could not connect to Firebase.', quotaError: 'Firebase email quota has been reached. Please wait before trying again.' }

  const getAuthErrorMessage = (error) => {
    console.error('Firebase sign-in error:', error.code, error.message)
    if (error.code === 'auth/operation-not-allowed') return text.configError
    if (error.code === 'auth/unauthorized-continue-uri' || error.code === 'auth/invalid-continue-uri') return text.domainError
    if (error.code === 'auth/network-request-failed') return text.networkError
    if (error.code === 'auth/quota-exceeded') return text.quotaError
    return `${text.error} (${error.code || 'unknown-error'})`
  }

  useEffect(() => {
    const completeSignIn = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) return
      const storedEmail = localStorage.getItem('emailForSignIn')
      if (!storedEmail) {
        setCompletingEmailLink(true)
        return
      }
      try {
        setLoading(true)
        const result = await signInWithEmailLink(auth, storedEmail, window.location.href)
        localStorage.removeItem('emailForSignIn')
        window.history.replaceState({}, document.title, window.location.pathname)
        onSignedIn(result.user)
      } catch (error) {
        setError(getAuthErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }
    completeSignIn()
  }, [onSignedIn, text.email, text.error])

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setLoading(true)
      setError('')
      if (completingEmailLink) {
        const result = await signInWithEmailLink(auth, email, window.location.href)
        localStorage.removeItem('emailForSignIn')
        window.history.replaceState({}, document.title, window.location.pathname)
        onSignedIn(result.user)
        return
      }
      await sendSignInLinkToEmail(auth, email, {
        url: window.location.origin,
        handleCodeInApp: true
      })
      localStorage.setItem('emailForSignIn', email)
      setSent(true)
    } catch (error) {
      setError(getAuthErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError('')
      const result = await signInWithPopup(auth, new GoogleAuthProvider())
      onSignedIn(result.user)
    } catch (error) {
      setError(getAuthErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page" id="login-box">
      <div className="login-box"  >
        <span className="login-kicker">TITANGYM</span>
        <h1>{text.title}</h1>
        <p className="login-subtitle">{text.subtitle}</p>
        {onBack && <button className="login-back" type="button" onClick={onBack}>{isSpanish ? 'Volver al catálogo' : 'Back to catalog'}</button>}
        {sent ? <p className="login-status">{text.sent}</p> : (
          <>
            {!completingEmailLink && <>
              <button className="google-login" type="button" onClick={handleGoogleSignIn} disabled={loading}>
                {loading ? '...' : text.google}
              </button>
              <div className="login-divider"><span>{text.or}</span></div>
            </>}
            {completingEmailLink && <p className="login-status">{text.enterEmail}</p>}
            <form className="email-login-form" onSubmit={handleSubmit}>
              <label htmlFor="sign-in-email">{text.email}</label>
              <input id="sign-in-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" />
              <button className="login-create" type="submit" disabled={loading}>{loading ? '...' : completingEmailLink ? text.complete : text.send}</button>
            </form>
          </>
        )}
        {error && <p className="login-error" role="alert">{error}</p>}
      </div>
    </main>
  )
}

export default LoginPage
