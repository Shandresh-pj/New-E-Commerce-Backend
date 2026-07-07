import { Request, Response } from "express";
import { dataSource } from "../server";
import { Invoice } from "../entities/invoice";
import { InvoiceSettings } from "../entities/invoiceSettings";
import { Register } from "../entities/register";
import { generateInvoiceNumber, getUniqueLetterNumberCode } from "../utils/invoiceNumber";
import { generateInvoicePDF } from "../utils/invoice";
import { Order } from "../entities/order";

export class InvoiceController {

  /**
   * GET /api/invoices/suggestions
   * Generates next 5 invoice number suggestions based on stored settings (or custom transient overrides).
   */
  async getSuggestions(req: Request, res: Response) {
    try {
      const companyId = Number(req.query.company_id);
      if (!companyId || isNaN(companyId)) {
        return res.status(400).json({ success: false, message: "Invalid or missing company_id" });
      }

      // Fetch stored settings
      let settings = await dataSource.getRepository(InvoiceSettings).findOne({
        where: { company_id: companyId }
      });

      // Allow frontend customizer to send overrides in query for instant updates
      const prefix = typeof req.query.prefix === "string" ? req.query.prefix : (settings?.prefix ?? "INV");
      const companyCode = typeof req.query.company_code === "string" ? req.query.company_code : (settings?.company_code ?? "ABC");
      const separator = typeof req.query.separator === "string" ? req.query.separator : (settings?.separator ?? "-");
      const sequenceLength = req.query.sequence_length ? Number(req.query.sequence_length) : (settings?.sequence_length ?? 4);
      const startingNumber = req.query.starting_number ? Number(req.query.starting_number) : (settings?.starting_number ?? 1);
      const includeYear = req.query.include_year !== undefined ? req.query.include_year === "true" : (settings?.include_year ?? true);
      const includeMonth = req.query.include_month !== undefined ? req.query.include_month === "true" : (settings?.include_month ?? true);
      const includeDate = req.query.include_date !== undefined ? req.query.include_date === "true" : (settings?.include_date ?? false);

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Start sequence generation
      let seq = settings?.current_sequence ?? startingNumber;
      const suggestions: string[] = [];
      let checkSeq = seq;
      let safetyCount = 0;

      while (suggestions.length < 5 && safetyCount < 50) {
        safetyCount++;
        const uniqueCode = getUniqueLetterNumberCode(checkSeq);
        const parts: string[] = [];

        if (prefix) parts.push(prefix);
        if (companyCode) parts.push(companyCode);
        parts.push(uniqueCode);

        if (includeYear) parts.push(String(currentYear));
        if (includeMonth) parts.push(String(currentMonth).padStart(2, "0"));
        if (includeDate) parts.push(String(now.getDate()).padStart(2, "0"));

        const seqStr = String(checkSeq).padStart(sequenceLength, "0");
        parts.push(seqStr);

        const candidateNumber = parts.join(separator);

        // Check availability in db
        const invoiceExists = await dataSource.getRepository(Invoice).findOne({
          where: { company_id: companyId, invoice_number: candidateNumber }
        });
        const orderExists = await dataSource.getRepository(Order).findOne({
          where: { company_id: companyId, invoice_no: candidateNumber }
        });

        if (!invoiceExists && !orderExists) {
          suggestions.push(candidateNumber);
        }
        checkSeq++;
      }

      return res.json({
        success: true,
        data: suggestions
      });

    } catch (err: any) {
      console.error("[getSuggestions Error]", err);
      return res.status(500).json({ success: false, message: "Unable to generate suggestions", error: err.message });
    }
  }

  /**
   * POST /api/invoices/create
   * Secure, transaction-based invoice creation.
   */
  async create(req: Request, res: Response) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const {
        company_id,
        invoice_number,
        customer_id,
        invoice_date,
        subtotal,
        tax,
        discount,
        total,
        status,
        items
      } = req.body;

      if (!company_id) {
        throw new Error("Company not found"); // Standard error message matching rules
      }

      // Check if company exists in DB
      const company = await queryRunner.manager.getRepository(Register).findOne({
        where: { id: company_id }
      });
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" });
      }

      let finalInvoiceNumber = invoice_number;

      // Protection Layer 4: Transaction lock on sequence
      let settings = await queryRunner.manager.getRepository(InvoiceSettings).findOne({
        where: { company_id },
        lock: { mode: "pessimistic_write" }
      });

      if (!settings) {
        settings = queryRunner.manager.getRepository(InvoiceSettings).create({
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
          letter_pattern: "A1"
        });
        await queryRunner.manager.getRepository(InvoiceSettings).save(settings);
      }

      if (!finalInvoiceNumber) {
        // Generate number automatically
        finalInvoiceNumber = await generateInvoiceNumber(company_id, queryRunner.manager);
      } else {
        // Protection Layer 2: Backend validation
        const invoiceExists = await queryRunner.manager.getRepository(Invoice).findOne({
          where: { company_id, invoice_number: finalInvoiceNumber }
        });
        const orderExists = await queryRunner.manager.getRepository(Order).findOne({
          where: { company_id, invoice_no: finalInvoiceNumber }
        });

        if (invoiceExists || orderExists) {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({ success: false, message: "Invoice number already exists" });
        }
      }

      // Save Invoice
      const invoice = queryRunner.manager.getRepository(Invoice).create({
        company_id,
        invoice_number: finalInvoiceNumber,
        customer_id: customer_id || null,
        invoice_date: invoice_date ? new Date(invoice_date) : new Date(),
        subtotal: subtotal || 0,
        tax: tax || 0,
        discount: discount || 0,
        total: total || 0,
        status: status || "PENDING"
      });

      await queryRunner.manager.getRepository(Invoice).save(invoice);
      await queryRunner.commitTransaction();

      return res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: invoice
      });

    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      console.error("[createInvoice Error]", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to create invoice" });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * POST /api/invoices/print
   * Prints invoice (Returns printable invoice configuration/metadata).
   */
  async print(req: Request, res: Response) {
    try {
      const { invoice_id } = req.body;
      const invoice = await dataSource.getRepository(Invoice).findOne({
        where: { id: Number(invoice_id) }
      });
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice not found" });
      }

      // Return configuration for printing
      return res.json({
        success: true,
        message: "Print configuration loaded successfully",
        data: invoice
      });
    } catch (err: any) {
      console.error("[printInvoice Error]", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/invoices/download
   * Generates and downloads the PDF version of an invoice.
   */
  async download(req: Request, res: Response) {
    try {
      const { invoice_id, options } = req.body;
      const invoice = await dataSource.getRepository(Invoice).findOne({
        where: { id: Number(invoice_id) }
      });
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice not found" });
      }

      const company = await dataSource.getRepository(Register).findOne({
        where: { id: invoice.company_id }
      });
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" });
      }

      // Convert invoice object to match order properties expected by generateInvoicePDF
      const adaptedInvoice = {
        id: invoice.id,
        invoice_no: invoice.invoice_number,
        created_at: invoice.invoice_date,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        total: invoice.total,
        payment_status: invoice.status,
        payment_method: "CASH",
        items: [] // Invoices can have empty items if not linked to order
      };

      const pdfPath = await generateInvoicePDF(adaptedInvoice, company, options || {});
      return res.download(pdfPath);

    } catch (err: any) {
      console.error("[downloadInvoice Error]", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
