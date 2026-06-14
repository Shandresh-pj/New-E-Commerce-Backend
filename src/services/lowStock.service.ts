import { dataSource } from "../server";
import { Product } from "../entities/products";import { LowStockAlert } from "../entities/stock";
[]

export class LowStockService {

  // default threshold
  private static THRESHOLD = 5;

  static async check(product: Product, manager?: any) {

    const repo = manager
      ? manager.getRepository(LowStockAlert)
      : dataSource.getRepository(LowStockAlert);

    if (product.stock <= this.THRESHOLD) {

      // prevent duplicate alerts (simple check)
      const exists = await repo.findOne({
        where: {
          product_id: product.id,
        },
      });

      if (!exists) {

        await repo.save({
          product_id: product.id,
          product_name: product.name,
          current_stock: product.stock,
          threshold: this.THRESHOLD,
        });

        console.log(
          `⚠️ LOW STOCK ALERT: ${product.name} = ${product.stock}`
        );
      }
    }
  }
}