import { useState } from 'react'
import '../styles/ProductCard.css'

function ProductCard({ product, language, onAddToCart }) {
  const [quantity, setQuantity] = useState(1)
  const [showDetails, setShowDetails] = useState(false)
  const [imageError, setImageError] = useState(false)
  const isAvailable = product.isAvailable !== false && product.stock > 0

  const translations = {
    es: {
      addToCart: 'Añadir al carrito',
      unavailable: 'No disponible',
      outOfStock: 'Sin existencias',
      stock: 'Stock',
      quantity: 'Cantidad',
      details: 'Ver detalles',
      close: 'Cerrar',
      added: '¡Añadido!',
      featured: 'Destacado',
      lowStock: 'Últimas unidades',
      brand: 'Marca',
      category: 'Categoría',
      weight: 'Formato',
      flavor: 'Sabor',
      sku: 'SKU',
      rating: 'Valoración',
      reviews: 'reseñas',
      unavailableDetail: 'Este producto no está disponible actualmente',
      noImage: 'Sin imagen'
    },
    en: {
      addToCart: 'Add to cart',
      unavailable: 'Unavailable',
      outOfStock: 'Out of stock',
      stock: 'Stock',
      quantity: 'Quantity',
      details: 'View details',
      close: 'Close',
      added: 'Added!',
      featured: 'Featured',
      lowStock: 'Low stock',
      brand: 'Brand',
      category: 'Category',
      weight: 'Size',
      flavor: 'Flavor',
      sku: 'SKU',
      rating: 'Rating',
      reviews: 'reviews',
      unavailableDetail: 'This product is currently unavailable',
      noImage: 'No image'
    }
  }

  const t = translations[language]
  const [justAdded, setJustAdded] = useState(false)
  const details = [
    [t.brand, product.brand],
    [t.category, product.category],
    [t.weight, product.weight],
    [t.flavor, product.flavor],
    [t.sku, product.sku]
  ].filter(([, value]) => value)

  const handleAddToCart = () => {
    if (!isAvailable) return
    onAddToCart(product, quantity)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 1500)
  }

  const ProductImage = ({ modal = false }) => product.image && !imageError ? (
    <img src={product.image} alt={product.name} onError={() => setImageError(true)} />
  ) : (
    <div className={modal ? 'modal-image-placeholder' : 'image-placeholder'}>{t.noImage}</div>
  )

  return (
    <>
      <article className="product-card">
        <div className="product-image">
          <ProductImage />
          {product.featured && <span className="featured-product">★ {t.featured}</span>}
          {!isAvailable ? (
            <span className="unavailable-product">{product.stock === 0 ? t.outOfStock : t.unavailable}</span>
          ) : product.stock < 10 ? (
            <span className="low-stock">{t.lowStock}: {product.stock}</span>
          ) : null}
        </div>
        <div className="product-info">
          {product.brand && <span className="product-brand">{product.brand}</span>}
          <h3>{product.name}</h3>
          <div className="product-meta">
            {product.weight && <span>{product.weight}</span>}
            {product.flavor && <span>{product.flavor}</span>}
          </div>
          {Number(product.rating) > 0 && (
            <span className="product-rating">★ {Number(product.rating).toFixed(1)} <small>({product.reviews || 0} {t.reviews})</small></span>
          )}
          <p className="product-description">{product.description}</p>
          <div className="product-price">€{Number(product.price || 0).toFixed(2)}</div>
          <div className="product-actions">
            <div className="quantity-selector" aria-label={t.quantity}>
              <button type="button" onClick={() => setQuantity(current => Math.max(1, current - 1))} disabled={!isAvailable}>−</button>
              <span>{quantity}</span>
              <button type="button" onClick={() => setQuantity(current => Math.min(product.stock, current + 1))} disabled={!isAvailable || quantity >= product.stock}>+</button>
            </div>
            <button className={`add-to-cart-btn ${justAdded ? 'added' : ''}`} type="button" onClick={handleAddToCart} disabled={!isAvailable}>
              {justAdded ? t.added : isAvailable ? t.addToCart : product.stock === 0 ? t.outOfStock : t.unavailable}
            </button>
          </div>
          <button className="details-btn" type="button" onClick={() => setShowDetails(true)}>{t.details}</button>
        </div>
      </article>

      {showDetails && (
        <div className="product-modal" onClick={() => setShowDetails(false)} role="presentation">
          <section className="modal-content" role="dialog" aria-modal="true" aria-label={product.name} onClick={event => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setShowDetails(false)} aria-label={t.close}>✕</button>
            <div className="modal-image"><ProductImage modal /></div>
            {product.featured && <span className="modal-featured">★ {t.featured}</span>}
            {product.brand && <p className="modal-brand">{product.brand}</p>}
            <h2>{product.name}</h2>
            {Number(product.rating) > 0 && <p className="modal-rating">★ {Number(product.rating).toFixed(1)} · {product.reviews || 0} {t.reviews}</p>}
            <p className="modal-description">{product.description}</p>
            <dl className="product-detail-list">
              {details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              <div><dt>{t.stock}</dt><dd>{product.stock}</dd></div>
              <div><dt>{t.unavailable}</dt><dd>{isAvailable ? '—' : t.unavailableDetail}</dd></div>
            </dl>
            <div className="modal-price">€{Number(product.price || 0).toFixed(2)}</div>
            {isAvailable ? (
              <button className="modal-add-to-cart" type="button" onClick={handleAddToCart}>{t.addToCart}</button>
            ) : (
              <p className="modal-unavailable">{product.stock === 0 ? t.outOfStock : t.unavailableDetail}</p>
            )}
          </section>
        </div>
      )}
    </>
  )
}

export default ProductCard
