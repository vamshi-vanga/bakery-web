'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  PlusCircle, Search, Eye, EyeOff, 
  Pencil, Trash2, Star, UploadCloud, X,
  Package
} from 'lucide-react';
import { Dish, Category, SizeVariant } from '@/types';
import { Glass, inputCls } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';

interface MenuViewProps {
  dishes: Dish[];
  categories: Category[];
  setDishes: React.Dispatch<React.SetStateAction<Dish[]>>;
}

export default function MenuView({
  dishes,
  categories,
  setDishes,
}: MenuViewProps) {
  const { mode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    subcategory: string;
    description: string;
    price: string;
    image_url: string;
    popular: boolean;
    available: boolean;
    track_inventory: boolean;
    stock_quantity: string;
    low_stock_threshold: string;
    pricing_type: 'quantity' | 'weight';
    size_variants: SizeVariant[];
  }>({
    name: '',
    category: categories[0]?.name || 'Pastries & Breads',
    subcategory: '',
    description: '',
    price: '',
    image_url: '',
    popular: false,
    available: true,
    track_inventory: true,
    stock_quantity: '12',
    low_stock_threshold: '5',
    pricing_type: 'quantity',
    size_variants: [],
  });

  const [customSizeInput, setCustomSizeInput] = useState('');
  const [customSizePrice, setCustomSizePrice] = useState('');

  const addPresetSize = (sizeName: string) => {
    setFormData((prev) => {
      if (prev.size_variants.some((v) => v.size.toLowerCase() === sizeName.toLowerCase())) return prev;
      const base = Number(prev.price) || 450;
      let calculatedPrice = base;
      if (sizeName.includes('500g') || sizeName.includes('Half Kg')) calculatedPrice = base;
      else if (sizeName.includes('1.5 kg')) calculatedPrice = Math.round(base * 2.6);
      else if (sizeName.includes('1 kg') && !sizeName.includes('Tin')) calculatedPrice = Math.round(base * 1.85);
      else if (sizeName.includes('2 kg')) calculatedPrice = Math.round(base * 3.4);
      else if (sizeName.includes('3 kg')) calculatedPrice = Math.round(base * 5.0);
      else if (sizeName.includes('5 kg')) calculatedPrice = Math.round(base * 8.0);
      else if (sizeName.includes('180g') || sizeName.includes('Slice')) calculatedPrice = Math.max(50, Math.round(base * 0.22));
      else if (sizeName.includes('250g')) calculatedPrice = Math.max(60, Math.round(base * 0.55));
      else if (sizeName.includes('Tin') || sizeName.includes('1 kg Tin')) calculatedPrice = Math.round(base * 1.9);
      else if (sizeName.includes('Pack of 2')) calculatedPrice = Math.round(base * 1.9);
      else if (sizeName.includes('Pack of 4') || sizeName.includes('Box of 4')) calculatedPrice = Math.round(base * 3.6);
      else if (sizeName.includes('Pack of 6') || sizeName.includes('Party Box')) calculatedPrice = Math.round(base * 5.2);
      else if (sizeName.includes('Ladi of 6')) calculatedPrice = 35;
      else if (sizeName.includes('Thermal Flask')) calculatedPrice = Math.round(base * 2.6);

      const isFirst = prev.size_variants.length === 0;
      const newVariants = [...prev.size_variants, { size: sizeName, price: calculatedPrice, is_default: isFirst }];
      return {
        ...prev,
        size_variants: newVariants,
        price: isFirst ? String(calculatedPrice) : prev.price,
      };
    });
  };

  const addCustomSizeVariant = () => {
    const trimmed = customSizeInput.trim();
    if (!trimmed) {
      alert('Enter a size name (e.g. 750g or 4 kg)');
      return;
    }
    const priceNum = Number(customSizePrice) || Number(formData.price) || 450;
    setFormData((prev) => {
      if (prev.size_variants.some((v) => v.size.toLowerCase() === trimmed.toLowerCase())) {
        alert('This size variant already exists.');
        return prev;
      }
      const isFirst = prev.size_variants.length === 0;
      return {
        ...prev,
        size_variants: [...prev.size_variants, { size: trimmed, price: priceNum, is_default: isFirst }],
        price: isFirst ? String(priceNum) : prev.price,
      };
    });
    setCustomSizeInput('');
    setCustomSizePrice('');
  };

  const removeSizeVariant = (index: number) => {
    setFormData((prev) => {
      const updated = prev.size_variants.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((v) => v.is_default)) {
        updated[0].is_default = true;
      }
      return {
        ...prev,
        size_variants: updated,
        price: updated[0] ? String(updated[0].price) : prev.price,
      };
    });
  };

  const updateSizeVariantName = (index: number, newName: string) => {
    setFormData((prev) => {
      const updated = prev.size_variants.map((v, i) => (i === index ? { ...v, size: newName } : v));
      return { ...prev, size_variants: updated };
    });
  };

  const updateSizeVariantPrice = (index: number, newPrice: number) => {
    setFormData((prev) => {
      const updated = prev.size_variants.map((v, i) => (i === index ? { ...v, price: Math.max(0, newPrice) } : v));
      const defaultVariant = updated.find((v) => v.is_default) || updated[0];
      return {
        ...prev,
        size_variants: updated,
        price: defaultVariant ? String(defaultVariant.price) : prev.price,
      };
    });
  };

  const setDefaultSizeVariant = (index: number) => {
    setFormData((prev) => {
      const updated = prev.size_variants.map((v, i) => ({ ...v, is_default: i === index }));
      const target = updated[index];
      return {
        ...prev,
        size_variants: updated,
        price: target ? String(target.price) : prev.price,
      };
    });
  };

  const openAddModal = () => {
    setEditingDish(null);
    setFormData({
      name: '',
      category: categories[0]?.name || 'Pastries & Breads',
      subcategory: '',
      description: '',
      price: '',
      image_url: '',
      popular: false,
      available: true,
      track_inventory: true,
      stock_quantity: '12',
      low_stock_threshold: '5',
      pricing_type: 'quantity',
      size_variants: [],
    });
    setCustomSizeInput('');
    setCustomSizePrice('');
    setShowModal(true);
  };

  const openEditModal = (dish: Dish) => {
    setEditingDish(dish);
    const hasVariants = Boolean(dish.size_variants && dish.size_variants.length > 0);
    setFormData({
      name: dish.name,
      category: dish.category,
      subcategory: dish.subcategory || '',
      description: dish.description,
      price: String(dish.price),
      image_url: dish.image_url,
      popular: dish.popular,
      available: dish.available,
      track_inventory: dish.track_inventory !== false,
      stock_quantity: String(dish.stock_quantity ?? 12),
      low_stock_threshold: String(dish.low_stock_threshold ?? 5),
      pricing_type: dish.pricing_type || (hasVariants ? 'weight' : 'quantity'),
      size_variants: dish.size_variants ? [...dish.size_variants] : [],
    });
    setCustomSizeInput('');
    setCustomSizePrice('');
    setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    try {
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer 779911' },
        body: data,
      });

      const json = await res.json();
      if (json.url) {
        setFormData((prev) => ({ ...prev, image_url: json.url }));
      } else {
        alert('Upload failed: ' + (json.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image_url) return alert('Please upload an item image or provide an image URL.');

    try {
      const finalPrice =
        formData.pricing_type === 'weight' && formData.size_variants.length > 0
          ? (formData.size_variants.find((v) => v.is_default)?.price || formData.size_variants[0].price || Number(formData.price))
          : Number(formData.price);

      const payload = {
        name: formData.name,
        category: formData.category,
        subcategory: formData.subcategory || null,
        description: formData.description,
        price: finalPrice,
        image_url: formData.image_url,
        popular: formData.popular,
        available: formData.available,
        track_inventory: formData.track_inventory,
        stock_quantity: formData.track_inventory ? Math.max(0, Number(formData.stock_quantity) || 0) : 0,
        low_stock_threshold: formData.track_inventory ? Math.max(1, Number(formData.low_stock_threshold) || 5) : 0,
        pricing_type: formData.pricing_type,
        size_variants: formData.pricing_type === 'weight' ? formData.size_variants : [],
        branch_id: null,
      };

      const url = editingDish ? `/api/menu/${editingDish.id}` : '/api/menu';
      const method = editingDish ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 779911' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (res.ok) {
        if (editingDish) {
          setDishes((prev) => prev.map((d) => (d.id === editingDish.id ? { ...d, ...payload } : d)));
        } else if (resJson.item) {
          setDishes((prev) => [resJson.item, ...prev]);
        }
        setShowModal(false);
      } else {
        alert('Failed to save item: ' + (resJson.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error saving product.');
    }
  };

  const toggleAvailability = async (dish: Dish) => {
    try {
      const newAvail = !dish.available;
      await fetch(`/api/menu/${dish.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 779911' },
        body: JSON.stringify({ available: newAvail }),
      });
      setDishes((prev) => prev.map((d) => (d.id === dish.id ? { ...d, available: newAvail } : d)));
    } catch (err) {
      console.error(err);
    }
  };

  const togglePopular = async (dish: Dish) => {
    try {
      const newPop = !dish.popular;
      await fetch(`/api/menu/${dish.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 779911' },
        body: JSON.stringify({ popular: newPop }),
      });
      setDishes((prev) => prev.map((d) => (d.id === dish.id ? { ...d, popular: newPop } : d)));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteDish = async (dish: Dish) => {
    if (!confirm(`Delete "${dish.name}" from catalog?`)) return;
    try {
      const res = await fetch(`/api/menu/${dish.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer 779911' },
      });
      if (res.ok) {
        setDishes((prev) => prev.filter((d) => d.id !== dish.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDishes = dishes.filter((dish) => {
    const catMatch = activeCategory === 'ALL' || dish.category === activeCategory;
    const searchMatch =
      !search ||
      dish.name.toLowerCase().includes(search.toLowerCase()) ||
      dish.description.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-0.5 rounded-full border"
              style={{ backgroundColor: themeConfig.light, borderColor: themeConfig.border, color: themeConfig.primary }}
            >
              Catalog Control
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>• Menu Items & Pricing</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Menu Management
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search catalog..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls(isLight)} pl-10`}
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shrink-0 transition-all shadow-lg shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === 'ALL'
              ? 'bg-amber-500 text-black'
              : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          All Items ({dishes.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.name)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeCategory === c.name
                ? 'bg-amber-500 text-black'
                : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDishes.map((dish) => (
          <Glass
            key={dish.id}
            isLight={isLight}
            className={`overflow-hidden flex flex-col justify-between transition-all duration-300 ${
              !dish.available ? 'opacity-60 grayscale-[40%]' : ''
            }`}
          >
            <div>
              {/* Image Banner */}
              <div className="relative h-48 w-full bg-neutral-900 overflow-hidden">
                {dish.image_url ? (
                  <Image
                    src={dish.image_url}
                    alt={dish.name}
                    fill
                    sizes="350px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🥐</div>
                )}

                {/* Popular Star Badge */}
                {dish.popular && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg">
                    <Star className="w-3 h-3 fill-black" /> Chef&apos;s Pick
                  </span>
                )}

                {/* Price Tag */}
                <span className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md px-3 py-1 rounded-xl text-sm font-mono font-black text-amber-400">
                  {dish.pricing_type === 'weight' && dish.size_variants && dish.size_variants.length > 0
                    ? `From ₹${Math.min(...dish.size_variants.map((v) => v.price))}`
                    : `₹${dish.price}`}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                    {dish.category}
                  </span>
                  {dish.subcategory && (
                    <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                      {dish.subcategory}
                    </span>
                  )}
                </div>

                <h3 className={`font-serif text-base font-bold line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {dish.name}
                </h3>

                <p className={`text-xs line-clamp-2 leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  {dish.description}
                </p>

                {/* Cake Sizes & Weight Variants Badge */}
                {dish.pricing_type === 'weight' && dish.size_variants && dish.size_variants.length > 0 && (
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                      🎂 {dish.size_variants.length} Sizes: {dish.size_variants.map((v) => v.size).join(' • ')}
                    </span>
                  </div>
                )}

                {/* Stock Tracking Badge */}
                <div className="pt-1 flex items-center gap-2">
                  {dish.track_inventory === false ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                      <span>♾️</span> Made to Order • Untracked
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      (Number(dish.stock_quantity) || 0) <= (Number(dish.low_stock_threshold) || 5)
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 font-bold'
                        : isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-gray-400 border-white/10'
                    }`}>
                      <Package className="w-3 h-3 text-amber-500" />
                      <span>Stock: {dish.stock_quantity ?? 0}</span>
                      {(Number(dish.stock_quantity) || 0) <= (Number(dish.low_stock_threshold) || 5) && (
                        <span className="text-[9px] uppercase font-bold text-amber-500">• Low</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className={`p-4 border-t ${isLight ? 'border-slate-100' : 'border-white/5'} flex items-center justify-between gap-2`}>
              <div className="flex items-center gap-2">
                {/* Availability switch */}
                <button
                  type="button"
                  onClick={() => toggleAvailability(dish)}
                  title={dish.available ? 'In Stock (Click to mark Sold Out)' : 'Sold Out (Click to mark In Stock)'}
                  className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-bold ${
                    dish.available
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  {dish.available ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span className="text-[10px] uppercase">{dish.available ? 'In Stock' : 'Sold Out'}</span>
                </button>

                {/* Star toggle */}
                <button
                  type="button"
                  onClick={() => togglePopular(dish)}
                  title="Toggle Chef's Pick"
                  className={`p-1.5 rounded-lg border ${
                    dish.popular
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white/5 border-white/10 text-gray-500'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${dish.popular ? 'fill-amber-400' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditModal(dish)}
                  className={`p-1.5 rounded-lg border ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200' : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteDish(dish)}
                  className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Glass>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div
            className={`max-w-4xl w-full rounded-3xl p-5 sm:p-7 border shadow-2xl my-6 transition-all ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#121215] border-white/10 text-white'
            }`}
          >
            {/* Modal Title Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                  {editingDish ? 'Catalog Update' : 'New Creation'}
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-black">
                  {editingDish ? `Edit: ${editingDish.name}` : 'Add New Bakery Product'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`p-2 rounded-xl border transition-colors ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500' : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LIVE PRODUCT INFO SNAPSHOT ON TOP */}
            <div
              className={`mt-4 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                isLight ? 'bg-amber-50/70 border-amber-200/80' : 'bg-amber-500/5 border-amber-500/20'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-neutral-900 border border-amber-500/30 shrink-0 shadow-md">
                  {formData.image_url ? (
                    <Image src={formData.image_url} alt="Preview" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      {formData.pricing_type === 'weight' ? '🎂' : '🥐'}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black">
                      {formData.category || 'Category'}
                    </span>
                    {formData.subcategory && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isLight ? 'bg-white border-amber-200 text-amber-900' : 'bg-white/5 border-white/10 text-gray-300'
                      }`}>
                        {formData.subcategory}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      formData.pricing_type === 'weight'
                        ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                        : isLight ? 'bg-slate-200 border-slate-300 text-slate-700' : 'bg-white/5 border-white/10 text-gray-400'
                    }`}>
                      {formData.pricing_type === 'weight'
                        ? `🎂 ${formData.size_variants.length} Weight Sizes`
                        : '🥐 Standard Piece'}
                    </span>
                  </div>

                  <h4 className="font-serif text-base sm:text-lg font-black truncate max-w-md">
                    {formData.name || 'Untitled Product (Enter name below)'}
                  </h4>

                  <p className={`text-xs truncate max-w-md ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    {formData.description || 'Artisanal bake crafted with gourmet ingredients.'}
                  </p>
                </div>
              </div>

              {/* Price & Stock Overview on Top */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-amber-500/20 shrink-0">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Live Pricing
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-amber-500">
                  {formData.pricing_type === 'weight' && formData.size_variants.length > 0
                    ? `From ₹${Math.min(...formData.size_variants.map((v) => v.price))}`
                    : `₹${formData.price || 0}`}
                </span>
                <span className={`text-[10px] font-bold ${
                  formData.track_inventory ? 'text-emerald-500' : 'text-sky-400'
                }`}>
                  {formData.track_inventory ? `Shelf Stock: ${formData.stock_quantity || 0}` : '♾️ Made to Order'}
                </span>
              </div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT COLUMN: CORE PRODUCT DETAILS */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 text-[11px] font-black flex items-center justify-center">1</span>
                    <h4 className="font-serif font-bold text-sm">Product Identity & Ingredients</h4>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Product Title
                    </label>
                    <input
                      required
                      placeholder="e.g. Belgian Truffle Opera Cake"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`${inputCls(isLight)} !py-2.5`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className={`${inputCls(isLight)} !py-2.5`}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name} className="bg-neutral-900 text-white">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Subcategory (Optional)
                      </label>
                      <input
                        placeholder="e.g. Layer Cakes"
                        value={formData.subcategory}
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                        className={`${inputCls(isLight)} !py-2.5`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Description & Flavor Profile
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Rich almond sponge soaked in espresso, dark chocolate ganache..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`${inputCls(isLight)} resize-none`}
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Product Image
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 text-xs font-bold cursor-pointer transition-colors shrink-0">
                        <UploadCloud className="w-4 h-4" />
                        <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                      <input
                        placeholder="or paste image URL..."
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className={`${inputCls(isLight)} !py-2 text-xs flex-1`}
                      />
                    </div>
                  </div>

                  {/* INVENTORY TRACKING CHOICE */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      formData.track_inventory
                        ? isLight ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-500/5 border-amber-500/20'
                        : isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-amber-500" />
                          <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Shelf Stock & Tracking
                          </span>
                        </div>
                        <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                          {formData.track_inventory
                            ? 'Stock count tracked on display case.'
                            : 'Made-to-order (Always in stock).'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, track_inventory: !prev.track_inventory }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          formData.track_inventory ? 'bg-amber-500' : isLight ? 'bg-slate-300' : 'bg-white/20'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            formData.track_inventory ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {formData.track_inventory && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-amber-500/20">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                            Current Stock
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.stock_quantity}
                            onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                            className={`${inputCls(isLight)} !py-1.5 text-xs font-mono`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                            Low Alert At
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.low_stock_threshold}
                            onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                            className={`${inputCls(isLight)} !py-1.5 text-xs font-mono`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chef's Pick & In Stock */}
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.popular}
                        onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                        className="w-4 h-4 rounded accent-amber-500"
                      />
                      <span>Chef&apos;s Pick (Star)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.available}
                        onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                        className="w-4 h-4 rounded accent-emerald-500"
                      />
                      <span>In Stock</span>
                    </label>
                  </div>
                </div>

                {/* RIGHT COLUMN: PRICING & WEIGHT/SIZE ARCHITECTURE */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 text-[11px] font-black flex items-center justify-center">2</span>
                    <h4 className="font-serif font-bold text-sm">Pricing Model & Cake Sizes</h4>
                  </div>

                  {/* Mode Selector Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, pricing_type: 'quantity' }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        formData.pricing_type === 'quantity'
                          ? 'border-amber-500 bg-amber-500/10 shadow-md ring-1 ring-amber-500/30'
                          : isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl block mb-1">🥐</span>
                      <p className={`text-xs font-black ${formData.pricing_type === 'quantity' ? 'text-amber-500' : isLight ? 'text-slate-900' : 'text-white'}`}>
                        Standard Piece
                      </p>
                      <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        Single fixed price per item
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => {
                          const base = Number(prev.price) || 450;
                          const existingVariants =
                            prev.size_variants && prev.size_variants.length > 0
                              ? prev.size_variants
                              : [
                                  { size: '500g', price: base, is_default: true },
                                  { size: '1 kg', price: Math.round(base * 1.85), is_default: false },
                                  { size: '2 kg', price: Math.round(base * 3.4), is_default: false },
                                ];
                          return {
                            ...prev,
                            pricing_type: 'weight',
                            size_variants: existingVariants,
                            price: String(existingVariants[0]?.price || prev.price),
                          };
                        });
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        formData.pricing_type === 'weight'
                          ? 'border-amber-500 bg-amber-500/10 shadow-md ring-1 ring-amber-500/30'
                          : isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl block mb-1">🎂</span>
                      <p className={`text-xs font-black ${formData.pricing_type === 'weight' ? 'text-amber-500' : isLight ? 'text-slate-900' : 'text-white'}`}>
                        Weight & Cake Sizes
                      </p>
                      <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        500g, 1 kg, 2 kg with custom pricing
                      </p>
                    </button>
                  </div>

                  {/* STANDARD PRICE FIELD */}
                  {formData.pricing_type === 'quantity' && (
                    <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                        Item Price (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-amber-500">₹</span>
                        <input
                          required
                          type="number"
                          min="1"
                          placeholder="220"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className={`${inputCls(isLight)} !pl-8 text-base font-mono font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        />
                      </div>
                      <p className={`text-[11px] mt-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        Each unit added to cart or POS counter ticket is charged at this exact price.
                      </p>
                    </div>
                  )}

                  {/* WEIGHT & CAKE SIZES MANAGER */}
                  {formData.pricing_type === 'weight' && (
                    <div className="space-y-3.5">
                      {/* Quick Add Presets */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                          Quick-Add Standard Cake Sizes
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            '500g (Half Kg)',
                            '1 kg',
                            '1.5 kg',
                            '2 kg',
                            '3 kg',
                            'Pastry Slice (180g)',
                            'Box of 250g',
                            'Box of 500g',
                            '1 kg Tin',
                            'Pack of 2',
                            'Pack of 4',
                            'Ladi of 6 Pav',
                            'Thermal Flask (500ml)',
                          ].map((preset) => {
                            const alreadyAdded = formData.size_variants.some(
                              (v) => v.size.toLowerCase() === preset.toLowerCase()
                            );
                            return (
                              <button
                                key={preset}
                                type="button"
                                disabled={alreadyAdded}
                                onClick={() => addPresetSize(preset)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                  alreadyAdded
                                    ? 'opacity-30 cursor-not-allowed bg-transparent border-gray-600 text-gray-500'
                                    : isLight
                                      ? 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100 shadow-sm active:scale-95'
                                      : 'bg-black/40 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 active:scale-95'
                                }`}
                              >
                                + {preset}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Configured Sizes List (Spacious, Clear, Editable Label and Price) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Active Sizes & Exact Prices
                          </label>
                          <span className="text-[10px] font-bold text-amber-400">
                            {formData.size_variants.length} sizes configured
                          </span>
                        </div>

                        {formData.size_variants.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                            <p className="text-xs text-amber-400 font-bold mb-1">No Cake Sizes Added Yet</p>
                            <p className="text-[11px] text-gray-400">
                              Click any of the quick-add buttons above or add a custom size below.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {formData.size_variants.map((variant, idx) => (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                                  variant.is_default
                                    ? isLight ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-amber-500/10 border-amber-500/40'
                                    : isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'
                                }`}
                              >
                                {/* Default Selector Pill */}
                                <button
                                  type="button"
                                  onClick={() => setDefaultSizeVariant(idx)}
                                  title="Click to set as default size for customers"
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                                    variant.is_default
                                      ? 'bg-amber-500 text-black shadow-sm'
                                      : isLight ? 'bg-white text-slate-500 hover:bg-slate-200 border border-slate-200' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                  }`}
                                >
                                  {variant.is_default ? '★ Default' : 'Set Default'}
                                </button>

                                {/* Editable Size Label */}
                                <div className="flex-1 min-w-0">
                                  <input
                                    value={variant.size}
                                    onChange={(e) => updateSizeVariantName(idx, e.target.value)}
                                    placeholder="Size name"
                                    className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border focus:outline-none ${
                                      isLight
                                        ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                                        : 'bg-black/60 border-white/10 text-white focus:border-amber-400'
                                    }`}
                                  />
                                </div>

                                {/* Editable Price with ₹ Symbol (No browser arrows blocking numbers) */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="font-mono text-xs font-bold text-amber-500">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={variant.price}
                                    onChange={(e) => updateSizeVariantPrice(idx, Number(e.target.value) || 0)}
                                    className={`w-28 sm:w-32 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                      isLight
                                        ? 'bg-white border-amber-300 text-slate-900 focus:border-amber-500'
                                        : 'bg-black/70 border-amber-500/30 text-amber-400 focus:border-amber-400'
                                    }`}
                                  />
                                </div>

                                {/* Delete Size */}
                                <button
                                  type="button"
                                  onClick={() => removeSizeVariant(idx)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                                  title="Remove this size"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Custom Size Adder */}
                      <div className={`p-3 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/25 border-white/10'}`}>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                          Add Custom Cake Size / Weight
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            placeholder="e.g. 750g or Half Cake (600g)"
                            value={customSizeInput}
                            onChange={(e) => setCustomSizeInput(e.target.value)}
                            className={`flex-1 ${inputCls(isLight)} !py-2 text-xs`}
                          />
                          <div className="relative w-28 sm:w-32 shrink-0">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500">₹</span>
                            <input
                              type="number"
                              placeholder="Price"
                              value={customSizePrice}
                              onChange={(e) => setCustomSizePrice(e.target.value)}
                              className={`w-full ${inputCls(isLight)} !py-2 !pl-6 text-xs font-mono font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={addCustomSizeVariant}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shrink-0 active:scale-95 shadow-md shadow-amber-500/20"
                          >
                            + Add Size
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="pt-5 border-t border-white/10 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-amber-500/25 active:scale-98"
                >
                  {editingDish ? 'Update Product' : 'Create Bakery Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
