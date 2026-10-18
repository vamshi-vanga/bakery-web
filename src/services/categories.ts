import { supabase } from '@/lib/supabase';
import { getCachedProducts } from './offlineStorage';

const DEFAULT_CATEGORIES = [
  'Cakes',
  'Pastries',
  'Breads',
  'Cookies',
  'Beverages',
  'Savouries',
];

export interface CategoryItem {
  id: string;
  bakery_id: string;
  name: string;
  sort_order: number;
}

/**
 * Fetch all categories for a bakery from the dedicated categories table.
 * Falls back to offline SQLite or default categories if offline.
 */
export async function fetchCategories(bakeryId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .eq('bakery_id', bakeryId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      return data.map((c) => c.name);
    }

    // If table returned empty, seed defaults
    return DEFAULT_CATEGORIES;
  } catch (err) {
    console.warn('Failed to fetch from categories table, falling back:', err);
    try {
      const cached = await getCachedProducts(bakeryId);
      const unique = Array.from(new Set(cached.map((p) => p.category).filter(Boolean)));
      return unique.length > 0 ? unique : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }
}

/**
 * Add a new category to the bakery.
 */
export async function addCategory(bakeryId: string, name: string): Promise<void> {
  const cleaned = name.trim();
  if (!cleaned) throw new Error('Category name cannot be empty.');

  const { error } = await supabase.from('categories').insert({
    bakery_id: bakeryId,
    name: cleaned,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Category "${cleaned}" already exists.`);
    }
    throw new Error(error.message);
  }
}

/**
 * Atomically rename a category and cascade-update all products with the old name.
 */
export async function renameCategory(
  bakeryId: string,
  oldName: string,
  newName: string
): Promise<void> {
  const cleanedNew = newName.trim();
  if (!cleanedNew) throw new Error('New category name cannot be empty.');
  if (oldName.trim() === cleanedNew) return;

  const { data, error } = await supabase.rpc('rename_category', {
    p_bakery_id: bakeryId,
    p_old_name: oldName.trim(),
    p_new_name: cleanedNew,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data as { success?: boolean };
  if (!result?.success) {
    throw new Error('Failed to rename category.');
  }
}

/**
 * Delete a category. If products belong to this category, they are reassigned to 'General'.
 */
export async function deleteCategory(bakeryId: string, name: string): Promise<void> {
  const cleaned = name.trim();

  // 1. Reassign any existing menu_items from this category to 'General'
  await supabase
    .from('menu_items')
    .update({ category: 'General', updated_at: new Date().toISOString() })
    .eq('bakery_id', bakeryId)
    .eq('category', cleaned);

  // 2. Delete the category record
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('bakery_id', bakeryId)
    .eq('name', cleaned);

  if (error) {
    throw new Error(error.message);
  }
}
