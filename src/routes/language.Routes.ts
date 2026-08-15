import { Router } from "express";
import { LanguageController } from "../controllers/language.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Language
 *   description: Multi-language configuration and localization dictionary management
 */

/**
 * @swagger
 * /languages:
 *   get:
 *     summary: List Supported Languages
 *     description: Retrieve list of active system languages for multi-language UI support.
 *     tags: [Language]
 *     responses:
 *       200:
 *         description: List of languages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       code:
 *                         type: string
 *                         example: "en"
 *                       name:
 *                         type: string
 *                         example: "English"
 *                       native_name:
 *                         type: string
 *                         example: "English"
 *                       flag_icon:
 *                         type: string
 *                         example: "🇺🇸"
 *                       direction:
 *                         type: string
 *                         enum: [ltr, rtl]
 *                         example: "ltr"
 *                       is_default:
 *                         type: boolean
 *                         example: true
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *       500:
 *         description: Internal server error
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
 *         description: Translation matrix object retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 matrix:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       group_name:
 *                         type: string
 *                         example: "menu"
 *                       key_name:
 *                         type: string
 *                         example: "Dashboard"
 *                       default_text:
 *                         type: string
 *                         example: "Dashboard"
 *                       translations:
 *                         type: object
 *                         example: { "en": "Dashboard", "ta": "முகப்பு", "hi": "डैशबोर्ड", "ar": "لوحة القيادة" }
 *                 languages:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
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
 *         description: ISO language code
 *     responses:
 *       200:
 *         description: Key-value dictionary object retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 langCode:
 *                   type: string
 *                   example: "hi"
 *                 dictionary:
 *                   type: object
 *                   example: { "Dashboard": "डैशबोर्ड", "Settings": "सेटिंग्स" }
 *       404:
 *         description: Language not found
 *       500:
 *         description: Internal server error
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
 *                 example: "fr"
 *                 description: "**REQUIRED** 2-letter language code"
 *               name:
 *                 type: string
 *                 example: "French"
 *                 description: "**REQUIRED** Language name in English"
 *               native_name:
 *                 type: string
 *                 example: "Français"
 *               flag_icon:
 *                 type: string
 *                 example: "🇫🇷"
 *               direction:
 *                 type: string
 *                 enum: [ltr, rtl]
 *                 default: ltr
 *                 example: "ltr"
 *     responses:
 *       201:
 *         description: Language added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Language created successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Language code already exists or validation failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
 *         example: 2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Tamil"
 *               native_name:
 *                 type: string
 *                 example: "தமிழ்"
 *               flag_icon:
 *                 type: string
 *                 example: "🇮🇳"
 *               direction:
 *                 type: string
 *                 enum: [ltr, rtl]
 *                 example: "ltr"
 *               is_default:
 *                 type: boolean
 *                 example: false
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Language updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Language updated successfully"
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Language not found
 *       500:
 *         description: Internal server error
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
 *             properties:
 *               key_id:
 *                 type: integer
 *                 example: 1
 *               key_name:
 *                 type: string
 *                 example: "menu.dashboard"
 *               group_name:
 *                 type: string
 *                 example: "menu"
 *               default_text:
 *                 type: string
 *                 example: "Dashboard"
 *               translations:
 *                 type: object
 *                 example: { "ta": "முகப்பு", "hi": "डैशबोर्ड" }
 *     responses:
 *       200:
 *         description: Translation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Translation updated successfully"
 *       400:
 *         description: Key required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put("/translations/values", authenticateMiddleware, LanguageController.upsertTranslation);

/**
 * @swagger
 * /translations/import:
 *   post:
 *     summary: Import Translation Dictionary
 *     description: Bulk import translations for a language using a key-value dictionary object.
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
 *               - lang_code
 *               - dictionary
 *             properties:
 *               lang_code:
 *                 type: string
 *                 example: "ta"
 *                 description: "**REQUIRED** ISO language code"
 *               group:
 *                 type: string
 *                 example: "menu"
 *                 description: Optional translation group
 *               dictionary:
 *                 type: object
 *                 example: { "Dashboard": "முகப்பு", "Settings": "அமைப்புகள்" }
 *                 description: "**REQUIRED** Key-value translations"
 *     responses:
 *       200:
 *         description: Translations imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Successfully imported 25 keys for 'ta'"
 *       400:
 *         description: Missing language code or dictionary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
 *     responses:
 *       200:
 *         description: Translation cache published successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Translation cache cleared. All clients will receive updated translations."
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/translations/publish", authenticateMiddleware, LanguageController.publishTranslations);

export default router;
