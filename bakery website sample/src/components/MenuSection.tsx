'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, LayoutGrid, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import DishCard from './DishCard';
import ItemDetailModal from './ItemDetailModal';
import { cn } from '@/lib/utils';
import type { MenuItem, Category } from '@/lib/types';
import { SAMPLE_CATEGORIES, SAMPLE_MENU } from '@/data/mockMenu';

export default function MenuSection() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, catsRes] = await Promise.all([
          fetch('/api/menu').then((r) => r.json()).catch(() => null),
          fetch('/api/categories').then((r) => r.json()).catch(() => null),
        ]);

        const items = Array.isArray(itemsRes) && itemsRes.length > 0 ? itemsRes : null;
        const cats = Array.isArray(catsRes) && catsRes.length > 0 ? catsRes : null;

        if (items) {
          setMenuItems(items.filter((i: MenuItem) => i.available !== false));
        } else {
          setMenuItems(SAMPLE_MENU);
        }

        if (cats) {
          setCategories(cats);
        } else {
          setCategories(SAMPLE_CATEGORIES);
        }
      } catch (error) {
        console.error('Error fetching menu data:', error);
        setMenuItems(SAMPLE_MENU);
        setCategories(SAMPLE_CATEGORIES);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMenu = menuItems.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch =
      !normalizedQuery ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      (item.description || '').toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesSearch;
  });

  const featuredItems = normalizedQuery ? [] : filteredMenu.filter((item) => item.popular).slice(0, 3);
  const featuredIds = new Set(featuredItems.map((item) => item.id));
  const remainingItems = filteredMenu.filter((item) => !featuredIds.has(item.id));
  const groupedItems = remainingItems.reduce((groups, item) => {
    const category = item.category || 'More to explore';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {} as Record<string, MenuItem[]>);
  const groupedEntries = Object.entries(groupedItems).sort(([first], [second]) => {
    const firstOrder = categories.findIndex((category) => category.name === first);
    const secondOrder = categories.findIndex((category) => category.name === second);
    return (firstOrder === -1 ? categories.length : firstOrder) - (secondOrder === -1 ? categories.length : secondOrder);
  });

  return (
    <>
      <section id="menu" className="scroll-mt-20 bg-[#f6efe6] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-9 grid gap-5 sm:mb-12 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-caramel-dark">
                <span className="h-px w-7 bg-caramel" />
                From our menu
              </p>
              <h2 className="font-serif text-4xl font-medium tracking-tight text-espresso sm:text-5xl">A table full of treats</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-charcoal-light sm:text-base">
                Take a look around, find what sounds good and choose the size that suits your moment.
              </p>
            </div>
            <div className="hidden items-center gap-2 pb-1 text-xs font-medium text-muted sm:flex">
              <Sparkles className="h-4 w-4 text-caramel" aria-hidden="true" />
              Made for your next little celebration
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-espresso/5 bg-white/75 p-3 shadow-sm sm:p-4">
            <label className="relative block">
              <span className="sr-only">Search cakes, pastries, cookies and drinks</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                type="search"
                placeholder="What are you in the mood for?"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-12 w-full rounded-2xl border border-border/80 bg-cream pl-11 pr-4 text-sm text-espresso outline-none transition placeholder:text-muted focus:border-caramel focus:ring-4 focus:ring-caramel/10 sm:h-14"
              />
            </label>

            <div role="group" aria-label="Filter menu by category" className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
              <button
                type="button"
                aria-pressed={activeCategory === 'All'}
                onClick={() => setActiveCategory('All')}
                className={cn(
                  'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-all sm:text-sm',
                  activeCategory === 'All'
                    ? 'border-espresso bg-espresso text-white shadow-sm'
                    : 'border-border bg-white text-charcoal-light hover:border-caramel/40 hover:text-espresso'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                All bakes
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={activeCategory === category.name}
                  onClick={() => setActiveCategory(category.name)}
                  className={cn(
                    'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold capitalize transition-all sm:text-sm',
                    activeCategory === category.name
                      ? 'border-espresso bg-espresso text-white shadow-sm'
                      : 'border-border bg-white text-charcoal-light hover:border-caramel/40 hover:text-espresso'
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <p aria-live="polite" className="mb-6 mt-5 text-xs font-medium text-muted">
            {isLoading ? 'Gathering the menu…' : filteredMenu.length + (filteredMenu.length === 1 ? ' bake to explore' : ' bakes to explore')}
          </p>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="overflow-hidden rounded-3xl border border-border bg-white">
                  <div className="shimmer aspect-[4/3]" />
                  <div className="space-y-3 p-5">
                    <div className="shimmer h-5 w-3/4 rounded" />
                    <div className="shimmer h-4 w-full rounded" />
                    <div className="shimmer h-11 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMenu.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-caramel/30 bg-white/65 px-6 py-16 text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-caramel/10 text-caramel-dark">
                <Search className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="font-serif text-2xl text-espresso">Nothing on the tray just yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">Try another search or browse all the bakes on the menu.</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-espresso px-5 text-sm font-semibold text-white transition hover:bg-espresso-light"
              >
                Show the full menu
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="space-y-14 sm:space-y-16">
              {featuredItems.length > 0 && (
                <div>
                  <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-caramel-dark">A little spotlight</p>
                      <h3 className="font-serif text-2xl font-medium text-espresso sm:text-3xl">Featured bakes</h3>
                    </div>
                    <span className="hidden text-xs text-muted sm:block">A few lovely places to start</span>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {featuredItems.map((item) => (
                      <DishCard key={item.id} item={item} isFeatured onViewDetails={() => setSelectedItem(item)} />
                    ))}
                  </div>
                </div>
              )}

              {groupedEntries.map(([category, items]) => (
                <section key={category} aria-label={category}>
                  <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-caramel-dark">Explore by collection</p>
                      <h3 className="font-serif text-2xl font-medium text-espresso sm:text-3xl">{category}</h3>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <DishCard key={item.id} item={item} onViewDetails={() => setSelectedItem(item)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedItem && <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </>
  );
}
