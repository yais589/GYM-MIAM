import { auth } from './firebase'
import { apiUrl } from './apiBase'

export async function askAdminAI(message, confirmationToken = '', context = '', lastReport = null) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Necesitas iniciar sesión como administrador')

  const token = await currentUser.getIdToken()
  const response = await fetch(apiUrl('/admin/ai'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      message,
      context: context || undefined,
      confirmationToken: confirmationToken || undefined,
      lastReport: lastReport || undefined
    })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Error de la IA administrativa (${response.status})`)
  return data
}

export async function getAdminAIInteractions(limit = 30) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Necesitas iniciar sesión como administrador')
  const token = await currentUser.getIdToken()
  const response = await fetch(apiUrl(`/admin/ai/interactions?limit=${limit}`), {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `No se pudo recuperar el historial (${response.status})`)
  return data.interactions || []
}

/**
 * Descarga el PDF de un informe ya calculado. El servidor lo reconstruye desde
 * la spec (tipo + fechas), así que el documento refleja datos reales aunque el
 * informe se haya generado hace un rato.
 */
export async function downloadAdminReportPdf(spec, language = 'es') {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Necesitas iniciar sesión como administrador')
  if (!spec?.type) throw new Error('Este mensaje no tiene un informe descargable')

  const token = await currentUser.getIdToken()
  const response = await fetch(apiUrl('/admin/ai/report-pdf'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ spec, language })
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `No se pudo generar el PDF (${response.status})`)
  }

  const blob = await response.blob()
  const date = String(spec.from || '').slice(0, 10) || 'periodo'
  const fileName = `informe-${spec.type}-${date}.pdf`
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
  return fileName
}
