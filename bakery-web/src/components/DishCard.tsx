'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, ChevronDown, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import type { MenuItem } from '@/lib/types';

interface DishCardProps {
  item: MenuItem;
  onViewDetails: () => void;
  isFeatured?: boolean;
}

export default function DishCard({ item, onViewDetails, isFeatured = false }: DishCardProps) {
  const { addToCart } = useCart();
  const hasSizes = Boolean(item.size_variants && item.size_variants.length > 0);
  const defaultVariant = item.size_variants?.find((variant) => variant.is_default) || item.size_variants?.[0];
  const [selectedSize, setSelectedSize] = useState<string>(defaultVariant?.size || '');
  const currentVariant = item.size_variants?.find((variant) => variant.size === selectedSize);
  const currentPrice = currentVariant ? currentVariant.price : item.price;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.65rem] border border-espresso/5 bg-white shadow-[0_10px_35px_rgba(45,24,16,0.045)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(45,24,16,0.12)]">
      <button
        type="button"
        onClick={onViewDetails}
        aria-label={'View details for ' + item.name}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-cream-dark text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-caramel"
      >
        <Image
          src={item.image_url}
          alt={item.name}
          fill
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-espresso/25 via-transparent to-transparent opacity-80" />
        {isFeatured && (
          <span className="absolute left-4 top-4 rounded-full border border-white/70 bg-cream/95 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-espresso shadow-sm">
            Featured
          </span>
        )}
        <span className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-espresso shadow-sm transition-transform group-hover:rotate-45">
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-caramel-dark">{item.subcategory || item.category}</p>
            <button type="button" onClick={onViewDetails} className="text-left font-serif text-lg font-semibold leading-snug text-espresso transition-colors hover:text-caramel-dark focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel sm:text-xl">
              {item.name}
            </button>
          </div>
          <div className="shrink-0 pt-0.5 text-right">
            <span className="font-serif text-lg font-semibold text-espresso">₹{currentPrice}</span>
          </div>
        </div>

        <p className="mb-4 line-clamp-2 min-h-10 text-xs leading-5 text-charcoal-light sm:text-sm">{item.description}</p>

        {hasSizes && (
          <label className="mb-4 flex min-h-10 items-center justify-between gap-3 rounded-xl border border-border bg-cream px-3">
            <span className="text-[11px] font-medium text-muted">Size</span>
            <span className="relative flex items-center">
              <select
                aria-label={'Choose a size for ' + item.name}
                value={selectedSize}
                onChange={(event) => setSelectedSize(event.target.value)}
                className="min-h-9 appearance-none bg-transparent py-1 pl-2 pr-6 text-right text-xs font-semibold text-espresso outline-none focus-visible:ring-2 focus-visible:ring-caramel"
              >
                {item.size_variants?.map((variant) => (
                  <option key={variant.size} value={variant.size}>{variant.size}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-muted" aria-hidden="true" />
            </span>
          </label>
        )}

        <button
          type="button"
          onClick={() => addToCart(item, hasSizes ? selectedSize : undefined, currentPrice)}
          className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cream text-xs font-bold text-espresso transition-colors hover:bg-espresso hover:text-white active:scale-[0.98] sm:text-sm"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add to bag
        </button>
      </div>
    </article>
  );
}
