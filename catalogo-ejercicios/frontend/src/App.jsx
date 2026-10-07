import { useState, useEffect } from 'react'
import { isSignInWithEmailLink, onAuthStateChanged, signOut } from 'firebase/auth'
import Header from './components/Header'
import Catalog from './components/Catalog'
import Nutrition from './components/Nutrition'
import Shop from './components/Shop'
import AIAssistant from './components/AIAssistant'
import UserSection from './components/UserSection'
import Welcome from './components/Welcome'
import LoginPage from './components/LoginPage'
import Footer from './components/Footer'
import CookieBanner from './components/CookieBanner'
import LegalPage from './components/LegalPage'
import PlanSelector from './components/PlanSelector'
import NutritionUpsell from './components/NutritionUpsell'
import Checkout from './components/Checkout'
import { auth } from './services/firebase'
import { getProfile, saveProfile } from './services/profile'
import { NUTRITION_PRICE, NUTRITION_PRO_PRICE, usePlan, setPendingPlan } from './services/usePlan'
import './styles/App.css'

function App() {
  const [language, setLanguage] = useState('es')
  const [theme, setTheme] = useState(() => localStorage.getItem('titan-theme') || 'light')
  const [authUser, setAuthUser] = useState(null)
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showLogin, setShowLogin] = useState(() => isSignInWithEmailLink(auth, window.location.href))
  const [activeTab, setActiveTab] = useState('exercises')
  const [showShop, setShowShop] = useState(false)
  const [showNutritionCheckout, setShowNutritionCheckout] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showPlanSelector, setShowPlanSelector] = useState(false)

  const adminUser = Boolean(isAdmin)
  const { plan, perms, changePlan, hasNutrition, unlockNutrition, planReady } = usePlan(authUser, adminUser)

  const legalPages = {
    '/politica-privacidad': 'privacy',
    '/politica-cookies': 'cookies',
    '/aviso-legal': 'legal'
  }

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthUser(firebaseUser)
      if (firebaseUser) setShowLogin(false)
      if (!firebaseUser) {
        setUser(null)
        setIsAdmin(false)
        return
      }
      try {
        const profile = await getProfile()
        setUser(profile)
        setIsAdmin(Boolean(profile?.isAdmin))
      } catch {
        setUser({ email: firebaseUser.email })
        setIsAdmin(false)
      }
    })
  }, [])

  // Si el usuario se ha logado y aún no tiene un plan, mostrar el selector
  useEffect(() => {
    if (!planReady) return
    if (adminUser) {
      setShowPlanSelector(false)
      return
    }
    if (authUser && plan === null) {
      setShowPlanSelector(true)
    } else if (authUser && plan) {
      setShowPlanSelector(false)
    }
  }, [authUser, plan, planReady, adminUser])

  const saveUser = async (userData) => {
    try {
      const savedUser = await saveProfile(userData)
      setUser(savedUser)
      setIsEditing(false)
      setShowProfile(true)
    } catch (error) {
      console.error('Error saving user:', error)
      window.alert(language === 'es'
        ? `No se pudo guardar el perfil: ${error.message}`
        : `The profile could not be saved: ${error.message}`)
    }
  }

  const logout = () => {
    setUser(null)
    setIsAdmin(false)
    setIsEditing(false)
    setShowProfile(false)
    setShowPlanSelector(false)
    signOut(auth)
  }

  const openProfile = () => {
    setShowShop(false)
    setShowProfile(true)
    setIsEditing(adminUser ? false : !user?.name)
    window.setTimeout(() => {
      document.getElementById('profile-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  // Cuando el usuario sin sesión clica algo: guardar plan pendiente + pedir login
  const requestAuth = (pendingPlanId) => {
    if (pendingPlanId) setPendingPlan(pendingPlanId)
    setShowShop(false)
    setShowLogin(true)
    window.location.hash = 'login-box'
    window.setTimeout(() => {
      document.getElementById('login-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  // Cuando no hay sesión y clica cualquier cosa → ir a planes primero
  const handleGuestInteraction = () => {
    setShowPlanSelector(true)
  }

  // El usuario elige un plan en el selector
  const handleSelectPlan = (planId) => {
    changePlan(planId)
    if (!authUser) {
      // No logado: guardar plan pendiente y pedir login
      requestAuth(planId)
    } else {
      setShowPlanSelector(false)
    }
  }

  const openNutritionCheckout = () => {
    if (adminUser) {
      unlockNutrition()
      setShowPlanSelector(false)
      setShowNutritionCheckout(false)
      setActiveTab('nutrition')
      return
    }
    setShowPlanSelector(false)
    setShowNutritionCheckout(true)
  }

  const closeLogin = () => {
    setShowLogin(false)
    if (window.location.hash === '#login-box') window.history.replaceState({}, document.title, window.location.pathname)
  }

  const legalType = legalPages[window.location.pathname]

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('titan-theme', theme)
  }, [theme])

  if (legalType) {
    return <LegalPage type={legalType} language={language} />
  }

  const tabs = {
    es: { exercises: 'Ejercicios', nutrition: 'Nutrición' },
    en: { exercises: 'Exercises', nutrition: 'Nutrition' }
  }

  // ──────────────────────────────────────────────
  // RENDER: selector de planes (sin sesión o recién logado sin plan)
  // ──────────────────────────────────────────────
  if (showPlanSelector && !showLogin && !adminUser && !showShop) {
    return (
      <div className="app">
        <Header language={language} setLanguage={setLanguage} theme={theme} onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} onProfile={authUser ? openProfile : handleGuestInteraction} onShop={() => setShowShop(true)} />
        <main className="main-content">
          <PlanSelector
            language={language}
            onSelectPlan={handleSelectPlan}
          />
        </main>
        <Footer language={language} />
        <CookieBanner language={language} />
      </div>
    )
  }

  return (
    <div className="app">
      <Header language={language} setLanguage={setLanguage} theme={theme} onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} onProfile={authUser ? openProfile : handleGuestInteraction} onShop={() => setShowShop(true)} />

      {showShop ? (
        <Shop
          language={language}
          user={authUser ? user : null}
          onRequestAuth={() => requestAuth()}
          onBackToApp={() => setShowShop(false)}
          shopDiscount={perms?.shopDiscount || 0}
          isAdmin={adminUser}
        />
      ) : showNutritionCheckout ? (
        <Checkout
          cart={[{
            id: 'nutrition-module',
            name: language === 'es' ? 'Módulo de Nutrición' : 'Nutrition Module',
            price: plan === 'pro' ? NUTRITION_PRO_PRICE : NUTRITION_PRICE,
            quantity: 1,
            stock: 1
          }]}
          language={language}
          shippingEnabled={false}
          isAdmin={adminUser}
          onBack={() => setShowNutritionCheckout(false)}
          onComplete={() => {
            unlockNutrition()
            setShowNutritionCheckout(false)
            setActiveTab('nutrition')
          }}
        />
      ) : showLogin ? (
        <LoginPage language={language} onSignedIn={setAuthUser} onBack={closeLogin} />
      ) : (
        <>
          <nav className="tab-navigation">
            <button
              className={`tab-btn ${activeTab === 'exercises' ? 'active' : ''}`}
              onClick={() => authUser ? setActiveTab('exercises') : handleGuestInteraction()}
            >
              <span className="tab-icon" aria-hidden="true">◈</span>
              <span className="tab-copy">
                <small>{language === 'es' ? 'MÓDULO 01 / RENDIMIENTO' : 'MODULE 01 / PERFORMANCE'}</small>
                <strong>{tabs[language].exercises}</strong>
                <em>{language === 'es' ? 'Entrena con precisión' : 'Train with precision'}</em>
              </span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`}
              onClick={() => {
                if (!authUser) return handleGuestInteraction()
                setActiveTab('nutrition')
              }}
            >
              <span className="tab-icon" aria-hidden="true">✦</span>
              <span className="tab-copy">
                <small>{language === 'es' ? 'MÓDULO 02 / NUTRICIÓN' : 'MODULE 02 / NUTRITION'}</small>
                <strong>{tabs[language].nutrition} {authUser && !hasNutrition && !adminUser && <span className="tab-lock">🔒</span>}</strong>
                <em>{language === 'es' ? 'Optimiza tu energía' : 'Optimize your energy'}</em>
              </span>
            </button>
          </nav>
          <main className="main-content">
            {activeTab === 'exercises' && (
              <Catalog
                language={language}
                user={authUser ? user : null}
                onRequestAuth={handleGuestInteraction}
                canUseCalendar={perms?.favoritesCalendar || false}
              />
            )}
            {activeTab === 'nutrition' && (hasNutrition || adminUser) && (
              <Nutrition
                language={language}
                user={authUser ? user : null}
                onRequestAuth={handleGuestInteraction}
                canUseCalendar={perms?.favoritesCalendar || false}
              />
            )}
            {activeTab === 'nutrition' && !hasNutrition && !adminUser && (
              <NutritionUpsell
                language={language}
                plan={plan}
                onUnlock={openNutritionCheckout}
                onBack={() => setActiveTab('exercises')}
              />
            )}
            {authUser && showProfile && (
              <section id="profile-section" className="profile-section">
                {isEditing ? (
                  <UserSection user={user} onUserChange={saveUser} language={language} isAdmin={adminUser} />
                ) : (
                  <Welcome
                    user={user}
                    language={language}
                    onEdit={() => setIsEditing(true)}
                    onLogout={logout}
                    plan={plan}
                    onChangePlan={adminUser ? undefined : () => setShowPlanSelector(true)}
                  />
                )}
              </section>
            )}
          </main>
        </>
      )}

      <Footer language={language} />
      <CookieBanner language={language} />

      {!showShop && !showLogin && !showPlanSelector && authUser && perms?.ai && (
        <button className="ai-float-button" onClick={() => setShowAI(true)} title={language === 'es' ? 'Asistente IA TITAN' : 'TITAN AI Assistant'}>
          <span className="ai-icon">🤖</span>
          <span className="ai-ping" />
        </button>
      )}

      {showAI && <AIAssistant language={language} onClose={() => setShowAI(false)} perms={perms} hasNutrition={hasNutrition} />}

    </div>
  )
}

export default App
