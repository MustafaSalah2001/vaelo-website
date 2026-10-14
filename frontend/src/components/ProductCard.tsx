import { Link } from 'react-router-dom';
import type { ProductSummary } from '../api/types';
import { price } from '../lib/format';
import { GLImage } from './GLImage';
import { Swatch } from './ui';

/** Shop tile: photo (second photo spreads from the cursor on hover), name, price, colours. */
export function ProductCard({ product, sizes }: { product: ProductSummary; sizes?: string }) {
  return (
    <Link to={`/shop/${product.slug}`} className="group block">
      <GLImage src={product.imageUrl} hoverSrc={product.hoverImageUrl} alt={product.imageAlt ?? product.name} ratio="4 / 5" sizes={sizes} />
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="t-h3 group-hover:text-cobalt">{product.name}</h3>
        <p className="t-price shrink-0">{price(product.price, product.currency)}</p>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-4">
        <p className="t-small">
          {product.categoryName}
          {product.isNew && <span className="ml-2 text-cobalt">New</span>}
        </p>
        <span className="flex gap-1.5" aria-label={`${product.colors.length} colours: ${product.colors.map((c) => c.name).join(', ')}`}>
          {product.colors.map((c) => (
            <Swatch key={c.name} hex={c.hex} />
          ))}
        </span>
      </div>
    </Link>
  );
}
