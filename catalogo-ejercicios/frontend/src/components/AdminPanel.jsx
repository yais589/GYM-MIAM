import { useEffect, useState } from 'react'
import {
  getAdminOverview,
  getAdminUser,
  getAdminUsers,
  setAdminRole,
  setUserDisabled
} from '../services/admin'
import '../styles/AdminPanel.css'
import AdminAI from './AdminAI'

function AdminPanel({ language, onClose }) {
  const isSpanish = language === 'es'
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [nextPageToken, setNextPageToken] = useState('')
  const [showAdminAI, setShowAdminAI] = useState(true)

  const labels = isSpanish
    ? {
        title: 'Panel de administración',
        subtitle: 'Supervisa usuarios, acceso y actividad de TITAN GYM.',
        close: 'Volver al perfil',
        users: 'Usuarios registrados',
        active: 'Usuarios activos',
        disabled: 'Cuentas bloqueadas',
        admins: 'Administradores',
        profiles: 'Perfiles completos',
        search: 'Buscar por nombre, email o UID...',
        details: 'Detalle del usuario',
        noSelection: 'Selecciona un usuario para consultar su información.',
        account: 'Cuenta',
        profile: 'Perfil',
        uid: 'UID',
        verified: 'Email verificado',
        plan: 'Plan',
        city: 'Ciudad',
        lastAccess: 'Último acceso',
        never: 'Nunca',
        block: 'Bloquear cuenta',
        unblock: 'Activar cuenta',
        grant: 'Dar permisos de administrador',
        revoke: 'Revocar permisos de administrador',
        next: 'Cargar más',
        loading: 'Cargando...',
        retry: 'Reintentar',
        yes: 'Sí',
        no: 'No',
        activityTitle: 'Actividad de usuarios',
        recentActivity: 'Usuarios activos en los últimos 30 días',
        habitsTitle: 'Hábitos de entrenamiento',
        gym: 'Gimnasio',
        home: 'Casa',
        other: 'Sin especificar',
        plansTitle: 'Distribución de planes',
        savedTitle: 'Ejercicios guardados',
        savedExercises: 'Ejercicios guardados',
        savedUsers: 'Usuarios con favoritos',
        dataNote: 'Sesiones registradas de forma persistente en Firestore.',
        sessions: 'Sesiones',
        minutes: 'Minutos',
        nutritionSaved: 'Alimentos favoritos',
        cart: 'Productos en carritos',
        storeTitle: 'Tienda',
        orders: 'Pedidos',
        unitsSold: 'Unidades vendidas',
        revenue: 'Ingresos registrados',
        exerciseCount: 'Ejercicios',
        nutritionCount: 'Nutrición',
        cartCount: 'Carrito',
        workouts: 'Sesiones de entrenamiento'
        ,generatedPlans: 'Planes generados'
        ,trainingPlans: 'Planes de entrenamiento'
        ,nutritionPlans: 'Planes de nutrición'
        ,popular: 'Más guardados por usuarios'
        ,ai: 'IA administrativa'
      }
    : {
        title: 'Administration panel',
        subtitle: 'Monitor users, access and TITAN GYM activity.',
        close: 'Back to profile',
        users: 'Registered users',
        active: 'Active users',
        disabled: 'Disabled accounts',
        admins: 'Administrators',
        profiles: 'Complete profiles',
        search: 'Search by name, email or UID...',
        details: 'User details',
        noSelection: 'Select a user to inspect their information.',
        account: 'Account',
        profile: 'Profile',
        uid: 'UID',
        verified: 'Verified email',
        plan: 'Plan',
        city: 'City',
        lastAccess: 'Last access',
        never: 'Never',
        block: 'Disable account',
        unblock: 'Enable account',
        grant: 'Grant administrator access',
        revoke: 'Revoke administrator access',
        next: 'Load more',
        loading: 'Loading...',
        retry: 'Retry',
        yes: 'Yes',
        no: 'No',
        activityTitle: 'User activity',
        recentActivity: 'Active users in the last 30 days',
        habitsTitle: 'Training habits',
        gym: 'Gym',
        home: 'Home',
        other: 'Not specified',
        plansTitle: 'Plan distribution',
        savedTitle: 'Saved exercises',
        savedExercises: 'Saved exercises',
        savedUsers: 'Users with favorites',
        dataNote: 'Workout sessions are persisted in Firestore.',
        sessions: 'Sessions',
        minutes: 'Minutes',
        nutritionSaved: 'Saved nutrition',
        cart: 'Products in carts',
        storeTitle: 'Store',
        orders: 'Orders',
        unitsSold: 'Units sold',
        revenue: 'Recorded revenue',
        exerciseCount: 'Exercises',
        nutritionCount: 'Nutrition',
        cartCount: 'Cart',
        workouts: 'Training sessions'
        ,generatedPlans: 'Generated plans'
        ,trainingPlans: 'Training plans'
        ,nutritionPlans: 'Nutrition plans'
        ,popular: 'Most saved by users'
        ,ai: 'Admin AI'
      }

  const formatPlan = (value) => {
    const planNames = isSpanish
      ? { free: 'Gratuito', pro: '3 meses', elite: '12 meses', admin: 'Administrador' }
      : { free: 'Free', pro: '3 months', elite: '12 months', admin: 'Administrator' }
    return planNames[String(value || '').toLowerCase()] || (value || (isSpanish ? 'Sin plan' : 'No plan'))
  }

  const load = async (reset = true) => {
    setLoading(true)
    setError('')
    try {
      const [summary, page] = await Promise.all([
        reset ? getAdminOverview() : Promise.resolve(overview),
        getAdminUsers({ search: reset ? search : '', pageToken: reset ? '' : nextPageToken })
      ])
      if (summary) setOverview(summary)
      setUsers(current => reset ? page.users : [...current, ...page.users])
      setNextPageToken(page.nextPageToken || '')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const selectUser = async (user) => {
    setActionError('')
    try {
      setSelected(await getAdminUser(user.uid))
    } catch (detailError) {
      setActionError(detailError.message)
    }
  }

  const updateStatus = async () => {
    if (!selected) return
    try {
      const result = await setUserDisabled(selected.uid, !selected.disabled)
      setSelected(current => ({ ...current, disabled: result.disabled }))
      setUsers(current => current.map(user => user.uid === selected.uid ? { ...user, disabled: result.disabled } : user))
      setOverview(current => current && {
        ...current,
        activeUsers: current.activeUsers + (result.disabled ? -1 : 1),
        disabledUsers: current.disabledUsers + (result.disabled ? 1 : -1)
      })
      window.alert(result.message)
    } catch (actionErrorValue) {
      setActionError(actionErrorValue.message)
    }
  }

  const updateRole = async () => {
    if (!selected) return
    try {
      const result = await setAdminRole(selected.uid, !selected.admin?.enabled)
      setSelected(current => ({ ...current, admin: { enabled: result.enabled } }))
      setOverview(current => current && { ...current, admins: current.admins + (result.enabled ? 1 : -1) })
      window.alert(result.message)
    } catch (actionErrorValue) {
      setActionError(actionErrorValue.message)
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="admin-panel-title">
      <div className="admin-panel-header">
        <div>
          <span className="admin-kicker">TITAN GYM / CONTROL CENTER</span>
          <h2 id="admin-panel-title">{labels.title}</h2>
          <p>{labels.subtitle}</p>
        </div>
        <button type="button" className="admin-close" onClick={onClose}>{labels.close}</button>
      </div>
      <div className="admin-ai-toggle-row">
        <button type="button" className="admin-ai-toggle" onClick={() => setShowAdminAI(current => !current)}>{showAdminAI ? '−' : '+'} {labels.ai}</button>
      </div>
      {showAdminAI && <AdminAI language={language} />}

      {error && <div className="admin-alert">{error} <button type="button" onClick={() => load()}>{labels.retry}</button></div>}

      {overview && (
        <div className="admin-metrics">
          {[
            [labels.users, overview.totalUsers, 'users'],
            [labels.active, overview.activeUsers, 'active'],
            [labels.disabled, overview.disabledUsers, 'disabled'],
            [labels.admins, overview.admins, 'admins'],
            [labels.profiles, overview.profiles, 'profiles']
          ].map(([label, value, tone]) => <article className={`admin-metric ${tone}`} key={tone}><strong>{value}</strong><span>{label}</span></article>)}
        </div>
      )}

      {overview && (
        <div className="admin-insights">
          <article className="admin-insight-card">
            <h3>{labels.activityTitle}</h3>
            <div className="admin-big-stat">{overview.activity?.recentActivityUsers || 0}</div>
            <p>{labels.recentActivity}</p>
            <small>{labels.dataNote}</small>
            <div className="admin-activity-stats">
              <span><b>{overview.activity?.totalWorkouts || 0}</b>{labels.sessions}</span>
              <span><b>{overview.activity?.totalMinutes || 0}</b>{labels.minutes}</span>
            </div>
          </article>
          <article className="admin-insight-card">
            <h3>{labels.habitsTitle}</h3>
            {[
              [labels.gym, overview.habits?.locations?.gym || 0],
              [labels.home, overview.habits?.locations?.home || 0],
              [labels.other, overview.habits?.locations?.other || 0]
            ].map(([label, value]) => <div className="admin-bar-row" key={label}><span>{label}</span><b>{value}</b><i><em style={{ width: `${overview.totalUsers ? Math.min(100, value / overview.totalUsers * 100) : 0}%` }} /></i></div>)}
          </article>
          <article className="admin-insight-card">
            <h3>{labels.storeTitle}</h3>
            <div className="admin-saved-grid">
              <div><strong>{overview.store?.orders || 0}</strong><span>{labels.orders}</span></div>
              <div><strong>{overview.store?.unitsSold || 0}</strong><span>{labels.unitsSold}</span></div>
            </div>
            <p className="admin-store-revenue">{labels.revenue}: €{Number(overview.store?.revenue || 0).toFixed(2)}</p>
          </article>
          <article className="admin-insight-card">
            <h3>{labels.savedTitle}</h3>
            <div className="admin-saved-grid">
              <div><strong>{overview.saved?.exerciseCount || 0}</strong><span>{labels.savedExercises}</span></div>
              <div><strong>{overview.saved?.usersWithSavedExercises || 0}</strong><span>{labels.savedUsers}</span></div>
            </div>
          </article>
          <article className="admin-insight-card">
            <h3>{labels.plansTitle}</h3>
            {Object.entries(overview.habits?.plans || {}).map(([plan, count]) => <div className="admin-plan-row" key={plan}><span>{formatPlan(plan)}</span><strong>{count}</strong></div>)}
            <div className="admin-plan-row"><span>{labels.generatedPlans}</span><strong>{overview.habits?.generatedPlans?.total || 0}</strong></div>
            <div className="admin-plan-row"><span>{labels.trainingPlans}</span><strong>{overview.habits?.generatedPlans?.training || 0}</strong></div>
            <div className="admin-plan-row"><span>{labels.nutritionPlans}</span><strong>{overview.habits?.generatedPlans?.nutrition || 0}</strong></div>
          </article>
          <article className="admin-insight-card admin-popular-card">
            <h3>{labels.popular}</h3>
            {(overview.saved?.topExercises || []).map(item => <div className="admin-plan-row" key={item.id}><span>Ejercicio #{item.id}</span><strong>{item.users}</strong></div>)}
            {!overview.saved?.topExercises?.length && <p>{labels.never}</p>}
          </article>
        </div>
      )}

      <div className="admin-workspace">
        <div className="admin-users">
          <div className="admin-users-toolbar">
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder={labels.search} />
            <button type="button" onClick={() => load()}>{isSpanish ? 'Buscar' : 'Search'}</button>
          </div>
          {loading && !users.length ? <p className="admin-empty">{labels.loading}</p> : (
            <div className="admin-user-list">
              {users.map(user => (
                <button type="button" className={`admin-user-row ${selected?.uid === user.uid ? 'selected' : ''}`} key={user.uid} onClick={() => selectUser(user)}>
                  <span className="admin-avatar">{(user.displayName || user.email || '?').charAt(0).toUpperCase()}</span>
                  <span className="admin-user-copy"><strong>{user.displayName || user.email || user.uid}</strong><small>{user.email || user.uid}</small></span>
                  <span className={`admin-status ${user.disabled ? 'off' : 'on'}`}>{user.disabled ? '●' : '●'}</span>
                </button>
              ))}
              {!users.length && !loading && <p className="admin-empty">{isSpanish ? 'No se encontraron usuarios.' : 'No users found.'}</p>}
            </div>
          )}
          {nextPageToken && <button type="button" className="admin-load-more" onClick={() => load(false)}>{labels.next}</button>}
        </div>

        <aside className="admin-details">
          <h3>{labels.details}</h3>
          {!selected ? <p className="admin-empty">{labels.noSelection}</p> : (
            <>
              <div className="admin-detail-identity"><span className="admin-avatar large">{(selected.displayName || selected.email || '?').charAt(0).toUpperCase()}</span><div><strong>{selected.displayName || selected.email || selected.uid}</strong><small>{selected.email || labels.never}</small></div></div>
              <div className="admin-detail-block"><h4>{labels.account}</h4><p><b>{labels.uid}:</b> <code>{selected.uid}</code></p><p><b>{labels.verified}:</b> {selected.emailVerified ? labels.yes : labels.no}</p><p><b>{labels.lastAccess}:</b> {selected.lastSignInAt ? new Date(selected.lastSignInAt).toLocaleString() : labels.never}</p></div>
              <div className="admin-detail-block"><h4>{labels.profile}</h4><p><b>{labels.plan}:</b> {formatPlan(selected.profile?.plan)}</p><p><b>{labels.city}:</b> {selected.profile?.city || labels.never}</p><p><b>{labels.exerciseCount}:</b> {selected.profile?.favoriteExerciseCount || 0}</p><p><b>{labels.nutritionCount}:</b> {selected.profile?.favoriteNutritionCount || 0}</p><p><b>{labels.cartCount}:</b> {selected.profile?.cartItemCount || 0}</p><p><b>{labels.workouts}:</b> {selected.profile?.workoutCount || 0}</p><p><b>{labels.generatedPlans}:</b> {selected.profile?.generatedPlanCount || 0}</p><p><b>{labels.trainingPlans}:</b> {selected.profile?.generatedTrainingPlanCount || 0}</p><p><b>{labels.nutritionPlans}:</b> {selected.profile?.generatedNutritionPlanCount || 0}</p></div>
              {actionError && <div className="admin-alert small">{actionError}</div>}
              <div className="admin-actions"><button type="button" onClick={updateStatus}>{selected.disabled ? labels.unblock : labels.block}</button><button type="button" className="secondary" onClick={updateRole}>{selected.admin?.enabled ? labels.revoke : labels.grant}</button></div>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}

export default AdminPanel
