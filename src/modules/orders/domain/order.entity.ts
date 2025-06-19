export interface Order {
  orderId: string;
  items: any[];
  status: OrderStatus;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';