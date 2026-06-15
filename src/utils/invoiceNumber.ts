import { dataSource } from "../server";
import { Order } from "../entities/order";

export const generateInvoiceNumber = async (company_id: number) => {

  const repo = dataSource.getRepository(Order);

  const last = await repo.find({
    where: { company_id },   // 🔥 IMPORTANT FIX
    order: { id: "DESC" },
    take: 1,
  });

  let next = 1;

  if (last.length && last[0].invoice_no) {
    const num = last[0].invoice_no.split("-")[1];
    next = Number(num) + 1;
  }

  return `INV-${company_id}-${String(next).padStart(6, "0")}`;
};