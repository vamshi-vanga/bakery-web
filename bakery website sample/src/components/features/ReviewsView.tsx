'use client';

import React, { useState } from 'react';
import { Star, PlusCircle, X } from 'lucide-react';
import { Review } from '@/types';
import { Glass, inputCls } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';

interface ReviewsViewProps {
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
}

export default function ReviewsView({
  reviews,
  setReviews,
}: ReviewsViewProps) {
  const { mode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  const [starFilter, setStarFilter] = useState<number | 'ALL'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customer_name: '', rating: 5, comment: '', item_mentions: '' });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const items = form.item_mentions
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.customer_name,
          rating: Number(form.rating),
          comment: form.comment,
          item_mentions: items,
        }),
      });

      const data = await res.json();
      if (res.ok && data.review) {
        setReviews((prev) => [data.review, ...prev]);
        setShowModal(false);
        setForm({ customer_name: '', rating: 5, comment: '', item_mentions: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredReviews = reviews.filter(
    (r) => starFilter === 'ALL' || r.rating === starFilter
  );

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
              Customer Sentiment
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>• Verified Patron Reviews</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Customer Feedback & Ratings
          </h1>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
        >
          <PlusCircle className="w-4 h-4" /> Log Customer Review
        </button>
      </div>

      {/* Aggregate Rating Hero */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Glass isLight={isLight} className="p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <span className="text-3xl font-serif font-black text-amber-500">{avgRating}</span>
          </div>
          <div>
            <div className="flex items-center gap-1 text-amber-400 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(Number(avgRating)) ? 'fill-amber-400' : 'text-gray-600'}`}
                />
              ))}
            </div>
            <p className="text-xs font-bold text-gray-400">Average Customer Score</p>
            <p className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Based on {reviews.length} reviews</p>
          </div>
        </Glass>

        <Glass isLight={isLight} className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xl">
            96%
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Positive Sentiment</p>
            <p className="text-xs text-emerald-400 font-medium">4★ & 5★ ratings</p>
          </div>
        </Glass>

        <Glass isLight={isLight} className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-xl">
            Top
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Most Praised Item</p>
            <p className="text-xs text-indigo-400 font-bold">Almond Croissant & Cheesecake</p>
          </div>
        </Glass>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {(['ALL', 5, 4, 3] as const).map((star) => (
          <button
            key={String(star)}
            onClick={() => setStarFilter(star)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              starFilter === star
                ? 'bg-amber-500 text-black'
                : isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-gray-400'
            }`}
          >
            {star === 'ALL' ? 'All Ratings' : `${star} Stars`}
          </button>
        ))}
      </div>

      {/* Reviews Stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredReviews.map((rev) => (
          <Glass key={rev.id} isLight={isLight} className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                  {rev.customer_name[0] || 'C'}
                </div>
                <div>
                  <h4 className="text-xs font-bold">{rev.customer_name}</h4>
                  <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Recent Customer'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400' : 'text-gray-700'}`}
                  />
                ))}
              </div>
            </div>

            <p className={`text-xs leading-relaxed italic ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
              &ldquo;{rev.comment}&rdquo;
            </p>

            {rev.item_mentions && rev.item_mentions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {rev.item_mentions.map((it) => (
                  <span
                    key={it}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium"
                  >
                    🍰 {it}
                  </span>
                ))}
              </div>
            )}
          </Glass>
        ))}
      </div>

      {/* Add Review Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#121214] border-white/10 text-white'}`}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h3 className="font-serif text-lg font-bold">Log Customer Feedback</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Customer Name</label>
                <input
                  required
                  placeholder="e.g. Maya Iyer"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className={inputCls(isLight)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Rating (1 to 5 Stars)</label>
                <select
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                  className={inputCls(isLight)}
                >
                  <option value={5} className="bg-neutral-900 text-white">⭐⭐⭐⭐⭐ (5 Stars)</option>
                  <option value={4} className="bg-neutral-900 text-white">⭐⭐⭐⭐ (4 Stars)</option>
                  <option value={3} className="bg-neutral-900 text-white">⭐⭐⭐ (3 Stars)</option>
                  <option value={2} className="bg-neutral-900 text-white">⭐⭐ (2 Stars)</option>
                  <option value={1} className="bg-neutral-900 text-white">⭐ (1 Star)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Review Comment</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Write the customer's comments..."
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  className={inputCls(isLight)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Item Mentions (Optional, comma separated)</label>
                <input
                  placeholder="e.g. Sourdough, Almond Croissant"
                  value={form.item_mentions}
                  onChange={(e) => setForm({ ...form, item_mentions: e.target.value })}
                  className={inputCls(isLight)}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold"
                >
                  Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
