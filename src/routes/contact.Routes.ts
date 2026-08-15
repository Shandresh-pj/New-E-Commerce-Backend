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
 *             type: object
 *             required:
 *               - companyName
 *               - businessName
 *               - ownerName
 *               - email
 *               - phone
 *               - country
 *               - state
 *               - city
 *               - businessType
 *               - preferredPlan
 *               - billingCycle
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: "SVK Enterprise"
 *               fullName:
 *                 type: string
 *                 example: "Rajesh Kumar"
 *               businessName:
 *                 type: string
 *                 example: "SVK Retail"
 *               ownerName:
 *                 type: string
 *                 example: "Rajesh Kumar"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "contact@svkenterprise.com"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               country:
 *                 type: string
 *                 example: "India"
 *               state:
 *                 type: string
 *                 example: "Karnataka"
 *               city:
 *                 type: string
 *                 example: "Bengaluru"
 *               businessType:
 *                 type: string
 *                 example: "Retail"
 *               gst:
 *                 type: string
 *                 example: "29ABCDE1234F1Z5"
 *               website:
 *                 type: string
 *                 example: "https://svkenterprise.com"
 *               employeeCount:
 *                 type: integer
 *                 example: 25
 *               selectedPlan:
 *                 type: string
 *                 example: "Enterprise"
 *               preferredPlan:
 *                 type: string
 *                 example: "Pro Plan"
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, quarterly, yearly]
 *                 example: "monthly"
 *               message:
 *                 type: string
 *                 example: "Interested in onboarding 5 branches"
 *     responses:
 *       201:
 *         description: Contact created successfully
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
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
 *     description: Verify if an email, phone number, or company name already exists.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "test@example.com"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               companyName:
 *                 type: string
 *                 example: "SVK DTH"
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
 *     description: Verify user contact email address using secret verification token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "VERIFY-TOKEN-998241"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
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
 *     description: Creates Company, Admin User and Role Mapping with initial password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: "SETUP-TOKEN-12345"
 *               password:
 *                 type: string
 *                 example: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Password setup completed
 *       400:
 *         description: Invalid token or password
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
 * /contacts:
 *   post:
 *     summary: Create CRM Contact / Lead
 *     description: Authenticated user registers or creates a new client lead in the CRM system.
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               company:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact created successfully
 */
router.post(
  "/contacts",
  authenticateMiddleware,
  contactController.create.bind(contactController)
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
 *     description: Update business contact details.
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
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: "SVK Enterprise Updated"
 *               contactPerson:
 *                 type: string
 *                 example: "Rajesh Kumar"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               address:
 *                 type: string
 *                 example: "MG Road, Bengaluru"
 *     responses:
 *       200:
 *         description: Contact updated successfully
 *       404:
 *         description: Contact not found
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
 *     summary: Approve Contact Registration
 *     description: Approve business contact registration and issue tenant credentials.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 example: "Approved after document check"
 *     responses:
 *       200:
 *         description: Contact approved successfully
 *       404:
 *         description: Contact not found
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
 *     summary: Reject Contact Registration
 *     description: Reject business contact registration request with reason.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Incomplete company registration details"
 *     responses:
 *       200:
 *         description: Contact rejected
 *       404:
 *         description: Contact not found
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
 *     description: Restore a previously deleted contact record.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Restored by admin"
 *     responses:
 *       200:
 *         description: Contact restored successfully
 *       404:
 *         description: Contact not found
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
