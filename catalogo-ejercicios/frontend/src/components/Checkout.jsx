import { useState } from 'react'
import { auth } from '../services/firebase'
import { apiUrl } from '../services/apiBase'
import '../styles/Checkout.css'

function Checkout({ cart, language, onBack, onComplete, shopDiscount = 0, shippingEnabled = true }) {
  const isStoreCheckout = shippingEnabled
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', address: '', city: '', postalCode: '', country: '' })
  const [errors, setErrors] = useState({})
  const [processing, setProcessing] = useState(false)

  const t = language === 'es'
    ? {
        title: 'Finalizar compra', shippingInfo: 'Información de envío', paymentInfo: 'Pago seguro',
        orderSummary: 'Resumen del pedido', fullName: 'Nombre completo', email: 'Correo electrónico',
        phone: 'Teléfono', address: 'Dirección', city: 'Ciudad', postalCode: 'Código postal',
        country: 'País', stripeNote: 'Serás redirigido a Stripe para completar el pago de forma segura.',
        subtotal: 'Subtotal', shipping: 'Envío', total: 'Total', placeOrder: 'Continuar con Stripe',
        buyModule: 'Comprar módulo', backToCart: '← Volver al carrito', processing: 'Redirigiendo...',
        free: 'Gratis', eliteDiscount: `Descuento del plan (${shopDiscount}%)`, required: 'Obligatorio'
      }
    : {
        title: 'Checkout', shippingInfo: 'Shipping information', paymentInfo: 'Secure payment',
        orderSummary: 'Order summary', fullName: 'Full name', email: 'Email', phone: 'Phone',
        address: 'Address', city: 'City', postalCode: 'Postal code', country: 'Country',
        stripeNote: 'You will be redirected to Stripe to complete payment securely.',
        subtotal: 'Subtotal', shipping: 'Shipping', total: 'Total', placeOrder: 'Continue with Stripe',
        buyModule: 'Buy module', backToCart: '← Back to cart', processing: 'Redirecting...',
        free: 'Free', eliteDiscount: `Plan discount (${shopDiscount}%)`, required: 'Required'
      }

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0)
  const discount = shopDiscount > 0 ? subtotal * (shopDiscount / 100) : 0
  const shipping = isStoreCheckout && subtotal - discount <= 50 ? 4.99 : 0
  const total = subtotal - discount + shipping

  const validateForm = () => {
    if (!isStoreCheckout) return true
    const nextErrors = {}
    ;['fullName', 'email', 'phone', 'address', 'city', 'postalCode', 'country'].forEach(field => {
      if (!formData[field].trim()) nextErrors[field] = t.required
    })
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) nextErrors.email = 'Email'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (!validateForm()) return
    setProcessing(true)
    setErrors({})
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error(language === 'es' ? 'Necesitas iniciar sesión' : 'You need to sign in')
      const token = await currentUser.getIdToken()
      if (isStoreCheckout) {
        const response = await fetch(apiUrl('/stripe/create-checkout-session'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
            discountPercent: shopDiscount,
            customer: formData
          })
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.url) throw new Error(data.error || 'No se pudo iniciar el pago')
        window.location.assign(data.url)
        return
      }

      const response = await fetch(apiUrl('/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })), total })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el pedido')
      window.alert(language === 'es' ? '¡Módulo activado correctamente!' : 'Module activated successfully!')
      onComplete()
    } catch (error) {
      setErrors({ submit: error.message })
      setProcessing(false)
    }
  }

  const handleChange = event => {
    const { name, value } = event.target
    setFormData(previous => ({ ...previous, [name]: value }))
    if (errors[name] || errors.submit) setErrors(previous => ({ ...previous, [name]: '', submit: '' }))
  }

  return (
    <div className="checkout">
      <button className="back-btn" onClick={onBack}>{t.backToCart}</button>
      <div className="checkout-container">
        <div className="checkout-form">
          <h1>{t.title}</h1>
          <form onSubmit={handleSubmit} noValidate>
            {isStoreCheckout && <section className="form-section">
              <h2>{t.shippingInfo}</h2>
              {[
                ['fullName', t.fullName], ['email', t.email], ['phone', t.phone],
                ['address', t.address], ['city', t.city], ['postalCode', t.postalCode], ['country', t.country]
              ].map(([name, label]) => (
                <div className="form-group" key={name}>
                  <label>{label} *</label>
                  <input name={name} type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'} value={formData[name]} onChange={handleChange} className={errors[name] ? 'error' : ''} />
                  {errors[name] && <small className="field-error">{errors[name]}</small>}
                </div>
              ))}
            </section>}
            <section className="form-section">
              <h2>{t.paymentInfo}</h2>
              <p>{t.stripeNote}</p>
              <div className="stripe-checkout-note">🔒 Stripe procesa los datos de pago. TITAN GYM nunca almacena tu tarjeta.</div>
            </section>
            {errors.submit && <div className="checkout-error">{errors.submit}</div>}
            <button type="submit" className="place-order-btn" disabled={processing}>
              {processing ? t.processing : isStoreCheckout ? t.placeOrder : t.buyModule}
            </button>
          </form>
        </div>
        <aside className="order-summary">
          <h2>{t.orderSummary}</h2>
          <div className="order-items">{cart.map(item => <div key={item.id} className="order-item">
            {item.image ? <img src={item.image} alt={item.name} /> : <div className="order-image-placeholder">IMG</div>}
            <div className="order-item-info"><h4>{item.name}</h4><span>x{item.quantity}</span></div>
            <span className="order-item-price">€{(item.price * item.quantity).toFixed(2)}</span>
          </div>)}</div>
          <div className="order-totals">
            <div className="order-total-row"><span>{t.subtotal}</span><span>€{subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="order-total-row"><span>{t.eliteDiscount}</span><span>−€{discount.toFixed(2)}</span></div>}
            {isStoreCheckout && <div className="order-total-row"><span>{t.shipping}</span><span>{shipping ? `€${shipping.toFixed(2)}` : t.free}</span></div>}
            <div className="order-total-row total"><span>{t.total}</span><span>€{total.toFixed(2)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Checkout
