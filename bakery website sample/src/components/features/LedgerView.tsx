'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  ShoppingCart, Search, Plus, Minus, Trash2, 
  CreditCard, QrCode, Banknote, ArrowRight, X
} from 'lucide-react';
import { Dish, Category, LedgerEntry, OrderItem, SizeVariant } from '@/types';
import { Glass, inputCls } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';

interface LedgerViewProps {
  dishes: Dish[];
  categories: Category[];
  ledger: LedgerEntry[];
  setLedger: React.Dispatch<React.SetStateAction<LedgerEntry[]>>;
}

export default function LedgerView({
  dishes,
  categories,
  ledger,
  setLedger,
}: LedgerViewProps) {
  const { mode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [posCart, setPosCart] = useState<OrderItem[]>([]);
  
  // Checkout metadata
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery' | 'pos'>('pos');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sizingModalDish, setSizingModalDish] = useState<Dish | null>(null);

  const handleDishClick = (dish: Dish) => {
    if (dish.pricing_type === 'weight' && dish.size_variants && dish.size_variants.length > 0) {
      setSizingModalDish(dish);
    } else {
      addToCart(dish);
    }
  };

  const addToCart = (dish: Dish, selectedVariant?: SizeVariant) => {
    const sizeName = selectedVariant?.size || (dish.pricing_type === 'weight' ? dish.size_variants?.[0]?.size : undefined);
    const itemPrice = selectedVariant?.price || (dish.pricing_type === 'weight' && dish.size_variants?.[0]?.price) || dish.price;
    const cartItemId = sizeName ? `${dish.id}__${sizeName}` : dish.id;

    setPosCart((prev) => {
      const existing = prev.find((i) => i.id === cartItemId);
      if (existing) {
        return prev.map((i) =>
          i.id === cartItemId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          id: cartItemId,
          name: dish.name,
          price: itemPrice,
          quantity: 1,
          image_url: dish.image_url,
          selected_size: sizeName || undefined,
        },
      ];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((i) => (i.id === cartItemId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setPosCart((prev) => prev.filter((i) => i.id !== cartItemId));
  };

  const subtotal = posCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const grandTotal = subtotal + tax;

  const handleChargeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (posCart.length === 0) return alert('Cart is empty. Select items to charge.');
    setIsSubmitting(true);

    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        items: posCart,
        total: grandTotal,
        status: 'preparing',
        table_number: tableNumber || null,
        order_type: orderType,
        payment_method: paymentMethod,
        branch_id: null,
        branch_name: 'Main Bakery',
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setLedger((prev) => [data.order, ...prev]);
        setPosCart([]);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setTableNumber('');
      } else {
        alert('Failed to place POS order: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error charging order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDishes = dishes.filter((dish) => {
    const catMatch = activeCategory === 'ALL' || dish.category === activeCategory;
    const searchMatch = !search || dish.name.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-0.5 rounded-full border"
              style={{ backgroundColor: themeConfig.light, borderColor: themeConfig.border, color: themeConfig.primary }}
            >
              Point of Sale
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>• High-Speed Cashier Terminal</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            POS Terminal & Billing
          </h1>
        </div>
      </div>

      {/* POS TWO-PANEL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category Tabs & Search Bar */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search products, breads, coffees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputCls(isLight)} pl-10`}
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              <button
                onClick={() => setActiveCategory('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeCategory === 'ALL'
                    ? 'bg-amber-500 text-black'
                    : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                All Items
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeCategory === cat.name
                      ? 'bg-amber-500 text-black'
                      : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dish Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {filteredDishes.map((dish) => {
              const hasVariants = dish.pricing_type === 'weight' && dish.size_variants && dish.size_variants.length > 0;
              const displayPrice = hasVariants
                ? Math.min(...dish.size_variants!.map((v) => v.price))
                : dish.price;

              return (
                <div
                  key={dish.id}
                  onClick={() => handleDishClick(dish)}
                  className={`group p-3 rounded-2xl border cursor-pointer select-none transition-all duration-200 flex flex-col justify-between ${
                    isLight
                      ? 'bg-white hover:bg-amber-500/5 hover:border-amber-500/40 border-slate-200 shadow-sm'
                      : 'bg-[#121214] hover:bg-[#18181B] hover:border-amber-500/40 border-white/5'
                  }`}
                >
                  <div className="relative h-28 w-full rounded-xl overflow-hidden mb-2.5 bg-neutral-900">
                    {dish.image_url ? (
                      <Image
                        src={dish.image_url}
                        alt={dish.name}
                        fill
                        sizes="200px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🧁</div>
                    )}
                    <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md font-mono text-xs font-black text-amber-400">
                      {hasVariants ? `From ₹${displayPrice}` : `₹${dish.price}`}
                    </span>
                    {hasVariants && (
                      <span className="absolute top-2 left-2 bg-amber-500 text-black px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                        🎂 Sizes
                      </span>
                    )}
                  </div>

                  <div>
                    <p className={`text-xs font-bold line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {dish.name}
                    </p>
                    <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                      {hasVariants ? `${dish.size_variants!.length} sizes available` : dish.category}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Order Ticket & Checkout (5 cols) */}
        <div className="lg:col-span-5">
          <Glass isLight={isLight} className="p-6 sticky top-20 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-amber-500" />
                  <h3 className="font-serif text-lg font-bold">Current Ticket</h3>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold">
                  {posCart.reduce((s, i) => s + i.quantity, 0)} Items
                </span>
              </div>

              {/* Cart Items List */}
              <div className="space-y-3 my-4 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                {posCart.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#18181B]/60 border-white/5'
                    }`}
                  >
                    <div className="truncate max-w-[150px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold truncate">{item.name}</p>
                        {item.selected_size && (
                          <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {item.selected_size}
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-gray-400">₹{item.price} each</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-black/20 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id || item.name, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-bold w-5 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id || item.name, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-xs text-amber-500"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-mono text-xs font-black min-w-[50px] text-right">
                        ₹{item.price * item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id || item.name)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {posCart.length === 0 && (
                  <div className="py-10 text-center text-gray-500 text-xs font-mono">
                    Tap dishes on the left to add items to ticket.
                  </div>
                )}
              </div>

              {/* Order Meta Inputs */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                {/* Order Type Selector */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(['pos', 'takeaway', 'delivery'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOrderType(t)}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold uppercase transition-all ${
                        orderType === t
                          ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                          : isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-gray-400'
                      }`}
                    >
                      {t === 'pos' ? 'Counter' : t}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={inputCls(isLight)}
                  />
                  <input
                    placeholder="Table / Token #"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className={inputCls(isLight)}
                  />
                </div>

                {/* Payment Methods */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">Payment Mode</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['upi', 'cash', 'card'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${
                          paymentMethod === m
                            ? 'bg-amber-500 text-black border-amber-500 shadow-md'
                            : isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                      >
                        {m === 'upi' && <QrCode className="w-3.5 h-3.5" />}
                        {m === 'cash' && <Banknote className="w-3.5 h-3.5" />}
                        {m === 'card' && <CreditCard className="w-3.5 h-3.5" />}
                        <span>{m}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-1.5 pt-4 border-t border-white/5 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>GST (5%)</span>
                  <span className="font-mono">₹{tax}</span>
                </div>
                <div className="flex justify-between text-base font-black pt-2 border-t border-white/5">
                  <span>Total Amount</span>
                  <span className="text-emerald-500 font-mono text-lg">₹{grandTotal}</span>
                </div>
              </div>
            </div>

            {/* Charge Button */}
            <button
              onClick={handleChargeOrder}
              disabled={isSubmitting || posCart.length === 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Punching Order...</span>
              ) : (
                <>
                  <span>Charge ₹{grandTotal}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </Glass>
        </div>
      </div>

      {/* POS Cake Weight / Size Selector Modal */}
      {sizingModalDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#18181B] border-white/10 text-white'
            }`}
          >
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                  Select Cake Weight / Size
                </span>
                <h4 className="font-serif font-black text-lg">{sizingModalDish.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSizingModalDish(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              Choose the size requested by the customer to add to this counter ticket:
            </p>

            <div className="space-y-2.5">
              {sizingModalDish.size_variants?.map((v) => (
                <button
                  key={v.size}
                  type="button"
                  onClick={() => {
                    addToCart(sizingModalDish, v);
                    setSizingModalDish(null);
                  }}
                  className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all group active:scale-[0.99] ${
                    isLight
                      ? 'bg-slate-50 hover:bg-amber-50 hover:border-amber-400 border-slate-200'
                      : 'bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/40 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{v.size}</span>
                    {v.is_default && (
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-black text-base text-amber-400 group-hover:scale-105 transition-transform">
                    ₹{v.price}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
              <button
                type="button"
                onClick={() => setSizingModalDish(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
