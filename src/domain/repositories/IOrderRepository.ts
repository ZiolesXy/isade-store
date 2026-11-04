import type { Order } from '../models/Order';

export interface IOrderRepository {
  listMine(page: number, pageSize: number): Promise<Order[]>;
  getById(id: string): Promise<Order | null>;
  listAll(page: number, pageSize: number, status?: string): Promise<Order[]>;
}
