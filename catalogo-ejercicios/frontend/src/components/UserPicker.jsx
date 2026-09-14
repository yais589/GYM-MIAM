import '../styles/UserPicker.css'

function UserPicker({ users, language, onSelect, onAdd }) {
  const isSpanish = language === 'es'
  const labels = isSpanish
    ? {
        title: '¿Quién va a entrenar?',
        subtitle: 'Selecciona un usuario para continuar',
        add: 'Añadir otro usuario',
        empty: 'Todavía no hay usuarios guardados'
      }
    : {
        title: 'Who is training?',
        subtitle: 'Select a user to continue',
        add: 'Add another user',
        empty: 'There are no saved users yet'
      }

  return (
    <section className="user-picker" aria-labelledby="user-picker-title">
      <div className="user-picker-box">
        <span className="section-kicker">GYMPOWER / TITANGYM</span>
        <h2 id="user-picker-title">{labels.title}</h2>
        <p>{labels.subtitle}</p>
        <div className="user-list">
          {users.length ? users.map((savedUser) => (
            <button
              className="user-choice"
              type="button"
              key={savedUser.id}
              onClick={() => onSelect(savedUser)}
            >
              <strong>{savedUser.name}</strong>
              <span>{savedUser.email}</span>
            </button>
          )) : <p className="user-picker-empty">{labels.empty}</p>}
        </div>
        <button className="add-user-btn" type="button" onClick={onAdd}>
          + {labels.add}
        </button>
      </div>
    </section>
  )
}

export default UserPicker
