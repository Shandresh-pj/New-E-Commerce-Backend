import { Router } from "express";
import { EmployeeDocumentController } from "../controllers/employee-document.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

router.get("/employee-documents", authenticateMiddleware, EmployeeDocumentController.getDocuments);
router.post("/employee-documents", authenticateMiddleware, EmployeeDocumentController.uploadDocument);
router.put("/employee-documents/:id/verify", authenticateMiddleware, EmployeeDocumentController.verifyDocument);

export default router;
