import { Router } from "express";
import { invoiceController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

const allowedRoles = [
  UserType.SUPER_ADMIN,
  UserType.ADMIN,
  UserType.BRANCH,
  UserType.BRANCH_MANAGER,
  UserType.SHOPKEEPER,
  UserType.CUSTOMER,
  UserType.EMPLOYEE
];

router.get(
  "/invoices/suggestions",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.getSuggestions.bind(invoiceController)
);

router.post(
  "/invoices/create",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.create.bind(invoiceController)
);

router.post(
  "/invoices/print",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.print.bind(invoiceController)
);

router.post(
  "/invoices/download",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.download.bind(invoiceController)
);

export default router;
