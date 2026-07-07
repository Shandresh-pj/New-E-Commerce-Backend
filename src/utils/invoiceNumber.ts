import { DataSource, EntityManager } from "typeorm";
// import { InvoiceSetting } from "../entities/invoice_settings.entity";
import { Order } from "../entities/order";
import { InvoiceSetting } from "../entities/invoice.entity";

/**
 * Formats the invoice string. 
 * Enforces Letter + Number requirement (e.g., A1, B2)
 */
export const formatInvoiceString = (setting: InvoiceSetting, sequence: number, date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seqStr = String(sequence).padStart(setting.sequence_length, '0');
  
  // Generate deterministic Letter+Number (e.g. Seq 1 = B1, Seq 2 = C2)
  const uniqueLetter = String.fromCharCode(65 + (sequence % 26)); 
  const uniqueNum = sequence % 10;
  const uniqueCode = `${uniqueLetter}${uniqueNum}`;
  
  // Result: INV-ABC-B1-2026-07-0001
  return `${setting.prefix}${setting.separator}${setting.company_code}${setting.separator}${uniqueCode}${setting.separator}${year}${setting.separator}${month}${setting.separator}${seqStr}`;
};

/**
 * Generates 5 valid, unused invoice suggestions in real-time.
 */
export const getAvailableSuggestions = async (manager: EntityManager, company_id: number): Promise<string[]> => {
  let setting = await manager.getRepository(InvoiceSetting).findOne({ where: { company_id } });
  
  // Auto-create default settings if they don't exist
  if (!setting) {
    setting = manager.getRepository(InvoiceSetting).create({ company_id });
    await manager.save(setting);
  }

  const suggestions: string[] = [];
  let testSeq = setting.current_sequence + 1;
  const orderRepo = manager.getRepository(Order);

  // Find the next 5 available slots
  while (suggestions.length < 5) {
    const candidate = formatInvoiceString(setting, testSeq);
    const exists = await orderRepo.findOne({ where: { company_id, invoice_no: candidate }, select: { id: true } });
    
    if (!exists) {
      suggestions.push(candidate);
    }
    testSeq++;
  }

  return suggestions;
};

/**
 * Layer 4 & 5 Protection: Transactional lock + Auto-retry loop
 */
export const safelyGenerateAndLockInvoice = async (manager: EntityManager, company_id: number, requested_invoice?: string): Promise<string> => {
  const settingRepo = manager.getRepository(InvoiceSetting);
  const orderRepo = manager.getRepository(Order);

  // Pessimistic Write Lock: Prevents concurrent requests from reading the same sequence
  let setting = await settingRepo.findOne({ 
    where: { company_id }, 
    lock: { mode: "pessimistic_write" } 
  });

  if (!setting) {
    // Auto-create default settings if not exists
    const newSetting = settingRepo.create({ company_id });
    await settingRepo.save(newSetting);

    // Re-lock the freshly created row
    setting = await settingRepo.findOne({ 
      where: { company_id }, 
      lock: { mode: "pessimistic_write" } 
    }) || newSetting;
  }

  let finalInvoiceNo = "";

  // If user selected a specific suggestion, validate it hasn't been taken in the last millisecond
  if (requested_invoice) {
    const exists = await orderRepo.findOne({ where: { company_id, invoice_no: requested_invoice }});
    if (!exists) {
      // Update sequence broadly based on the requested string to prevent future collisions
      setting.current_sequence++;
      await settingRepo.save(setting);
      return requested_invoice;
    }
  }

  // Auto-retry loop (Fall back to generating the next safe one)
  let attemptSeq = setting.current_sequence + 1;
  while (true) {
    finalInvoiceNo = formatInvoiceString(setting, attemptSeq);
    const exists = await orderRepo.findOne({ where: { company_id, invoice_no: finalInvoiceNo }});
    
    if (!exists) break; // Found an empty slot!
    attemptSeq++; // Collision occurred, try next sequence
  }

  // Commit new sequence
  setting.current_sequence = attemptSeq;
  await settingRepo.save(setting);

  return finalInvoiceNo;
};