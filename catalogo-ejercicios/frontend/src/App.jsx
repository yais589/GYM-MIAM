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
  const [authUser, setAuthUser] = useState(null)
  const [user, setUser] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showLogin, setShowLogin] = useState(() => isSignInWithEmailLink(auth, window.location.href))
  const [activeTab, setActiveTab] = useState('exercises')
  const [showShop, setShowShop] = useState(false)
  const [showNutritionCheckout, setShowNutritionCheckout] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showPlanSelector, setShowPlanSelector] = useState(false)

  const { plan, perms, changePlan, hasNutrition, unlockNutrition, planReady } = usePlan(authUser)

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

  // Si el usuario se ha logado y aún no tiene un plan, mostrar el selector
  useEffect(() => {
    if (!planReady) return
    if (authUser && plan === null) {
      setShowPlanSelector(true)
    } else if (authUser && plan) {
      setShowPlanSelector(false)
    }
  }, [authUser, plan, planReady])

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

  const logout = () => {
    setUser(null)
    setIsEditing(false)
    setShowProfile(false)
    setShowPlanSelector(false)
    signOut(auth)
  }

  const openProfile = () => {
    setShowShop(false)
    setShowProfile(true)
    setIsEditing(!user?.name)
    window.setTimeout(() => {
      document.getElementById('profile-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  // Cuando el usuario sin sesión clica algo: guardar plan pendiente + pedir login
  const requestAuth = (pendingPlanId) => {
    if (pendingPlanId) setPendingPlan(pendingPlanId)
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
    setShowPlanSelector(false)
    setShowNutritionCheckout(true)
  }

  const closeLogin = () => {
    setShowLogin(false)
    if (window.location.hash === '#login-box') window.history.replaceState({}, document.title, window.location.pathname)
  }

  const legalType = legalPages[window.location.pathname]

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
  if (showPlanSelector && !showLogin) {
    return (
      <div className="app">
        <Header language={language} setLanguage={setLanguage} onProfile={authUser ? openProfile : handleGuestInteraction} onShop={() => authUser && plan ? setShowShop(true) : handleGuestInteraction()} />
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
      <Header language={language} setLanguage={setLanguage} onProfile={authUser ? openProfile : handleGuestInteraction} onShop={() => authUser && plan ? setShowShop(true) : handleGuestInteraction()} />

      {showShop ? (
        <Shop
          language={language}
          user={authUser ? user : null}
          onRequestAuth={handleGuestInteraction}
          onBackToApp={() => setShowShop(false)}
          shopDiscount={perms?.shopDiscount || 0}
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
              {tabs[language].exercises}
            </button>
            <button
              className={`tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`}
              onClick={() => {
                if (!authUser) return handleGuestInteraction()
                setActiveTab('nutrition')
              }}
            >
              {tabs[language].nutrition}
              {authUser && !hasNutrition && (
                <span className="tab-lock">🔒</span>
              )}
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
            {activeTab === 'nutrition' && hasNutrition && (
              <Nutrition
                language={language}
                user={authUser ? user : null}
                onRequestAuth={handleGuestInteraction}
                canUseCalendar={perms?.favoritesCalendar || false}
              />
            )}
            {activeTab === 'nutrition' && !hasNutrition && (
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
                  <UserSection user={user} onUserChange={saveUser} language={language} />
                ) : (
                  <Welcome
                    user={user}
                    language={language}
                    onEdit={() => setIsEditing(true)}
                    onLogout={logout}
                    plan={plan}
                    onChangePlan={() => setShowPlanSelector(true)}
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
        <button className="ai-float-button" onClick={() => setShowAI(true)} title="Asistente IA">
          <span className="ai-icon">🤖</span>
        </button>
      )}

      {!showShop && !showLogin && !showPlanSelector && (!authUser || !perms?.ai) && (
        <button className="ai-float-button ai-float-button--locked" onClick={handleGuestInteraction} title={language === 'es' ? 'Asistente IA (Plan Elite)' : 'AI Assistant (Elite Plan)'}>
          <span className="ai-icon">🤖</span>
          <span className="ai-lock-badge">👑</span>
        </button>
      )}

      {showAI && <AIAssistant language={language} onClose={() => setShowAI(false)} />}

    </div>
  )
}

export default App
