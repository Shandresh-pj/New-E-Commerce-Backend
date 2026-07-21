import { Router } from "express";
import { LanguageController } from "../controllers/language.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

// Public / Authenticated translation loading
router.get("/languages", LanguageController.getLanguages);
router.get("/translations/matrix", authenticateMiddleware, LanguageController.getTranslationMatrix);
router.get("/translations/:langCode", LanguageController.getDictionary);

// Admin Management
router.post("/languages", authenticateMiddleware, LanguageController.createLanguage);
router.put("/languages/:id", authenticateMiddleware, LanguageController.updateLanguage);

router.put("/translations/values", authenticateMiddleware, LanguageController.upsertTranslation);
router.post("/translations/import", authenticateMiddleware, LanguageController.importTranslations);
router.post("/translations/publish", authenticateMiddleware, LanguageController.publishTranslations);

export default router;
