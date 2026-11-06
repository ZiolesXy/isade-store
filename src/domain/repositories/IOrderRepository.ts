import type { Order } from '../models/Order';

export interface IOrderRepository {
  listMine(page: number, pageSize: number, userId: string): Promise<Order[]>;
  getById(id: string, userId?: string): Promise<Order | null>;
  listAll(page: number, pageSize: number, status?: string): Promise<Order[]>;
}
