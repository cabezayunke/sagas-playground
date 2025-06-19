import { InventoryAggregate } from '../../../../src/modules/inventory/domain/inventory.aggregate';

describe('InventoryAggregate', () => {
    it('should be instantiable', () => {
        const inventory = new InventoryAggregate();
        expect(inventory).toBeInstanceOf(InventoryAggregate);
    });

});
