import { useEffect, useState } from 'react'
import {
  getAdminOverview,
  getAdminUser,
  getAdminUsers,
  setAdminRole,
  setUserDisabled
} from '../services/admin'
import '../styles/AdminPanel.css'

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
        no: 'No'
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
        no: 'No'
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
              <div className="admin-detail-block"><h4>{labels.profile}</h4><p><b>{labels.plan}:</b> {selected.profile?.plan || labels.never}</p><p><b>{labels.city}:</b> {selected.profile?.city || labels.never}</p><p><b>{labels.verified}:</b> {selected.profile?.name || labels.never}</p></div>
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
