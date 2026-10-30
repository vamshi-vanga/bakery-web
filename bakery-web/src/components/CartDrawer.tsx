'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

export default function CartDrawer() {
  const { cart, isCartOpen, closeCart, removeFromCart, updateQuantity, cartTotal, cartCount, clearCart } = useCart();
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });
  const [humanConfirmed, setHumanConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [whatsAppDraft, setWhatsAppDraft] = useState('');
  const [whatsAppAutoSent, setWhatsAppAutoSent] = useState(false);

  useEffect(() => {
    if (!isCartOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCheckoutMode(false);
        setOrderSuccess(false);
        setOrderError('');
        setWhatsAppDraft('');
        setWhatsAppAutoSent(false);
        setHumanConfirmed(false);
        closeCart();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen, closeCart]);

  const handleClose = () => {
    setIsCheckoutMode(false);
    setOrderSuccess(false);
    setOrderError('');
    setWhatsAppDraft('');
    setWhatsAppAutoSent(false);
    setHumanConfirmed(false);
    setFormData({ name: '', phone: '', notes: '' });
    closeCart();
  };

  const handlePlaceOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!humanConfirmed) {
      setOrderError('Please confirm that you are not a robot before placing your order.');
      return;
    }
    setOrderError('');
    setIsSubmitting(true);

    const orderItems = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image_url: item.image_url,
      selected_size: item.selected_size || null,
    }));

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'customer',
          humanConfirmed,
          customer_name: formData.name,
          customer_phone: formData.phone,
          items: orderItems,
          total: cartTotal,
          status: 'pending',
          notes: formData.notes || null,
          order_type: 'takeaway',
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your order.');

      setWhatsAppDraft(result.whatsapp?.url || '');
      setWhatsAppAutoSent(result.whatsapp?.status === 'sent');
      setOrderSuccess(true);
      clearCart();
      if (result.whatsapp?.status === 'failed') {
        setOrderError('Your order was saved, but the automatic WhatsApp alert could not be delivered. You can send the details using the link below.');
      }
    } catch (error) {
      console.error('Order error:', error);
      setOrderError(error instanceof Error ? error.message : 'We could not save your request. Please try again in a moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close shopping bag"
        onClick={handleClose}
        tabIndex={isCartOpen ? 0 : -1}
        className={cn(
          'fixed inset-0 z-50 bg-espresso/45 backdrop-blur-sm transition-opacity duration-300',
          isCartOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        aria-hidden={!isCartOpen}
        inert={!isCartOpen}
        className={cn(
          'fixed inset-y-0 right-0 z-[51] flex w-full max-w-md flex-col border-l border-espresso/5 bg-cream shadow-2xl transition-transform duration-300 ease-out',
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-espresso text-caramel-light">
              {isCheckoutMode ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : <ShoppingBag className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-caramel-dark">{isCheckoutMode ? 'Your order' : 'Sample Cloud Bakery / Cloud Kitchen'}</p>
              <h2 id="cart-title" className="font-serif text-xl font-semibold text-espresso">
                {orderSuccess ? 'Request sent' : isCheckoutMode ? 'A few details' : 'Your bag'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!orderSuccess && !isCheckoutMode && <span className="text-xs font-medium text-muted">{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>}
            <button type="button" onClick={handleClose} aria-label="Close shopping bag" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-muted transition-colors hover:text-espresso">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {orderSuccess ? (
            <div className="flex min-h-full flex-col items-center justify-center py-12 text-center">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sage-light/35 text-sage">
                <Check className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-caramel-dark">Thank you, {formData.name || 'friend'}</p>
              <h3 className="mt-2 font-serif text-3xl font-medium text-espresso">Your request is with us.</h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-muted">
                {whatsAppAutoSent
                  ? 'Your order request has been saved and the bakery has been notified on WhatsApp.'
                  : whatsAppDraft
                    ? 'Your order request has been saved. Open WhatsApp to send the details to the bakery.'
                  : 'Your order request has been saved for the bakery to review. The bakery will follow up to confirm the details.'}
              </p>
              {whatsAppDraft && (
                <a href={whatsAppDraft} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-caramel/30 bg-white px-5 text-sm font-semibold text-caramel-dark transition-colors hover:bg-caramel/5">
                  Open WhatsApp to send details
                </a>
              )}
              {orderError && <p role="status" className="mt-4 max-w-xs text-xs leading-5 text-muted">{orderError}</p>}
              <button type="button" onClick={handleClose} className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-espresso px-6 text-sm font-semibold text-white transition-colors hover:bg-espresso-light">
                Continue browsing
                <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
              </button>
            </div>
          ) : !isCheckoutMode ? (
            cart.length === 0 ? (
              <div className="flex min-h-full flex-col items-center justify-center py-12 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-caramel/10 text-caramel-dark">
                  <ShoppingBag className="h-7 w-7" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-serif text-2xl font-medium text-espresso">Your bag is waiting.</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted">Take a look through the menu and add something that catches your eye.</p>
                <Link href="#menu" onClick={handleClose} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-espresso px-6 text-sm font-semibold text-white transition-colors hover:bg-espresso-light">
                  Browse the menu
                  <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-sm leading-6 text-muted">A lovely little selection so far.</p>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <article key={item.id} className="flex gap-3 rounded-2xl border border-espresso/5 bg-white p-3 shadow-sm sm:gap-4">
                      <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-cream-dark sm:h-20 sm:w-20">
                        <Image src={item.image_url} alt={item.name} fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate font-serif text-sm font-semibold text-espresso">{item.name}</h3>
                            {item.selected_size && <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{item.selected_size}</p>}
                          </div>
                          <button type="button" onClick={() => removeFromCart(item.id)} aria-label={'Remove ' + item.name + ' from your bag'} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex h-8 items-center rounded-full border border-border bg-cream">
                            <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={'Decrease ' + item.name + ' quantity'} className="flex h-8 w-8 items-center justify-center rounded-full text-espresso transition-colors hover:bg-white">
                              <Minus className="h-3 w-3" aria-hidden="true" />
                            </button>
                            <span className="w-5 text-center text-xs font-semibold text-espresso">{item.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={'Increase ' + item.name + ' quantity'} className="flex h-8 w-8 items-center justify-center rounded-full text-espresso transition-colors hover:bg-white">
                              <Plus className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-espresso">₹{item.price * item.quantity}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )
          ) : (
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-5">
              <div className="rounded-2xl border border-caramel/15 bg-white p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-caramel-dark">Order summary</p>
                <p className="mt-1 text-sm font-semibold text-espresso">{cartCount} {cartCount === 1 ? 'item' : 'items'} · ₹{cartTotal}</p>
                <button type="button" onClick={() => setIsCheckoutMode(false)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-espresso">
                  <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                  Back to your bag
                </button>
              </div>

              <div>
                <label htmlFor="customer-name" className="mb-2 block text-xs font-semibold text-espresso">Your name</label>
                <input
                  id="customer-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  className="h-12 w-full rounded-xl border border-border bg-white px-4 text-sm text-espresso outline-none transition focus:border-caramel focus:ring-4 focus:ring-caramel/10"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label htmlFor="customer-phone" className="mb-2 block text-xs font-semibold text-espresso">Phone number</label>
                <input
                  id="customer-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  pattern="[0-9]{10}"
                  title="Enter a valid 10-digit mobile number"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  className="h-12 w-full rounded-xl border border-border bg-white px-4 text-sm text-espresso outline-none transition focus:border-caramel focus:ring-4 focus:ring-caramel/10"
                  placeholder="10-digit mobile number"
                />
              </div>

              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 transition-colors hover:border-caramel/40">
                <input
                  type="checkbox"
                  required
                  checked={humanConfirmed}
                  onChange={(event) => {
                    setHumanConfirmed(event.target.checked);
                    if (event.target.checked) setOrderError('');
                  }}
                  className="h-5 w-5 shrink-0 accent-espresso"
                />
                <span className="flex flex-1 items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-espresso">I am not a robot</span>
                  <ShieldCheck className="h-5 w-5 text-sage" aria-hidden="true" />
                </span>
              </label>

              <div>
                <label htmlFor="order-notes" className="mb-2 block text-xs font-semibold text-espresso">
                  Note for the bakery <span className="font-normal text-muted">(optional)</span>
                </label>
                <textarea
                  id="order-notes"
                  rows={3}
                  value={formData.notes}
                  onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                  className="w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm text-espresso outline-none transition focus:border-caramel focus:ring-4 focus:ring-caramel/10"
                  placeholder="Timing, delivery area, cake ideas or ingredient questions"
                />
              </div>

              <p className="rounded-2xl bg-caramel/5 p-4 text-xs leading-5 text-muted">
                No payment is collected here. The bakery will review your request and confirm availability and final details with you.
              </p>

              {orderError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{orderError}</p>}
            </form>
          )}
        </div>

        {!orderSuccess && cart.length > 0 && (
          <div className="border-t border-border bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-5">
            {!isCheckoutMode && (
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted">Subtotal</span>
                <span className="font-serif text-2xl font-semibold text-espresso">₹{cartTotal}</span>
              </div>
            )}
            {!isCheckoutMode ? (
              <button
                type="button"
                onClick={() => { setOrderError(''); setIsCheckoutMode(true); }}
                className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-espresso px-5 text-sm font-semibold text-white shadow-lg shadow-espresso/15 transition-colors hover:bg-espresso-light"
              >
                Review your order
                <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting}
                className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-espresso px-5 text-sm font-semibold text-white shadow-lg shadow-espresso/15 transition-colors hover:bg-espresso-light disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? 'Sending your request…' : 'Place order · ₹' + cartTotal}
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
