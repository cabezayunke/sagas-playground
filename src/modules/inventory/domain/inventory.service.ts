import { Injectable } from '@nestjs/common';

@Injectable()
export class InventoryService {
  private stock: Record<string, number> = {
    'product-1': 100,
    'product-2': 200,
  };

  async reserveInventory(items: any[]): Promise<boolean> {
    console.log('[Inventory] Attempting to reserve inventory...');
    for (const item of items) {
      const available = this.stock[item.productId] || 0;
      if (available < item.quantity) {
        console.log(`[Inventory] Insufficient stock for ${item.productId}`);
        return false;
      }
    }
    for (const item of items) {
      this.stock[item.productId] -= item.quantity;
    }
    console.log('[Inventory] Inventory reserved successfully.');
    return true;
  }
}