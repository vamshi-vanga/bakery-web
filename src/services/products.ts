import { supabase } from '@/lib/supabase';
import { MenuItem } from '@/types/database';
import { cacheProducts, getCachedProducts } from './offlineStorage';

export interface CreateProductInput {
  bakery_id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  track_inventory: boolean;
  initial_stock?: number;
  low_stock_threshold?: number | null;
}

export interface UpdateProductInput {
  name?: string;
  category?: string;
  price?: number;
  description?: string;
  is_active?: boolean;
  track_inventory?: boolean;
  low_stock_threshold?: number | null;
}

export async function fetchProducts(
  bakeryId: string,
  options?: { category?: string; query?: string; includeArchived?: boolean }
): Promise<MenuItem[]> {
  try {
    let req = supabase
      .from('menu_items')
      .select('*')
      .eq('bakery_id', bakeryId);

    if (!options?.includeArchived) {
      req = req.is('archived_at', null);
    }

    if (options?.category && options.category !== 'All') {
      req = req.eq('category', options.category);
    }

    if (options?.query && options.query.trim().length > 0) {
      req = req.ilike('name', `%${options.query.trim()}%`);
    }

    const { data, error } = await req.order('name', { ascending: true });

    if (error) {
      throw error;
    }

    const products = (data as MenuItem[]) ?? [];

    // Background cache active products to local SQLite when full list is fetched
    if (!options?.includeArchived && !options?.category && !options?.query) {
      cacheProducts(bakeryId, products).catch((e) =>
        console.warn('Failed to cache products to SQLite:', e)
      );
    }

    return products;
  } catch (netErr) {
    console.warn('Network error fetching products from Supabase, loading from local SQLite cache:', netErr);
    // Offline fallback from local SQLite
    const cached = await getCachedProducts(bakeryId);
    let filtered = cached;

    if (options?.category && options.category !== 'All') {
      filtered = filtered.filter((p) => p.category === options.category);
    }

    if (options?.query && options.query.trim().length > 0) {
      const q = options.query.trim().toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }

    return filtered;
  }
}

export { fetchCategories } from './categories';

export async function createProduct(input: CreateProductInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_product', {
    p_bakery_id: input.bakery_id,
    p_name: input.name.trim(),
    p_category: input.category.trim() || 'General',
    p_price: input.price,
    p_description: input.description?.trim() || null,
    p_track_inventory: input.track_inventory,
    p_initial_stock: input.initial_stock ?? 0,
    p_low_stock_threshold: input.low_stock_threshold ?? null,
  });

  if (error) {
    console.error('Error creating product:', error);
    throw new Error(error.message);
  }

  const result = data as { success: boolean; product_id: string };
  return result.product_id;
}

export async function updateProduct(
  productId: string,
  bakeryId: string,
  input: UpdateProductInput
): Promise<void> {
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.category !== undefined) updatePayload.category = input.category.trim();
  if (input.price !== undefined) updatePayload.price = input.price;
  if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;
  if (input.is_active !== undefined) updatePayload.is_active = input.is_active;
  if (input.track_inventory !== undefined) updatePayload.track_inventory = input.track_inventory;
  if (input.low_stock_threshold !== undefined) updatePayload.low_stock_threshold = input.low_stock_threshold;

  const { error } = await supabase
    .from('menu_items')
    .update(updatePayload)
    .eq('id', productId)
    .eq('bakery_id', bakeryId);

  if (error) {
    console.error('Error updating product:', error);
    throw new Error(error.message);
  }
}

export async function archiveProduct(productId: string, bakeryId: string): Promise<void> {
  const { error } = await supabase
    .from('menu_items')
    .update({
      archived_at: new Date().toISOString(),
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .eq('bakery_id', bakeryId);

  if (error) {
    console.error('Error archiving product:', error);
    throw new Error(error.message);
  }
}
