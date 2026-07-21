import { Request, Response } from "express";
import dataSource from "../config/database";
import { Language } from "../entities/language.entity";
import { TranslationKey } from "../entities/translation_key.entity";
import { TranslationValue } from "../entities/translation_value.entity";

const translationCache = new Map<string, { dictionary: Record<string, string>; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

const DEFAULT_LANGUAGES: Array<{
  code: string; name: string; native_name: string; flag_icon: string;
  direction: "ltr" | "rtl"; is_default: boolean; is_active: boolean;
}> = [
  { code: "en", name: "English", native_name: "English", flag_icon: "🇺🇸", direction: "ltr", is_default: true, is_active: true },
  { code: "ta", name: "Tamil", native_name: "தமிழ்", flag_icon: "🇮🇳", direction: "ltr", is_default: false, is_active: true },
  { code: "hi", name: "Hindi", native_name: "हिंदी", flag_icon: "🇮🇳", direction: "ltr", is_default: false, is_active: true },
  { code: "te", name: "Telugu", native_name: "తెలుగు", flag_icon: "🇮🇳", direction: "ltr", is_default: false, is_active: true },
  { code: "ml", name: "Malayalam", native_name: "മലയാളം", flag_icon: "🇮🇳", direction: "ltr", is_default: false, is_active: true },
  { code: "kn", name: "Kannada", native_name: "கன்னட", flag_icon: "🇮🇳", direction: "ltr", is_default: false, is_active: true },
  { code: "ar", name: "Arabic", native_name: "العربية", flag_icon: "🇸🇦", direction: "rtl", is_default: false, is_active: true }
];

const SEED_KEYS = [
  { group: "menu", key: "menu.dashboard", default_text: "Dashboard", ta: "முகப்பு", hi: "டैशबोर्ड", ar: "لوحة القيادة" },
  { group: "menu", key: "menu.profile", default_text: "My Profile", ta: "என் சுயவிவரம்", hi: "मेरी प्रोफ़ाइल", ar: "ملفي الشخصي" },
  { group: "menu", key: "menu.attendance", default_text: "Attendance", ta: "வருகைப் பதிவு", hi: "उपस्थिति", ar: "الحضور" },
  { group: "menu", key: "menu.leave", default_text: "Leave Management", ta: "விடுப்பு மேலாண்மை", hi: "छुट्टी प्रबंधन", ar: "إدارة الإجازات" },
  { group: "menu", key: "menu.payroll", default_text: "Payroll", ta: "சம்பளம்", hi: "पेरोल", ar: "كشف المرتبات" },
  { group: "menu", key: "menu.calendar", default_text: "Company Calendar", ta: "நிறுவன நாட்காட்டி", hi: "कंपनी कैलेंडर", ar: "تقويم الشركة" },
  { group: "menu", key: "menu.documents", default_text: "KYC Documents", ta: "ஆவணங்கள்", hi: "दस्तावेज़", ar: "الوثائق" },
  { group: "common", key: "common.save", default_text: "Save", ta: "சேமி", hi: "சहेजें", ar: "حفظ" },
  { group: "common", key: "common.cancel", default_text: "Cancel", ta: "ரத்து செய்", hi: "रद्द करें", ar: "إلغاء" },
  { group: "common", key: "common.delete", default_text: "Delete", ta: "நீக்கு", hi: "हटाएं", ar: "حذف" },
  { group: "common", key: "common.edit", default_text: "Edit", ta: "திருத்து", hi: "संपादित करें", ar: "تعديل" },
  { group: "common", key: "common.search", default_text: "Search", ta: "தேடு", hi: "खोजें", ar: "بحث" },
  { group: "common", key: "common.status", default_text: "Status", ta: "நிலை", hi: "स्थिति", ar: "الحالة" },
  { group: "auth", key: "auth.login", default_text: "Sign In", ta: "உள்நுழை", hi: "साइन इन करें", ar: "تسجيل الدخول" },
  { group: "auth", key: "auth.logout", default_text: "Log Out", ta: "வெளியேறு", hi: "साइन आउट करें", ar: "تسجيل الخروج" },
  { group: "auth", key: "auth.welcome", default_text: "Welcome Back", ta: "நல்வரவு", hi: "वापसी पर स्वागत है", ar: "مرحباً بعودتك" },
];

export class LanguageController {
  private static get langRepo() { return dataSource.getRepository(Language); }
  private static get keyRepo() { return dataSource.getRepository(TranslationKey); }
  private static get valRepo() { return dataSource.getRepository(TranslationValue); }

  private static async ensureTablesExist(): Promise<void> {
    try {
      await dataSource.query("SELECT 1 FROM translation_keys LIMIT 1;");
    } catch {
      // Table missing — synchronize DB schema dynamically
      try {
        await dataSource.synchronize();
        await LanguageController.seedDefaultTranslations();
      } catch (err) {
        console.warn("[LanguageController.ensureTablesExist] Synchronize warning:", err);
      }
    }
  }

  static async getLanguages(req: Request, res: Response): Promise<void> {
    try {
      await LanguageController.ensureTablesExist();
      let languages = await LanguageController.langRepo.find({ order: { is_default: "DESC", name: "ASC" } });
      if (languages.length === 0) {
        await LanguageController.langRepo.save(DEFAULT_LANGUAGES);
        languages = await LanguageController.langRepo.find({ order: { is_default: "DESC", name: "ASC" } });
        await LanguageController.seedDefaultTranslations();
      }
      res.json({ success: true, data: languages });
    } catch (error: any) {
      console.error("[LanguageController.getLanguages]", error);
      res.json({ success: true, data: DEFAULT_LANGUAGES });
    }
  }

  static async createLanguage(req: Request, res: Response): Promise<void> {
    try {
      const { code, name, native_name, flag_icon, direction } = req.body;
      if (!code || !name) {
        res.status(400).json({ success: false, message: "Language code and name are required" });
        return;
      }
      const codeStr = String(code).toLowerCase();
      const existing = await LanguageController.langRepo.findOne({ where: { code: codeStr } });
      if (existing) {
        res.status(400).json({ success: false, message: `Language code '${codeStr}' already exists` });
        return;
      }
      const lang = LanguageController.langRepo.create({
        code: codeStr,
        name: String(name),
        native_name: String(native_name || name),
        flag_icon: String(flag_icon || "🌐"),
        direction: direction === "rtl" ? "rtl" : "ltr",
        is_active: true
      });
      await LanguageController.langRepo.save(lang);
      translationCache.clear();
      res.json({ success: true, message: "Language created successfully", data: lang });
    } catch (error: any) {
      console.error("[LanguageController.createLanguage]", error);
      res.status(500).json({ success: false, message: "Failed to create language" });
    }
  }

  static async updateLanguage(req: Request, res: Response): Promise<void> {
    try {
      const idStr = String(req.params.id);
      const id = parseInt(idStr, 10);
      const lang = await LanguageController.langRepo.findOne({ where: { id } });
      if (!lang) {
        res.status(404).json({ success: false, message: "Language not found" });
        return;
      }
      const { name, native_name, flag_icon, direction, is_active, is_default } = req.body;
      if (name !== undefined) lang.name = String(name);
      if (native_name !== undefined) lang.native_name = String(native_name);
      if (flag_icon !== undefined) lang.flag_icon = String(flag_icon);
      if (direction !== undefined) lang.direction = direction === "rtl" ? "rtl" : "ltr";
      if (is_active !== undefined) lang.is_active = Boolean(is_active);
      if (is_default === true) {
        await LanguageController.langRepo.update({}, { is_default: false });
        lang.is_default = true;
      }
      await LanguageController.langRepo.save(lang);
      translationCache.clear();
      res.json({ success: true, message: "Language updated successfully", data: lang });
    } catch (error: any) {
      console.error("[LanguageController.updateLanguage]", error);
      res.status(500).json({ success: false, message: "Failed to update language" });
    }
  }

  static async getDictionary(req: Request, res: Response): Promise<void> {
    const langParam = req.params.langCode || "en";
    const langCode = String(langParam).toLowerCase();

    try {
      const companyId = (req as any).user?.company_id ? parseInt(String((req as any).user.company_id), 10) : undefined;
      const cacheKey = `${langCode}_company_${companyId || 0}`;

      const cached = translationCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        res.json({ success: true, langCode, dictionary: cached.dictionary });
        return;
      }

      await LanguageController.ensureTablesExist();

      let keys = await LanguageController.keyRepo.find();
      if (keys.length === 0) {
        await LanguageController.seedDefaultTranslations();
        keys = await LanguageController.keyRepo.find();
      }

      const values = await LanguageController.valRepo.find({
        where: [
          { language_code: langCode },
          { language_code: "en" }
        ],
        relations: { translation_key: true }
      });

      const dictionary: Record<string, string> = {};

      keys.forEach((k: TranslationKey) => {
        dictionary[k.key_name] = k.default_text;
      });

      values.filter((v: TranslationValue) => v.language_code === "en").forEach((v: TranslationValue) => {
        if (v.translation_key?.key_name) {
          dictionary[v.translation_key.key_name] = v.translation_text;
        }
      });

      values.filter((v: TranslationValue) => v.language_code === langCode && !v.company_id).forEach((v: TranslationValue) => {
        if (v.translation_key?.key_name && v.translation_text) {
          dictionary[v.translation_key.key_name] = v.translation_text;
        }
      });

      if (companyId) {
        values.filter((v: TranslationValue) => v.language_code === langCode && v.company_id === companyId).forEach((v: TranslationValue) => {
          if (v.translation_key?.key_name && v.translation_text) {
            dictionary[v.translation_key.key_name] = v.translation_text;
          }
        });
      }

      translationCache.set(cacheKey, { dictionary, timestamp: Date.now() });
      res.json({ success: true, langCode, dictionary });
    } catch (error: any) {
      console.error("[LanguageController.getDictionary]", error);
      // Fallback dictionary map if DB query fails
      const fallbackDict: Record<string, string> = {};
      SEED_KEYS.forEach(item => {
        fallbackDict[item.key] = (item as any)[langCode] || item.default_text;
      });
      res.json({ success: true, langCode, dictionary: fallbackDict });
    }
  }

  static async getTranslationMatrix(req: Request, res: Response): Promise<void> {
    try {
      await LanguageController.ensureTablesExist();
      const keys = await LanguageController.keyRepo.find({ order: { group_name: "ASC", key_name: "ASC" } });
      const values = await LanguageController.valRepo.find();
      const languages = await LanguageController.langRepo.find({ where: { is_active: true } });

      const valueMap = new Map<string, string>();
      values.forEach((v: TranslationValue) => {
        valueMap.set(`${v.key_id}_${v.language_code}_${v.company_id || 0}`, v.translation_text);
      });

      const matrix = keys.map((k: TranslationKey) => {
        const item: any = {
          id: k.id,
          group_name: k.group_name,
          key_name: k.key_name,
          default_text: k.default_text,
          translations: {}
        };
        languages.forEach((l: Language) => {
          item.translations[l.code] = valueMap.get(`${k.id}_${l.code}_0`) || (l.code === "en" ? k.default_text : "");
        });
        return item;
      });

      res.json({ success: true, matrix, languages });
    } catch (error: any) {
      console.error("[LanguageController.getTranslationMatrix]", error);
      res.status(500).json({ success: false, message: "Failed to fetch translation matrix" });
    }
  }

  static async upsertTranslation(req: Request, res: Response): Promise<void> {
    try {
      const { key_id, key_name, group_name, default_text, translations } = req.body;

      let keyRecord: TranslationKey | null = null;
      if (key_id) {
        keyRecord = await LanguageController.keyRepo.findOne({ where: { id: parseInt(String(key_id), 10) } });
      }
      if (!keyRecord && key_name) {
        keyRecord = await LanguageController.keyRepo.findOne({ where: { key_name: String(key_name) } });
      }
      if (!keyRecord && key_name) {
        keyRecord = LanguageController.keyRepo.create({
          group_name: group_name ? String(group_name) : "custom",
          key_name: String(key_name),
          default_text: default_text ? String(default_text) : String(key_name)
        });
        await LanguageController.keyRepo.save(keyRecord);
      }
      if (!keyRecord) {
        res.status(400).json({ success: false, message: "Key required" });
        return;
      }

      if (default_text) {
        keyRecord.default_text = String(default_text);
        if (group_name) keyRecord.group_name = String(group_name);
        await LanguageController.keyRepo.save(keyRecord);
      }

      if (translations && typeof translations === "object") {
        for (const [langCode, text] of Object.entries(translations)) {
          let val = await LanguageController.valRepo.findOne({
            where: { key_id: keyRecord.id, language_code: langCode.toLowerCase() }
          });
          if (val) {
            val.translation_text = String(text);
          } else {
            val = LanguageController.valRepo.create({
              key_id: keyRecord.id,
              language_code: langCode.toLowerCase(),
              translation_text: String(text)
            });
          }
          await LanguageController.valRepo.save(val);
        }
      }

      translationCache.clear();
      res.json({ success: true, message: "Translation updated successfully" });
    } catch (error: any) {
      console.error("[LanguageController.upsertTranslation]", error);
      res.status(500).json({ success: false, message: "Failed to update translation" });
    }
  }

  static async importTranslations(req: Request, res: Response): Promise<void> {
    try {
      const { lang_code, dictionary, group } = req.body;
      if (!lang_code || !dictionary || typeof dictionary !== "object") {
        res.status(400).json({ success: false, message: "Language code and dictionary object are required" });
        return;
      }
      const groupName = group ? String(group) : "imported";
      const codeStr = String(lang_code).toLowerCase();

      for (const [keyName, text] of Object.entries(dictionary)) {
        let keyRec = await LanguageController.keyRepo.findOne({ where: { key_name: keyName } });
        if (!keyRec) {
          keyRec = LanguageController.keyRepo.create({
            group_name: groupName,
            key_name: keyName,
            default_text: String(text)
          });
          await LanguageController.keyRepo.save(keyRec);
        }

        let valRec = await LanguageController.valRepo.findOne({
          where: { key_id: keyRec.id, language_code: codeStr }
        });
        if (valRec) {
          valRec.translation_text = String(text);
        } else {
          valRec = LanguageController.valRepo.create({
            key_id: keyRec.id,
            language_code: codeStr,
            translation_text: String(text)
          });
        }
        await LanguageController.valRepo.save(valRec);
      }

      translationCache.clear();
      res.json({ success: true, message: `Successfully imported ${Object.keys(dictionary).length} keys for '${codeStr}'` });
    } catch (error: any) {
      console.error("[LanguageController.importTranslations]", error);
      res.status(500).json({ success: false, message: "Import failed" });
    }
  }

  static async publishTranslations(req: Request, res: Response): Promise<void> {
    translationCache.clear();
    res.json({ success: true, message: "Translation cache cleared. All clients will receive updated translations." });
  }

  private static async seedDefaultTranslations(): Promise<void> {
    for (const item of SEED_KEYS) {
      let k = await LanguageController.keyRepo.findOne({ where: { key_name: item.key } });
      if (!k) {
        k = LanguageController.keyRepo.create({
          group_name: item.group,
          key_name: item.key,
          default_text: item.default_text
        });
        await LanguageController.keyRepo.save(k);
      }

      for (const lang of ["ta", "hi", "ar"]) {
        const text = (item as any)[lang];
        if (text) {
          let v = await LanguageController.valRepo.findOne({ where: { key_id: k.id, language_code: lang } });
          if (!v) {
            v = LanguageController.valRepo.create({ key_id: k.id, language_code: lang, translation_text: text });
            await LanguageController.valRepo.save(v);
          }
        }
      }
    }
  }
}
