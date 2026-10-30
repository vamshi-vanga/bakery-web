'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Cookie, Menu, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const navLinks = [
  { href: '#menu', label: 'The Menu' },
  { href: '#about', label: 'Your Order' },
  { href: '#location', label: 'Need a Hand?' },
];

export default function Navbar() {
  const { toggleCart, cartCount } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-espresso/5 bg-cream/90 shadow-sm shadow-espresso/5 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3" aria-label="Sample Cloud Bakery / Cloud Kitchen home">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-espresso text-caramel-light shadow-md shadow-espresso/15 transition-transform group-hover:-rotate-6">
              <Cookie className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="leading-none">
              <span className="block font-serif text-[1.2rem] font-bold tracking-tight text-espresso">Sample Cloud Bakery</span>
              <span className="mt-1.5 block text-[9px] font-bold uppercase tracking-[0.24em] text-caramel-dark">Cloud Kitchen</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full px-4 py-2.5 text-sm font-medium text-charcoal-light transition-colors hover:bg-white/70 hover:text-espresso">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">

            {/* Cart Button */}

            {/* Cart Button */}
            <button
              type="button"
              onClick={toggleCart}
              aria-label={cartCount > 0 ? 'Open shopping bag, ' + cartCount + ' items' : 'Open shopping bag'}
              className="relative inline-flex h-11 items-center gap-2 rounded-full bg-espresso px-4 text-sm font-semibold text-white shadow-lg shadow-espresso/15 transition-all hover:bg-espresso-light active:scale-[0.97]"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Your bag</span>
              {cartCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-caramel px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-espresso transition-colors hover:bg-cream-dark md:hidden"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-espresso/35 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <nav aria-label="Mobile navigation" className="absolute inset-x-3 top-[84px] rounded-3xl border border-border bg-cream p-4 shadow-2xl space-y-1" onClick={(event) => event.stopPropagation()}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-12 items-center justify-between rounded-2xl px-4 font-semibold text-espresso transition-colors hover:bg-white"
              >
                {link.label}
                <ArrowRight className="h-4 w-4 text-caramel" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
