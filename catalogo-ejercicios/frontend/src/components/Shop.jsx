import { useState, useEffect, useMemo } from 'react'
import ProductCard from './ProductCard'
import Cart from './Cart'
import Checkout from './Checkout'
import { getStoreItems } from '../services/api'
import { getProfileCart, saveProfileCart } from '../services/profile'
import '../styles/Shop.css'

const categoryIcons = {
  'Proteínas': '💪',
  Vitaminas: '🌿',
  'Pre-entrenos': '⚡',
  Creatinas: '🔥',
  'Aminoácidos': '🧬',
  Recuperación: '🛡️',
  'Ganadores de peso': '⚖️',
  Quemagrasas: '🔥'
}

function Shop({ language, user, onRequestAuth, onBackToApp, shopDiscount = 0 }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [cartReady, setCartReady] = useState(false)

  const translations = {
    es: {
      title: 'TITAN SHOP',
      backToApp: '← Volver a la App',
      categories: 'Categorías',
      all: 'Todos',
      cart: 'Carrito',
      products: 'productos',
      loading: 'Cargando catálogo...',
      loadError: 'No se pudo cargar el catálogo de la tienda.',
      retry: 'Reintentar',
      noProducts: 'No hay productos disponibles en esta categoría.'
    },
    en: {
      title: 'TITAN SHOP',
      backToApp: '← Back to App',
      categories: 'Categories',
      all: 'All',
      cart: 'Cart',
      products: 'products',
      loading: 'Loading catalog...',
      loadError: 'The store catalog could not be loaded.',
      retry: 'Retry',
      noProducts: 'There are no products available in this category.'
    }
  }

  const t = translations[language]

  const loadProducts = async () => {
    setLoading(true)
    setLoadError('')

    try {
      setProducts(await getStoreItems())
    } catch (error) {
      console.error('Error loading store products:', error)
      setProducts([])
      setLoadError(t.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (!products.length) return

    if (!user) {
      setCart([])
      setCartReady(true)
      return
    }

    let cancelled = false
    getProfileCart()
      .then(({ items = [] }) => {
        if (cancelled) return
        const savedCart = items.map(savedItem => {
          const product = products.find(item => String(item.id) === String(savedItem.id))
          if (!product || product.stock < 1 || product.isAvailable === false) return null
          return {
            ...product,
            quantity: Math.min(product.stock, Math.max(1, Number(savedItem.quantity) || 1))
          }
        }).filter(Boolean)
        setCart(savedCart)
      })
      .catch(error => console.error('Error loading saved cart:', error))
      .finally(() => {
        if (!cancelled) setCartReady(true)
      })

    return () => { cancelled = true }
  }, [products, user])

  useEffect(() => {
    if (!cartReady || !user) return
    saveProfileCart(cart.map(({ id, quantity }) => ({ id, quantity })))
      .catch(error => console.error('Error saving cart:', error))
  }, [cart, cartReady, user])

  const categories = useMemo(() => {
    const names = [...new Set(products.map(product => product.category).filter(Boolean))]
    return names.sort((first, second) => first.localeCompare(second, 'es')).map(name => ({
      id: name,
      name,
      icon: categoryIcons[name] || '🏷️'
    }))
  }, [products])

  const filteredProducts = selectedCategory
    ? products.filter(product => product.category === selectedCategory)
    : products

  const addToCart = (product, quantity = 1) => {
    if (!product.isAvailable || product.stock < 1) return

    setCart(previousCart => {
      const existing = previousCart.find(item => String(item.id) === String(product.id))
      if (existing) {
        return previousCart.map(item => item.id === product.id
          ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) }
          : item
        )
      }
      return [...previousCart, { ...product, quantity: Math.min(product.stock, quantity) }]
    })
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(previousCart => previousCart.filter(item => String(item.id) !== String(productId)))
      return
    }

    setCart(previousCart => previousCart.map(item => item.id === productId
      ? { ...item, quantity: Math.min(item.stock, quantity) }
      : item
    ))
  }

  const removeFromCart = (productId) => {
    setCart(previousCart => previousCart.filter(item => String(item.id) !== String(productId)))
  }

  const getTotalItems = () => cart.reduce((sum, item) => sum + item.quantity, 0)

  if (showCheckout) {
    return (
      <Checkout
        cart={cart}
        language={language}
        shopDiscount={shopDiscount}
        onBack={() => setShowCheckout(false)}
        onComplete={() => {
          setCart([])
          setShowCheckout(false)
          setShowCart(false)
        }}
      />
    )
  }

  return (
    <div className="shop">
      <div className="shop-top-bar">
        <button className="back-to-app" onClick={onBackToApp}>{t.backToApp}</button>
        <h1 className="shop-title">{t.title}</h1>
        <button className="cart-button" onClick={() => setShowCart(open => !open)}>
          🛒 {t.cart} {getTotalItems() > 0 && `(${getTotalItems()})`}
        </button>
      </div>

      <div className="shop-content">
        <aside className="shop-sidebar">
          <h3>{t.categories}</h3>
          <button className={`category-btn ${selectedCategory === null ? 'active' : ''}`} onClick={() => setSelectedCategory(null)}>
            {t.all}
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </aside>

        <main className="shop-main">
          {shopDiscount > 0 && (
            <div className="shop-elite-banner">
              👑 {language === 'es'
                ? `Plan Elite activo: ${shopDiscount}% de descuento en toda la tienda`
                : `Elite plan active: ${shopDiscount}% off the entire shop`}
            </div>
          )}
          <div className="shop-summary">
            <span><strong>{filteredProducts.length}</strong> {t.products}</span>
          </div>

          {loading ? (
            <div className="shop-loading">{t.loading}</div>
          ) : loadError ? (
            <div className="shop-error">
              <p>{loadError}</p>
              <button type="button" onClick={loadProducts}>{t.retry}</button>
            </div>
          ) : filteredProducts.length ? (
            <div className="products-grid">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} language={language} onAddToCart={addToCart} />
              ))}
            </div>
          ) : (
            <p className="shop-empty">{t.noProducts}</p>
          )}
        </main>
      </div>

      {showCart && (
        <Cart
          cart={cart}
          language={language}
          shopDiscount={shopDiscount}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onCheckout={() => {
            if (!user) onRequestAuth()
            else setShowCheckout(true)
          }}
        />
      )}
    </div>
  )
}

export default Shop
