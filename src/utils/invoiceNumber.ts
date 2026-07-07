import { EntityManager } from "typeorm";
import dataSource from "../config/database";
import { Invoice } from "../entities/invoice";
import { InvoiceSettings } from "../entities/invoiceSettings";
import { Order } from "../entities/order";

/**
 * Deterministically generates the UNIQUECODE (letter + number combination) based on sequence.
 * Guaranteed to contain both letters (A-Z) and numbers (0-9).
 */
export const getUniqueLetterNumberCode = (sequence: number): string => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  
  // Use sequence to get a character and a digit
  const letterChar = letters[(sequence - 1) % letters.length];
  const digitChar = digits[(sequence - 1) % digits.length];
  
  return `${letterChar}${digitChar}`;
};

/**
 * Enterprise-level transaction-safe invoice number generator.
 * Features customizable pattern formatting, automatic sequence reset,
 * pessimistic database locking, and auto-retry collision mitigation.
 */
export const generateInvoiceNumber = async (
  company_id: number,
  providedManager?: EntityManager
): Promise<string> => {
  // Use the provided transaction manager or fall back to the default database manager
  const manager = providedManager || dataSource.manager;

  // Retrieve or create settings for this company
  let settings = await manager.getRepository(InvoiceSettings).findOne({
    where: { company_id },
    lock: { mode: "pessimistic_write" } // Protection Layer 4: Database row lock
  });

  if (!settings) {
    settings = manager.getRepository(InvoiceSettings).create({
      company_id,
      prefix: "INV",
      company_code: "ABC",
      sequence_length: 4,
      separator: "-",
      current_sequence: 1,
      starting_number: 1,
      include_year: true,
      include_month: true,
      include_date: false,
      letter_pattern: "A1",
      reset_yearly: true,
      reset_monthly: true
    });
    await manager.getRepository(InvoiceSettings).save(settings);
  }

  // Sequence Reset Verification
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Fetch last generated invoice to check if date reset is required
  const lastInvoice = await manager.getRepository(Invoice).findOne({
    where: { company_id },
    order: { created_at: "DESC" }
  });

  let shouldReset = false;
  if (lastInvoice) {
    const lastDate = new Date(lastInvoice.created_at);
    const lastYear = lastDate.getFullYear();
    const lastMonth = lastDate.getMonth() + 1;

    if (settings.reset_yearly && lastYear !== currentYear) {
      shouldReset = true;
    } else if (settings.reset_monthly && (lastYear !== currentYear || lastMonth !== currentMonth)) {
      shouldReset = true;
    }
  }

  let seq = shouldReset ? settings.starting_number : settings.current_sequence;
  let attempts = 0;
  const maxAttempts = 5;
  let invoiceNumber = "";

  // Collision mitigation loop - Protection Layer 5
  while (attempts < maxAttempts) {
    const uniqueCode = getUniqueLetterNumberCode(seq);
    const parts: string[] = [];

    if (settings.prefix) parts.push(settings.prefix);
    if (settings.company_code) parts.push(settings.company_code);
    parts.push(uniqueCode);

    if (settings.include_year) {
      parts.push(String(currentYear));
    }
    if (settings.include_month) {
      parts.push(String(currentMonth).padStart(2, "0"));
    }
    if (settings.include_date) {
      parts.push(String(now.getDate()).padStart(2, "0"));
    }

    // Format sequence padding
    const seqStr = String(seq).padStart(settings.sequence_length, "0");
    parts.push(seqStr);

    invoiceNumber = parts.join(settings.separator);

    // Verify uniqueness in both Invoice table and Order table
    const invoiceExists = await manager.getRepository(Invoice).findOne({
      where: { company_id, invoice_number: invoiceNumber }
    });

    const orderExists = await manager.getRepository(Order).findOne({
      where: { company_id, invoice_no: invoiceNumber }
    });

    if (!invoiceExists && !orderExists) {
      // Unused invoice number found
      break;
    }

    // Collision detected, increment and retry
    seq++;
    attempts++;
  }

  if (attempts === maxAttempts) {
    throw new Error("Unable to generate invoice number: max collision retry threshold reached");
  }

  // Update next sequence in database settings
  settings.current_sequence = seq + 1;
  await manager.getRepository(InvoiceSettings).save(settings);

  return invoiceNumber;
};