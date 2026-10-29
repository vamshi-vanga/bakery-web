'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  PlusCircle, Pencil, Trash2, UploadCloud, X 
} from 'lucide-react';
import { Category, Dish } from '@/types';
import { Glass, inputCls } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';

interface StructureViewProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  dishes: Dish[];
}

export default function StructureView({
  categories,
  setCategories,
  dishes,
}: StructureViewProps) {
  const { mode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [subcategoriesStr, setSubcategoriesStr] = useState('');

  const openAdd = () => {
    setEditingCategory(null);
    setName('');
    setImageUrl('');
    setSubcategoriesStr('');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setImageUrl(cat.image_url || '');
    setSubcategoriesStr(cat.subcategories?.join(', ') || '');
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
        setImageUrl(json.url);
      } else {
        alert('Upload failed: ' + (json.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading category image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const subs = subcategoriesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const payload = {
        name,
        image_url: imageUrl || null,
        subcategories: subs,
      };

      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 779911' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (res.ok) {
        if (editingCategory) {
          setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? { ...c, ...payload } : c)));
        } else if (resJson.category) {
          setCategories((prev) => [resJson.category, ...prev]);
        }
        setShowModal(false);
      } else {
        alert('Failed to save category: ' + (resJson.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error saving category');
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer 779911' },
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

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
              Taxonomy Architecture
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>• Menu Hierarchy</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Menu Structure & Categories
          </h1>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
        >
          <PlusCircle className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const itemCount = dishes.filter((d) => d.category === cat.name).length;

          return (
            <Glass key={cat.id} isLight={isLight} className="p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/10">
                    {cat.image_url ? (
                      <Image src={cat.image_url} alt={cat.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍰</div>
                    )}
                  </div>
                  <div>
                    <h3 className={`font-serif text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{cat.name}</h3>
                    <p className={`text-xs font-mono font-medium ${isLight ? 'text-slate-400' : 'text-gray-400'}`}>
                      {itemCount} Active Dishes
                    </p>
                  </div>
                </div>

                {/* Subcategories */}
                <div className="space-y-1.5">
                  <p className={`text-[10px] font-extrabold uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                    Sub-classifications
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(cat.subcategories || []).map((sub) => (
                      <span
                        key={sub}
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${
                          isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                      >
                        {sub}
                      </span>
                    ))}
                    {(!cat.subcategories || cat.subcategories.length === 0) && (
                      <span className="text-[11px] text-gray-500 italic">No subcategories defined</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className={`pt-4 border-t ${isLight ? 'border-slate-100' : 'border-white/5'} flex items-center justify-end gap-2`}>
                <button
                  onClick={() => openEdit(cat)}
                  className={`p-2 rounded-xl border ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200' : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Glass>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#121214] border-white/10 text-white'}`}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h3 className="font-serif text-lg font-bold">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Category Name</label>
                <input
                  required
                  placeholder="e.g. Artisanal Breads"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls(isLight)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Subcategories (comma separated)
                </label>
                <input
                  placeholder="e.g. Sourdough, Baguettes, Brioche"
                  value={subcategoriesStr}
                  onChange={(e) => setSubcategoriesStr(e.target.value)}
                  className={inputCls(isLight)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Cover Image</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 text-xs font-bold cursor-pointer transition-colors">
                    <UploadCloud className="w-4 h-4" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <input
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className={`${inputCls(isLight)} mt-2`}
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
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
