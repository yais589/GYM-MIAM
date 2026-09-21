import '../styles/AuthPrompt.css'

function AuthPrompt({ language, onLogin, onClose }) {
  const isSpanish = language === 'es'
  return (
    <div className="auth-prompt-backdrop" onClick={onClose}>
      <section className="auth-prompt" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true">
        <button className="auth-prompt-close" type="button" onClick={onClose} aria-label={isSpanish ? 'Cerrar' : 'Close'}>×</button>
        <span className="auth-prompt-kicker">TITANGYM / ACCOUNT</span>
        <h2>{isSpanish ? 'Inicia sesión para continuar' : 'Sign in to continue'}</h2>
        <p>{isSpanish ? 'Necesitas una cuenta para ver los detalles, cambiar de categoría y guardar favoritos.' : 'You need an account to view details, change category and save favorites.'}</p>
        <button className="auth-prompt-action" type="button" onClick={onLogin}>{isSpanish ? 'Iniciar sesión' : 'Sign in'}</button>
      </section>
    </div>
  )
}

export default AuthPrompt
