import { LowStockAlert } from "../entities/lowstock";


export class LowStockService {

  static THRESHOLD = 5;

  static async check(product: any, manager?: any) {

    const repo = manager.getRepository(LowStockAlert);

    if (product.stock <= this.THRESHOLD) {

      const exists = await repo.findOne({
        where: { product_id: product.id },
      });

      if (!exists) {

        await repo.save({
          product_id: product.id,
          product_name: product.name,
          current_stock: product.stock,
          threshold: this.THRESHOLD,
        });

        console.log(
          `⚠ LOW STOCK: ${product.name} (${product.stock})`
        );
      }
    }
  }
}