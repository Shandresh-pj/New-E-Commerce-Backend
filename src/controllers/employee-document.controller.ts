import { Request, Response } from "express";
import dataSource from "../config/database";
import { EmployeeDocument, DocumentVerificationStatus, DocumentType } from "../entities/employee_document.entity";

export class EmployeeDocumentController {
  private static get repo() {
    return dataSource.getRepository(EmployeeDocument);
  }

  static async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user?.company_id || 1;
      const employeeId = req.query.employee_id ? Number(req.query.employee_id) : undefined;

      const where: any = { company_id: companyId };
      if (employeeId) {
        where.employee_id = employeeId;
      }

      const docs = await EmployeeDocumentController.repo.find({
        where,
        order: { created_at: "DESC" }
      });

      res.status(200).json({
        success: true,
        data: docs
      });
    } catch (error: any) {
      console.error("[EmployeeDocumentController.getDocuments]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user?.company_id || 1;
      const { employee_id, document_type, document_number, file_url } = req.body;

      if (!employee_id || !document_type || !file_url) {
        res.status(400).json({
          success: false,
          message: "employee_id, document_type, and file_url are required."
        });
        return;
      }

      const doc = EmployeeDocumentController.repo.create({
        company_id: companyId,
        employee_id: Number(employee_id),
        document_type: document_type as DocumentType,
        document_number,
        file_url,
        verification_status: DocumentVerificationStatus.PENDING
      });

      await EmployeeDocumentController.repo.save(doc);

      res.status(201).json({
        success: true,
        message: "Document uploaded successfully and pending verification.",
        data: doc
      });
    } catch (error: any) {
      console.error("[EmployeeDocumentController.uploadDocument]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async verifyDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, rejection_reason } = req.body;
      const companyId = (req as any).user?.company_id || 1;
      const reviewerId = (req as any).user?.userId || (req as any).user?.user_id;

      const doc = await EmployeeDocumentController.repo.findOne({
        where: { id: Number(id), company_id: companyId }
      });

      if (!doc) {
        res.status(404).json({ success: false, message: "Document record not found." });
        return;
      }

      if (status !== DocumentVerificationStatus.APPROVED && status !== DocumentVerificationStatus.REJECTED) {
        res.status(400).json({ success: false, message: "Invalid verification status." });
        return;
      }

      doc.verification_status = status as DocumentVerificationStatus;
      doc.rejection_reason = status === DocumentVerificationStatus.REJECTED ? rejection_reason : undefined;
      doc.verified_by = reviewerId;
      doc.verified_at = new Date();

      await EmployeeDocumentController.repo.save(doc);

      res.status(200).json({
        success: true,
        message: `Document verification ${status.toLowerCase()} successfully.`,
        data: doc
      });
    } catch (error: any) {
      console.error("[EmployeeDocumentController.verifyDocument]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
