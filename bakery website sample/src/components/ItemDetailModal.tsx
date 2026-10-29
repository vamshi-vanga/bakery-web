'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ChevronDown, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import type { MenuItem } from '@/lib/types';

interface ItemDetailModalProps {
  item: MenuItem;
  onClose: () => void;
}

export default function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const { addToCart } = useCart();
  const hasSizes = Boolean(item.size_variants && item.size_variants.length > 0);
  const defaultVariant = item.size_variants?.find((variant) => variant.is_default) || item.size_variants?.[0];
  const [selectedSize, setSelectedSize] = useState<string>(defaultVariant?.size || '');
  const currentVariant = item.size_variants?.find((variant) => variant.size === selectedSize);
  const currentPrice = currentVariant ? currentVariant.price : item.price;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-5">
      <button type="button" aria-label="Close product details" onClick={onClose} className="absolute inset-0 bg-espresso/55 backdrop-blur-sm" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        className="relative z-10 max-h-[94svh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-cream shadow-2xl animate-scale-in sm:rounded-[2rem]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-espresso shadow-md transition hover:rotate-90 hover:bg-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="grid md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative min-h-[230px] overflow-hidden bg-cream-dark sm:min-h-[340px] md:min-h-[560px]">
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 767px) 100vw, 45vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-espresso/25 via-transparent to-transparent md:bg-gradient-to-r" />
            <button type="button" onClick={onClose} className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-2 text-xs font-semibold text-espresso shadow-sm md:hidden">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to menu
            </button>
          </div>

          <div className="flex flex-col px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-caramel/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-caramel-dark">{item.category}</span>
              {item.subcategory && <span className="rounded-full border border-border bg-white/65 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted">{item.subcategory}</span>}
            </div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-caramel-dark">Baked at Sample Bakery</p>
            <h2 id="product-detail-title" className="font-serif text-3xl font-medium leading-tight text-espresso sm:text-4xl">{item.name}</h2>
            <p className="mt-4 text-sm leading-7 text-charcoal-light">{item.description}</p>

            {hasSizes && (
              <label className="mt-6 block">
                <span className="mb-2 block text-xs font-semibold text-espresso">Size</span>
                <span className="relative block">
                  <select
                    aria-label={'Choose a size for ' + item.name}
                    value={selectedSize}
                    onChange={(event) => setSelectedSize(event.target.value)}
                    className="h-12 w-full appearance-none rounded-xl border border-border bg-white px-4 pr-10 text-sm font-medium text-espresso outline-none transition focus:border-caramel focus:ring-4 focus:ring-caramel/10"
                  >
                    {item.size_variants?.map((variant) => (
                      <option key={variant.size} value={variant.size}>
                        {variant.size}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                </span>
              </label>
            )}

            <div className="mt-auto flex items-center justify-between gap-4 border-t border-border pt-5 sm:pt-7">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted">Price</p>
                <p className="mt-1 font-serif text-3xl font-semibold text-espresso">₹{currentPrice}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  addToCart(item, hasSizes ? selectedSize : undefined, currentPrice);
                  onClose();
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-espresso px-5 text-xs font-semibold text-white shadow-lg shadow-espresso/15 transition-all hover:bg-espresso-light active:scale-[0.98] sm:min-h-14 sm:px-7 sm:text-sm"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Add to bag
                <span className="hidden sm:inline">· ₹{currentPrice}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
