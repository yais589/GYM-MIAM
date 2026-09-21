import { useState, useEffect } from 'react'
import { isSignInWithEmailLink, onAuthStateChanged, signOut } from 'firebase/auth'
import Header from './components/Header'
import Catalog from './components/Catalog'
import UserSection from './components/UserSection'
import Welcome from './components/Welcome'
import LoginPage from './components/LoginPage'
import Footer from './components/Footer'
import CookieBanner from './components/CookieBanner'
import LegalPage from './components/LegalPage'
import { getExercises } from './services/api'
import { auth } from './services/firebase'
import { getProfile, saveProfile } from './services/profile'
import './styles/App.css'

function App() {
  const [language, setLanguage] = useState('es')
  const [authUser, setAuthUser] = useState(null)
  const [user, setUser] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showLogin, setShowLogin] = useState(() => isSignInWithEmailLink(auth, window.location.href))
  const [exercises, setExercises] = useState([])
  const legalPages = {
    '/politica-privacidad': 'privacy',
    '/politica-cookies': 'cookies',
    '/aviso-legal': 'legal'
  }

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthUser(firebaseUser)
      if (firebaseUser) setShowLogin(false)
      if (!firebaseUser) return setUser(null)
      try { setUser(await getProfile()) } catch { setUser({ email: firebaseUser.email }) }
    })
  }, [])

  useEffect(() => {
    loadExercises()
  }, [])

  const loadExercises = async () => {
    try {
      const res = await getExercises()
      setExercises(res.data)
    } catch (error) {
      console.error('Error loading exercises:', error)
    }
  }

  const saveUser = async (userData) => {
    try {
      const savedUser = await saveProfile(userData)
      setUser(savedUser)
      setIsEditing(false)
      setShowProfile(true)
    } catch (error) {
      console.error('Error saving user:', error)
      window.alert(language === 'es' ? 'No se pudo guardar el usuario en Firebase.' : 'The user could not be saved to Firebase.')
    }
  }

  const editUser = () => {
    setShowProfile(true)
    setIsEditing(!user?.name)
    window.setTimeout(() => {
      document.getElementById('profile-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const logout = () => {
    setUser(null)
    setIsEditing(false)
    setShowProfile(false)
    signOut(auth)
  }

  const openProfile = () => {
    setShowProfile(true)
    setIsEditing(!user?.name)
    window.setTimeout(() => {
      document.getElementById('profile-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const requestAuth = () => {
    setShowLogin(true)
    window.location.hash = 'login-box'
    window.setTimeout(() => {
      document.getElementById('login-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const closeLogin = () => {
    setShowLogin(false)
    if (window.location.hash === '#login-box') window.history.replaceState({}, document.title, window.location.pathname)
  }

  const legalType = legalPages[window.location.pathname]

  if (legalType) {
    return <LegalPage type={legalType} language={language} />
  }

  return (
    <div className="app">
      <Header language={language} setLanguage={setLanguage} onProfile={authUser ? openProfile : requestAuth} />

      {showLogin ? (
        <LoginPage language={language} onSignedIn={setAuthUser} onBack={closeLogin} />
      ) : (
        <main className="main-content">
          <Catalog language={language} user={authUser ? user : null} onRequestAuth={requestAuth} />
          {authUser && showProfile && (
            <section id="profile-section" className="profile-section">
              {isEditing ? (
                <UserSection user={user} onUserChange={saveUser} language={language} />
              ) : (
                <Welcome user={user} language={language} onEdit={() => setIsEditing(true)} onLogout={logout} />
              )}
            </section>
          )}
        </main>
      )}

      <Footer language={language} />
      <CookieBanner language={language} />
    </div>
  )
}

export default App
