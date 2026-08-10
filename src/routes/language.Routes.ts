import { Router } from "express";
import { LanguageController } from "../controllers/language.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

/**
 * @swagger
 * /languages:
 *   get:
 *     summary: List Supported Languages
 *     description: Retrieve list of active system languages for multi-language UI support.
 *     tags: [Language]
 *     responses:
 *       200:
 *         description: List of languages retrieved
 */
router.get("/languages", LanguageController.getLanguages);

/**
 * @swagger
 * /translations/matrix:
 *   get:
 *     summary: Get Full Translation Matrix
 *     description: Retrieve all translation keys across all supported languages in a key-value grid.
 *     tags: [Language]
 *     responses:
 *       200:
 *         description: Translation matrix object
 */
router.get("/translations/matrix", LanguageController.getTranslationMatrix);

/**
 * @swagger
 * /translations/{langCode}:
 *   get:
 *     summary: Get Language Dictionary
 *     description: Download key-value translation dictionary for a specific language (e.g. 'en', 'hi', 'ta').
 *     tags: [Language]
 *     parameters:
 *       - in: path
 *         name: langCode
 *         required: true
 *         schema:
 *           type: string
 *         example: "hi"
 *     responses:
 *       200:
 *         description: Key-value dictionary object
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/translations/:langCode", LanguageController.getDictionary);

/**
 * @swagger
 * /languages:
 *   post:
 *     summary: Add New Language
 *     description: Register a new locale language in the system.
 *     tags: [Language]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *             properties:
 *               code:
 *                 type: string
 *                 example: "hi"
 *               name:
 *                 type: string
 *                 example: "Hindi"
 *               isRtl:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Language added
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/languages", authenticateMiddleware, LanguageController.createLanguage);

/**
 * @swagger
 * /languages/{id}:
 *   put:
 *     summary: Update Language Settings
 *     description: Update name, RTL status, or active flag for a supported language.
 *     tags: [Language]
 *     security:
 *       - bearerAuth: []
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
 *               name:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Language updated
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/languages/:id", authenticateMiddleware, LanguageController.updateLanguage);

/**
 * @swagger
 * /translations/values:
 *   put:
 *     summary: Upsert Translation Key/Value
 *     description: Add or update a translation value for a specific key and language code.
 *     tags: [Language]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - langCode
 *               - value
 *             properties:
 *               key:
 *                 type: string
 *                 example: "NAV_HOME"
 *               langCode:
 *                 type: string
 *                 example: "hi"
 *               value:
 *                 type: string
 *                 example: "मुख्य पृष्ठ"
 *     responses:
 *       200:
 *         description: Translation updated
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/translations/values", authenticateMiddleware, LanguageController.upsertTranslation);

/**
 * @swagger
 * /translations/import:
 *   post:
 *     summary: Import Translation File (JSON/CSV)
 *     description: Bulk import translations for a language using a JSON/CSV payload.
 *     tags: [Language]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - langCode
 *               - translations
 *             properties:
 *               langCode:
 *                 type: string
 *                 example: "en"
 *               translations:
 *                 type: object
 *                 example: { "NAV_HOME": "Home", "NAV_CART": "Cart" }
 *     responses:
 *       200:
 *         description: Translations imported successfully
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/translations/import", authenticateMiddleware, LanguageController.importTranslations);

/**
 * @swagger
 * /translations/publish:
 *   post:
 *     summary: Publish Translation Cache
 *     description: Flush and rebuild localized translation dictionary cache for high-speed client delivery.
 *     tags: [Language]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               langCode:
 *                 type: string
 *                 example: "hi"
 *                 description: Target language code to publish (optional, default all)
 *     responses:
 *       200:
 *         description: Translation cache published successfully
 */
router.post("/translations/publish", authenticateMiddleware, LanguageController.publishTranslations);

export default router;
