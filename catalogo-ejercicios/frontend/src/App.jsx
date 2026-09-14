import { useState, useEffect } from 'react'
import Header from './components/Header'
import Catalog from './components/Catalog'
import UserSection from './components/UserSection'
import Welcome from './components/Welcome'
import LoginPage from './components/LoginPage'
import Footer from './components/Footer'
import { createUser, getExercises, updateUser } from './services/api'
import './styles/App.css'

function App() {
  const [language, setLanguage] = useState('es')
  const [user, setUser] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [exercises, setExercises] = useState([])

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
      const response = userData.id && !String(userData.id).match(/^\d{13}$/)
        ? await updateUser(userData.id, userData)
        : await createUser(userData)
      const savedUser = response.data
      setUser(savedUser)
      setIsEditing(false)
      setIsCreating(false)
      localStorage.setItem('user', JSON.stringify(savedUser))
    } catch (error) {
      console.error('Error saving user:', error)
      window.alert(language === 'es' ? 'No se pudo guardar el usuario en Firebase.' : 'The user could not be saved to Firebase.')
    }
  }

  const editUser = () => {
    setIsEditing(true)
  }

  const logout = () => {
    setUser(null)
    setIsEditing(false)
    setIsCreating(false)
    localStorage.removeItem('user')
  }

  const selectUser = (selectedUser) => {
    setUser(selectedUser)
    setIsCreating(false)
    localStorage.setItem('user', JSON.stringify(selectedUser))
  }

  const addUser = () => {
    setUser(null)
    setIsCreating(true)
  }

  if (!user && !isCreating) {
    return (
      <div className="app">
        <LoginPage language={language} onSelect={selectUser} onCreate={addUser} />
      </div>
    )
  }

  if (!user && isCreating) {
    return (
      <div className="app create-user-page">
        <UserSection
          user={null}
          onUserChange={saveUser}
          onCancel={() => setIsCreating(false)}
          language={language}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <Header language={language} setLanguage={setLanguage} />

      <main className="main-content">
        <Catalog language={language} user={user} />
        <section id="profile-section" className="profile-section">
          {user && !isEditing ? (
            <Welcome user={user} language={language} onEdit={editUser} onLogout={logout} />
          ) : isEditing ? (
            <UserSection user={user} onUserChange={saveUser} language={language} />
          ) : null}
        </section>
      </main>

      <Footer language={language} />
    </div>
  )
}

export default App
