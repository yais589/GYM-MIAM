import '../styles/Cart.css'

function Cart({ cart, language, onClose, onUpdateQuantity, onRemove, onCheckout, shopDiscount = 0 }) {
  const translations = {
    es: {
      title: 'Tu Carrito',
      empty: 'Tu carrito está vacío',
      subtotal: 'Subtotal',
      shipping: 'Envío',
      total: 'Total',
      checkout: 'Finalizar Compra',
      continueShopping: 'Seguir Comprando',
      free: 'Gratis',
      remove: 'Eliminar',
      eliteDiscount: 'Descuento Elite (5%)'
    },
    en: {
      title: 'Your Cart',
      empty: 'Your cart is empty',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      total: 'Total',
      checkout: 'Checkout',
      continueShopping: 'Continue Shopping',
      free: 'Free',
      remove: 'Remove',
      eliteDiscount: 'Elite discount (5%)'
    }
  }

  const t = translations[language]

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const getShipping = () => {
    return getSubtotal() > 50 ? 0 : 4.99
  }

  const getDiscount = () => {
    return shopDiscount > 0 ? getSubtotal() * (shopDiscount / 100) : 0
  }

  const getTotal = () => {
    return getSubtotal() - getDiscount() + getShipping()
  }

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={e => e.stopPropagation()}>
        <div className="cart-header">
          <h2>{t.title}</h2>
          <button className="cart-close" onClick={onClose}>✕</button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">{t.empty}</div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                {item.image ? (
                  <img src={item.image} alt={item.name} />
                ) : (
                  <div className="cart-image-placeholder">IMG</div>
                )}
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  <div className="cart-item-price">€{item.price.toFixed(2)}</div>
                  <div className="cart-item-quantity">
                    <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <button className="cart-item-remove" onClick={() => onRemove(item.id)}>
                  {t.remove}
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>{t.subtotal}</span>
                <span>€{getSubtotal().toFixed(2)}</span>
              </div>
              {shopDiscount > 0 && (
                <div className="cart-summary-row">
                  <span>{t.eliteDiscount}</span>
                  <span style={{ color: '#16a34a' }}>−€{getDiscount().toFixed(2)}</span>
                </div>
              )}
              <div className="cart-summary-row">
                <span>{t.shipping}</span>
                <span>{getShipping() === 0 ? t.free : `€${getShipping().toFixed(2)}`}</span>
              </div>
              <div className="cart-summary-row cart-total">
                <span>{t.total}</span>
                <span>€{getTotal().toFixed(2)}</span>
              </div>
            </div>
            <button className="checkout-btn" onClick={onCheckout}>
              {t.checkout}
            </button>
            <button className="continue-shopping-btn" onClick={onClose}>
              {t.continueShopping}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Cart
