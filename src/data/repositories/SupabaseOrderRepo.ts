import { supabase } from '../supabaseClient';
import type { Database } from '../database.types';
import { toOrder } from '../mappers';
import type { Order } from '../../domain/models/Order';
import type { IOrderRepository } from '../../domain/repositories/IOrderRepository';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];

export class SupabaseOrderRepo implements IOrderRepository {
  async listMine(page: number, pageSize: number, userId: string): Promise<Order[]> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items(*)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return (data || []).map((row) => {
      const orderRow = row as OrderRow;
      const items = (orderRow as any).order_items || [];
      return toOrder(orderRow, items as OrderItemRow[]);
    });
  }

  async getById(id: string, userId?: string): Promise<Order | null> {
    let query = supabase
      .from('orders')
      .select(`*, order_items(*)`)
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const orderRow = data as OrderRow;
    const items = (orderRow as any).order_items || [];
    return toOrder(orderRow, items as OrderItemRow[]);
  }

  async listAll(page: number, pageSize: number, status?: string): Promise<Order[]> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('orders')
      .select(`*, order_items(*)`)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row) => {
      const orderRow = row as OrderRow;
      const items = (orderRow as any).order_items || [];
      return toOrder(orderRow, items as OrderItemRow[]);
    });
  }
}
