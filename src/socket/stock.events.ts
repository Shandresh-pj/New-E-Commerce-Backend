import { io } from "./socket";

export const emitStockUpdate = (data: any) => {
  io.to(`company_${data.company_id}`).emit("stock-update", {
    product_id: data.product_id,
    product_name: data.product_name,
    branch_name: data.branch_name,
    old_stock: data.old_stock,
    new_stock: data.new_stock,
  });
};

export const emitLowStockAlert = (data: any) => {
  io.to(`company_${data.company_id}`).emit("low-stock-alert", {
    product_id: data.product_id,
    product_name: data.product_name,
    stock: data.stock,
    threshold: data.threshold,
  });
};