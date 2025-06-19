import { Order } from '../domain/order.entity';

export class OrderRepository {
  private orders = new Map<string, Order>();

  save(order: Order) {
    this.orders.set(order.orderId, order);
  }

  findById(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }
}