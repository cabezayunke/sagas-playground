import { Injectable } from '@nestjs/common';

@Injectable()
export class InventoryService {
  private stock: Record<string, number> = {
    // 'product1': 100,
    // 'product2': 200,
    // 'product3': 5,
    'product1': 10000,
    'product2': 20000,
    'product3': 50000,
  };

  private logStock() {
    console.log(`{
      Stock: ${JSON.stringify(this.stock)}
    }`);
  }

  async reserveInventory(items: any[]): Promise<boolean> {
    console.log('[Inventory] Attempting to reserve inventory...');

    for (const item of items) {
      const available = this.stock[item.sku] || 0;
      if (available < item.quantity) {
        console.log(`[Inventory] Insufficient stock for ${item.sku}`);
        this.logStock();
        return false;
      }
    }
    for (const item of items) {
      this.stock[item.sku] -= item.quantity;
    }
    console.log('[Inventory] Inventory reserved successfully.');
    this.logStock();
    return true;
  }
}