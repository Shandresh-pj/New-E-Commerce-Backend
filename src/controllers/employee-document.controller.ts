import { Request, Response } from "express";
import dataSource from "../config/database";
import { EmployeeDocument, DocumentVerificationStatus, DocumentType } from "../entities/employee_document.entity";

export class EmployeeDocumentController {
  private static get repo() {
    return dataSource.getRepository(EmployeeDocument);
  }

  static async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user?.company_id || (req as any).user?.companyId || 1;
      const employeeId = req.query.employee_id ? Number(req.query.employee_id) : undefined;

      const where: any = { company_id: companyId };
      if (employeeId) {
        where.employee_id = employeeId;
      }

      const docs = await EmployeeDocumentController.repo.find({
        where,
        order: { created_at: "DESC" }
      });

      const formatted = docs.map(d => ({
        ...d,
        doc_type: d.document_type,
        file_name: d.file_url ? d.file_url.split("/").pop() : "document.pdf",
        is_verified: d.verification_status === DocumentVerificationStatus.APPROVED,
      }));

      res.status(200).json({
        success: true,
        data: formatted
      });
    } catch (error: any) {
      console.error("[EmployeeDocumentController.getDocuments]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user?.company_id || (req as any).user?.companyId || 1;
      const { employee_id, document_type, doc_type, document_number, file_url } = req.body;
      const docType = document_type || doc_type;

      if (!docType) {
        res.status(400).json({
          success: false,
          message: "document_type is required."
        });
        return;
      }

      const doc = EmployeeDocumentController.repo.create({
        company_id: companyId,
        employee_id: Number(employee_id || 1),
        document_type: docType as DocumentType,
        document_number: document_number || "DOC-AUTO",
        file_url: file_url || "/uploads/documents/default.pdf",
        verification_status: DocumentVerificationStatus.PENDING
      });

      await EmployeeDocumentController.repo.save(doc);

      res.status(201).json({
        success: true,
        message: "Document uploaded successfully and pending verification.",
        data: {
          ...doc,
          doc_type: doc.document_type,
          is_verified: false,
        }
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
      const companyId = (req as any).user?.company_id || (req as any).user?.companyId || 1;
      const reviewerId = (req as any).user?.userId || (req as any).user?.user_id;

      const doc = await EmployeeDocumentController.repo.findOne({
        where: { id: Number(id) }
      });

      if (!doc) {
        res.status(404).json({ success: false, message: "Document record not found." });
        return;
      }

      const targetStatus = status && String(status).toUpperCase() === "REJECTED"
        ? DocumentVerificationStatus.REJECTED
        : DocumentVerificationStatus.APPROVED;

      doc.verification_status = targetStatus;
      doc.rejection_reason = targetStatus === DocumentVerificationStatus.REJECTED ? rejection_reason : undefined;
      doc.verified_by = reviewerId;
      doc.verified_at = new Date();

      await EmployeeDocumentController.repo.save(doc);

      res.status(200).json({
        success: true,
        message: `Document verification ${targetStatus.toLowerCase()} successfully.`,
        data: {
          ...doc,
          doc_type: doc.document_type,
          is_verified: targetStatus === DocumentVerificationStatus.APPROVED,
        }
      });
    } catch (error: any) {
      console.error("[EmployeeDocumentController.verifyDocument]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
