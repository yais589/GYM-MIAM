import { useEffect, useState } from 'react'
import { askAdminAI, getAdminAIInteractions } from '../services/adminAI'

function AdminAI({ language }) {
  const isSpanish = language === 'es'
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: isSpanish
      ? 'Soy TITAN Admin. Puedo consultar usuarios, planes, favoritos, entrenamientos, pedidos y métricas, además de ejecutar acciones administrativas autorizadas.'
      : 'I am TITAN Admin. I can inspect users, plans, favorites, workouts, orders and metrics, and execute authorized administrative actions.'
  }])
  const [input, setInput] = useState('')
  const [pendingConfirmation, setPendingConfirmation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const loadHistory = async () => {
    try {
      const history = await getAdminAIInteractions()
      if (history.length) {
        setMessages(history.flatMap(item => [
          { role: 'user', content: item.message },
          { role: 'assistant', content: item.reply || '', data: item.data }
        ]))
      }
    } catch (historyError) {
      setError(historyError.message)
    } finally {
      setHistoryLoaded(true)
    }
  }

  useEffect(() => {
    if (!historyLoaded) loadHistory()
  }, [historyLoaded])

  const send = async (message = input, confirmationToken = '') => {
    const text = message.trim()
    if (!text || loading) return
    setLoading(true)
    setError('')
    setMessages(current => [...current, { role: 'user', content: text }])
    setInput('')
    try {
      const result = await askAdminAI(text, confirmationToken)
      setMessages(current => [...current, {
        role: 'assistant',
        content: result.reply || (isSpanish ? 'Acción completada.' : 'Action completed.'),
        data: result.data
      }])
      setPendingConfirmation(result.requiresConfirmation ? result.confirmationToken : null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const labels = isSpanish
    ? { title: 'TITAN Admin IA', placeholder: 'Pregunta o indica una acción administrativa...', send: 'Enviar', confirm: 'Confirmar acción', cancel: 'Cancelar', examples: 'Ejemplos', exampleList: ['¿Cuántos usuarios activos hay?', 'Busca el usuario con email...', 'Bloquea la cuenta con UID...', 'Dame las ventas de este mes'] }
    : { title: 'TITAN Admin AI', placeholder: 'Ask or describe an administrative action...', send: 'Send', confirm: 'Confirm action', cancel: 'Cancel', examples: 'Examples', exampleList: ['How many active users are there?', 'Find the user with email...', 'Disable the account with UID...', 'Show this month sales'] }

  return (
    <section className="admin-ai" aria-labelledby="admin-ai-title">
      <div className="admin-ai-heading">
        <div>
          <span className="admin-kicker">PRIVATE ADMIN ASSISTANT</span>
          <h3 id="admin-ai-title">{labels.title}</h3>
        </div>
        <span className="admin-ai-badge">ADMIN ONLY</span>
      </div>
      <div className="admin-ai-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div className={`admin-ai-message ${message.role}`} key={`${message.role}-${index}`}>
            <p>{message.content}</p>
            {message.data && <pre>{JSON.stringify(message.data, null, 2)}</pre>}
          </div>
        ))}
      </div>
      {pendingConfirmation && (
        <div className="admin-ai-confirm">
          <strong>{isSpanish ? 'Esta acción modifica datos sensibles.' : 'This action changes sensitive data.'}</strong>
          <div>
            <button type="button" onClick={() => send(isSpanish ? 'Confirmo la acción' : 'I confirm the action', pendingConfirmation)}>{labels.confirm}</button>
            <button type="button" className="secondary" onClick={() => setPendingConfirmation(null)}>{labels.cancel}</button>
          </div>
        </div>
      )}
      {error && <div className="admin-alert small">{error}</div>}
      <form className="admin-ai-form" onSubmit={event => { event.preventDefault(); send() }}>
        <input value={input} onChange={event => setInput(event.target.value)} placeholder={labels.placeholder} disabled={loading} />
        <button type="submit" disabled={loading || !input.trim()}>{loading ? '...' : labels.send}</button>
      </form>
      <div className="admin-ai-examples">
        <small>{labels.examples}</small>
        {labels.exampleList.map(example => <button type="button" key={example} onClick={() => send(example)}>{example}</button>)}
      </div>
    </section>
  )
}

export default AdminAI
