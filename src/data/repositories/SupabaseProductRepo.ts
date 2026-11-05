import { supabase } from '../supabaseClient';
import type { Database } from '../database.types';
import { toProduct } from '../mappers';
import { randomUUID } from '../../lib/uuid';
import type {
  Product,
  ProductInput,
  ProductUpdateInput,
  ProductListResult,
} from '../../domain/models/Product';
import type { IProductRepository } from '../../domain/repositories/IProductRepository';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export class SupabaseProductRepo implements IProductRepository {
  async list(page: number, pageSize: number): Promise<ProductListResult> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      products: (data || []).map((row) => toProduct(row as ProductRow)),
      total: count || 0,
      page,
      pageSize,
    };
  }

  async getBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return toProduct(data as ProductRow);
  }

  async listAdmin(page: number, pageSize: number): Promise<ProductListResult> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      products: (data || []).map((row) => toProduct(row as ProductRow)),
      total: count || 0,
      page,
      pageSize,
    };
  }

  async getManyByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', ids);

    if (error) throw error;

    return (data || []).map((row) => toProduct(row as ProductRow));
  }

  async create(input: ProductInput): Promise<Product> {
    const insert: ProductInsert = {
      slug: input.slug,
      title: input.title,
      description: input.description,
      price: input.price,
      stock: input.stock,
      image_path: input.imagePath,
      is_active: input.isActive,
    };

    const { data, error } = await supabase.from('products').insert(insert).select().single();
    if (error) throw error;

    return toProduct(data as ProductRow);
  }

  async update(id: string, input: ProductUpdateInput): Promise<Product> {
    const update: ProductUpdate = {};
    if (input.slug !== undefined) update.slug = input.slug;
    if (input.title !== undefined) update.title = input.title;
    if (input.description !== undefined) update.description = input.description;
    if (input.price !== undefined) update.price = input.price;
    if (input.stock !== undefined) update.stock = input.stock;
    if (input.imagePath !== undefined) update.image_path = input.imagePath;
    if (input.isActive !== undefined) update.is_active = input.isActive;

    const { data, error } = await supabase
      .from('products')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return toProduct(data as ProductRow);
  }

  async setActive(id: string, isActive: boolean): Promise<Product> {
    return this.update(id, { isActive });
  }

  async uploadImage(id: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'webp';
    const path = `${id}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    // Simpan path saja sesuai PRD bagian A.6; URL publik dibentuk di frontend lewat getPublicUrl.
    return path;
  }
}
