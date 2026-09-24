import { useState } from 'react'
import '../styles/Checkout.css'

function Checkout({ cart, language, onBack, onComplete, shopDiscount = 0, shippingEnabled = true }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    saveCard: false
  })

  const [errors, setErrors] = useState({})
  const [processing, setProcessing] = useState(false)

  const translations = {
    es: {
      title: 'Finalizar Compra',
      shippingInfo: 'Información de Envío',
      paymentInfo: 'Información de Pago',
      orderSummary: 'Resumen del Pedido',
      fullName: 'Nombre completo',
      email: 'Correo electrónico',
      phone: 'Teléfono',
      address: 'Dirección',
      city: 'Ciudad',
      postalCode: 'Código postal',
      country: 'País',
      cardNumber: 'Número de tarjeta',
      cardName: 'Nombre en la tarjeta',
      expiryDate: 'Fecha de caducidad (MM/AA)',
      cvv: 'CVV',
      saveCard: 'Guardar tarjeta para futuras compras',
      subtotal: 'Subtotal',
      shipping: 'Envío',
      total: 'Total',
      placeOrder: 'Realizar Pedido',
      backToCart: '← Volver al carrito',
      processing: 'Procesando...',
      orderSuccess: '¡Pedido realizado con éxito!',
      thankYou: 'Gracias por tu compra',
      orderNumber: 'Número de pedido',
      free: 'Gratis',
      eliteDiscount: 'Descuento Elite (5%)'
    },
    en: {
      title: 'Checkout',
      shippingInfo: 'Shipping Information',
      paymentInfo: 'Payment Information',
      orderSummary: 'Order Summary',
      fullName: 'Full name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      city: 'City',
      postalCode: 'Postal code',
      country: 'Country',
      cardNumber: 'Card number',
      cardName: 'Name on card',
      expiryDate: 'Expiry date (MM/YY)',
      cvv: 'CVV',
      saveCard: 'Save card for future purchases',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      total: 'Total',
      placeOrder: 'Place Order',
      backToCart: '← Back to cart',
      processing: 'Processing...',
      orderSuccess: 'Order placed successfully!',
      thankYou: 'Thank you for your purchase',
      orderNumber: 'Order number',
      free: 'Free',
      eliteDiscount: 'Elite discount (5%)'
    }
  }

  const t = translations[language]

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const getShipping = () => {
    if (!shippingEnabled) return 0
    return getSubtotal() > 50 ? 0 : 4.99
  }

  const getDiscount = () => {
    return shopDiscount > 0 ? getSubtotal() * (shopDiscount / 100) : 0
  }

  const getTotal = () => {
    return getSubtotal() - getDiscount() + getShipping()
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.fullName.trim()) newErrors.fullName = 'Required'
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email'
    if (!formData.phone.trim()) newErrors.phone = 'Required'
    if (!formData.address.trim()) newErrors.address = 'Required'
    if (!formData.city.trim()) newErrors.city = 'Required'
    if (!formData.postalCode.trim()) newErrors.postalCode = 'Required'
    if (!formData.country.trim()) newErrors.country = 'Required'
    if (!formData.cardNumber.trim() || formData.cardNumber.replace(/\s/g, '').length !== 16) {
      newErrors.cardNumber = 'Invalid card number'
    }
    if (!formData.cardName.trim()) newErrors.cardName = 'Required'
    if (!formData.expiryDate.trim() || !/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      newErrors.expiryDate = 'Invalid format (MM/YY)'
    }
    if (!formData.cvv.trim() || formData.cvv.length !== 3) newErrors.cvv = 'Invalid CVV'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setProcessing(true)

    // Simular procesamiento de pago
    await new Promise(resolve => setTimeout(resolve, 2000))

    const orderNumber = 'ORD-' + Date.now()
    alert(`${t.orderSuccess}\n${t.orderNumber}: ${orderNumber}`)

    onComplete()
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '')
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
    return formatted.slice(0, 19)
  }

  return (
    <div className="checkout">
      <button className="back-btn" onClick={onBack}>{t.backToCart}</button>

      <div className="checkout-container">
        <div className="checkout-form">
          <h1>{t.title}</h1>

          <form onSubmit={handleSubmit}>
            <section className="form-section">
              <h2>{t.shippingInfo}</h2>

              <div className="form-group">
                <label>{t.fullName} *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={errors.fullName ? 'error' : ''}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t.email} *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'error' : ''}
                  />
                </div>
                <div className="form-group">
                  <label>{t.phone} *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={errors.phone ? 'error' : ''}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t.address} *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={errors.address ? 'error' : ''}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t.city} *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={errors.city ? 'error' : ''}
                  />
                </div>
                <div className="form-group">
                  <label>{t.postalCode} *</label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className={errors.postalCode ? 'error' : ''}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t.country} *</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className={errors.country ? 'error' : ''}
                />
              </div>
            </section>

            <section className="form-section">
              <h2>{t.paymentInfo}</h2>

              <div className="form-group">
                <label>{t.cardNumber} *</label>
                <input
                  type="text"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={(e) => handleChange({
                    target: {
                      name: 'cardNumber',
                      value: formatCardNumber(e.target.value)
                    }
                  })}
                  placeholder="1234 5678 9012 3456"
                  className={errors.cardNumber ? 'error' : ''}
                />
              </div>

              <div className="form-group">
                <label>{t.cardName} *</label>
                <input
                  type="text"
                  name="cardName"
                  value={formData.cardName}
                  onChange={handleChange}
                  className={errors.cardName ? 'error' : ''}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t.expiryDate} *</label>
                  <input
                    type="text"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    placeholder="MM/YY"
                    maxLength="5"
                    className={errors.expiryDate ? 'error' : ''}
                  />
                </div>
                <div className="form-group">
                  <label>{t.cvv} *</label>
                  <input
                    type="text"
                    name="cvv"
                    value={formData.cvv}
                    onChange={handleChange}
                    placeholder="123"
                    maxLength="3"
                    className={errors.cvv ? 'error' : ''}
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="saveCard"
                    checked={formData.saveCard}
                    onChange={handleChange}
                  />
                  <span>{t.saveCard}</span>
                </label>
              </div>
            </section>

            <button
              type="submit"
              className="place-order-btn"
              disabled={processing}
            >
              {processing ? t.processing : t.placeOrder}
            </button>
          </form>
        </div>

        <aside className="order-summary">
          <h2>{t.orderSummary}</h2>

          <div className="order-items">
            {cart.map(item => (
              <div key={item.id} className="order-item">
                {item.image ? (
                  <img src={item.image} alt={item.name} />
                ) : (
                  <div className="order-image-placeholder">IMG</div>
                )}
                <div className="order-item-info">
                  <h4>{item.name}</h4>
                  <span>x{item.quantity}</span>
                </div>
                <span className="order-item-price">
                  €{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="order-totals">
            <div className="order-total-row">
              <span>{t.subtotal}</span>
              <span>€{getSubtotal().toFixed(2)}</span>
            </div>
            {shopDiscount > 0 && (
              <div className="order-total-row">
                <span>{t.eliteDiscount}</span>
                <span style={{ color: '#16a34a' }}>−€{getDiscount().toFixed(2)}</span>
              </div>
            )}
            <div className="order-total-row">
              <span>{t.shipping}</span>
              <span>{getShipping() === 0 ? t.free : `€${getShipping().toFixed(2)}`}</span>
            </div>
            <div className="order-total-row total">
              <span>{t.total}</span>
              <span>€{getTotal().toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Checkout
