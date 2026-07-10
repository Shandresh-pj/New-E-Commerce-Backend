import { Router } from "express";
import { contactController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import validate from "../middleware/validate";
import { CreateContactDto, UpdateContactDto } from "../dto/contact.dto";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /contact:
 *   post:
 *     tags: [Contacts]
 *     summary: Register a new contact (Public)
 *     description: Submit a new business registration/contact request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateContactDto'
 *     responses:
 *       201:
 *         description: Contact created successfully
 *       400:
 *         description: Validation failed
 */
router.post(
  "/contact",
  validate(CreateContactDto),
  contactController.create.bind(contactController)
);


/**
 * @swagger
 * /contact/check-duplicate:
 *   post:
 *     tags: [Contacts]
 *     summary: Check duplicate email/company/phone
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Duplicate check completed
 */
router.post(
  "/contact/check-duplicate",
  contactController.checkDuplicate.bind(contactController)
);

/**
 * @swagger
 * /contact/verify-email:
 *   post:
 *     tags: [Contacts]
 *     summary: Verify email using token
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Email verified
 */
router.post(
  "/contact/verify-email",
  contactController.verifyEmail.bind(contactController)
);


/**
 * @swagger
 * /contact/setup-password:
 *   post:
 *     tags: [Contacts]
 *     summary: Complete account setup
 *     description: Creates Company, Admin User and Role Mapping.
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Password setup completed
 */
router.post(
  "/contact/setup-password",
  contactController.setupPassword.bind(contactController)
);


/**
 * @swagger
 * /contacts/export:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Contacts]
 *     summary: Export Contacts
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv,pdf]
 *     responses:
 *       200:
 *         description: File downloaded
 */
router.get(
  "/contacts/export",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  contactController.exportContacts.bind(contactController)
);


/**
 * @swagger
 * /contacts:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Contacts]
 *     summary: Get all contacts
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: preferredPlan
 *         schema:
 *           type: string
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *       - in: query
 *         name: showDeleted
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Contacts fetched successfully
 */
router.get(
  "/contacts",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  contactController.getContacts.bind(contactController)
);


/**
 * @swagger
 * /contacts/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Contacts]
 *     summary: Get Contact by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contact details
 */
router.get(
  "/contacts/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  contactController.getContactById.bind(contactController)
);


/**
 * @swagger
 * /contacts/{id}:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     tags: [Contacts]
 *     summary: Update Contact
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateContactDto'
 *     responses:
 *       200:
 *         description: Contact updated
 */
router.put(
  "/contacts/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  validate(UpdateContactDto),
  contactController.updateContact.bind(contactController)
);


/**
 * @swagger
 * /contacts/{id}/approve:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Contacts]
 *     summary: Approve Contact
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contact approved
 */
router.post(
  "/contacts/:id/approve",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  contactController.approveContact.bind(contactController)
);


/**
 * @swagger
 * /contacts/{id}/reject:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Contacts]
 *     summary: Reject Contact
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contact rejected
 */
router.post(
  "/contacts/:id/reject",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  contactController.rejectContact.bind(contactController)
);


/**
 * @swagger
 * /contacts/{id}/restore:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Contacts]
 *     summary: Restore Soft Deleted Contact
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contact restored
 */
router.post(
  "/contacts/:id/restore",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  contactController.restoreContact.bind(contactController)
);


/**
 * @swagger
 * /contacts/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags: [Contacts]
 *     summary: Soft Delete Contact
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contact deleted
 */
router.delete(
  "/contacts/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  contactController.softDeleteContact.bind(contactController)
);

export default router;
