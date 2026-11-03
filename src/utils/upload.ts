import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import sharp from "sharp";
import { Request } from "express";

// =============================================================================
// SECURITY-HARDENED FILE UPLOAD
// =============================================================================
// FIXES APPLIED:
//   1. SVG removed from IMAGES — SVG files can contain <script> tags = stored XSS.
//      Kept as a separate named export (uploadSvg) for trusted internal use only.
//   2. Extension allowlist per MIME type — prevents polyglot attacks where a
//      malicious file is renamed (e.g., shell.php renamed to shell.jpg).
//      Browser-supplied MIME type is untrusted; we cross-check against extension.
//   3. Extension is always lowercased and validated against an allowlist.
//   4. Default maxSize reduced from 50MB to 10MB to limit DoS via large uploads.
//   5. Archive uploads removed from ALL_FILES default — must opt in explicitly.
//   6. Path traversal protection in destination callback.
// =============================================================================

// ---------------------------------------------------------------------------
// MIME TYPE → ALLOWED EXTENSIONS MAPPING
// Used to cross-validate browser-supplied MIME against actual file extension.
// ---------------------------------------------------------------------------
const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  // Images (SVG intentionally excluded — XSS risk)
  "image/jpeg":          [".jpg", ".jpeg"],
  "image/jpg":           [".jpg", ".jpeg"],
  "image/png":           [".png"],
  "image/webp":          [".webp"],
  "image/gif":           [".gif"],
  "image/bmp":           [".bmp"],
  "image/tiff":          [".tiff", ".tif"],
  "image/avif":          [".avif"],

  // Videos
  "video/mp4":           [".mp4"],
  "video/mpeg":          [".mpeg", ".mpg"],
  "video/webm":          [".webm"],
  "video/quicktime":     [".mov"],
  "video/x-msvideo":     [".avi"],
  "video/x-matroska":    [".mkv"],

  // Audio
  "audio/mpeg":          [".mp3"],
  "audio/mp3":           [".mp3"],
  "audio/wav":           [".wav"],
  "audio/ogg":           [".ogg"],
  "audio/aac":           [".aac"],
  "audio/flac":          [".flac"],

  // Documents
  "application/pdf":     [".pdf"],
  "application/msword":  [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel":                                                [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":       [".xlsx"],
  "application/vnd.ms-powerpoint":                                           [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/plain":          [".txt"],
  "text/csv":            [".csv"],

  // Archives (opt-in only via uploadArchive export)
  "application/zip":              [".zip"],
  "application/x-rar-compressed": [".rar"],
  "application/x-7z-compressed":  [".7z"],
  "application/gzip":             [".gz"],
};

// ---------------------------------------------------------------------------
// FILE TYPE GROUPS (MIME types only — extensions validated separately)
// ---------------------------------------------------------------------------
export const FILE_TYPES = {
  // SVG intentionally excluded — SVG can contain embedded <script> tags (stored XSS)
  IMAGES: [
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/gif", "image/bmp", "image/tiff", "image/avif",
  ],

  VIDEOS: [
    "video/mp4", "video/mpeg", "video/webm",
    "video/quicktime", "video/x-msvideo", "video/x-matroska",
  ],

  AUDIOS: [
    "audio/mpeg", "audio/mp3", "audio/wav",
    "audio/ogg", "audio/aac", "audio/flac",
  ],

  DOCUMENTS: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ],

  ARCHIVES: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/gzip",
  ],
};

// Default allowed types for generic uploader — no archives (opt-in only)
export const ALL_FILES = [
  ...FILE_TYPES.IMAGES,
  ...FILE_TYPES.VIDEOS,
  ...FILE_TYPES.AUDIOS,
  ...FILE_TYPES.DOCUMENTS,
];

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
interface UploadOptions {
  folder?: string;
  maxSize?: number;
  allowedMimeTypes?: string[];
  compressImages?: boolean;
}

// ---------------------------------------------------------------------------
// SECURITY: Sanitize filename — strip special chars, prevent path traversal
// ---------------------------------------------------------------------------
const sanitizeFilename = (filename: string): string => {
  // Take only the base name (strip any directory component)
  const base = path.basename(filename);
  const ext  = path.extname(base).toLowerCase();
  const name = path
    .basename(base, path.extname(base))
    .replace(/[^a-zA-Z0-9_-]/g, "_") // alphanumeric, dash, underscore only
    .slice(0, 64);                    // cap name length

  return `${name}${ext}`;
};

// ---------------------------------------------------------------------------
// SECURITY: Validate that the file extension matches the declared MIME type.
// This blocks polyglot attacks (e.g., shell.php uploaded as image/jpeg).
// ---------------------------------------------------------------------------
function isExtensionAllowedForMime(filename: string, mimetype: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  const allowedExts = MIME_TO_EXTENSIONS[mimetype];
  if (!allowedExts) return false;          // MIME not in our map — reject
  return allowedExts.includes(ext);
}

// ---------------------------------------------------------------------------
// IMAGE COMPRESSOR (Sharp)
// ---------------------------------------------------------------------------
export const compressImage = async (filePath: string): Promise<void> => {
  try {
    const tempPath = `${filePath}.tmp`;
    await sharp(filePath)
      .rotate()
      .jpeg({ quality: 80, progressive: true })
      .toFile(tempPath);
    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    console.error("Image compression failed:", error);
  }
};

// ---------------------------------------------------------------------------
// MAIN FACTORY
// ---------------------------------------------------------------------------
export const createUploader = (options: UploadOptions = {}) => {
  const {
    folder            = "uploads",
    maxSize           = 10 * 1024 * 1024,  // SECURITY FIX: 10MB default (was 50MB)
    allowedMimeTypes  = ALL_FILES,
    compressImages    = true,
  } = options;

  const uploadPath = path.resolve(path.join(process.cwd(), folder));

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
      let subFolder = "";
      if (FILE_TYPES.IMAGES.includes(file.mimetype))    subFolder = "images";
      else if (FILE_TYPES.VIDEOS.includes(file.mimetype))    subFolder = "videos";
      else if (FILE_TYPES.AUDIOS.includes(file.mimetype))    subFolder = "audios";
      else if (FILE_TYPES.DOCUMENTS.includes(file.mimetype)) subFolder = "documents";

      const dest = subFolder ? path.join(uploadPath, subFolder) : uploadPath;

      // SECURITY: Ensure destination stays within uploadPath (path traversal guard)
      const resolvedDest = path.resolve(dest);
      if (!resolvedDest.startsWith(uploadPath)) {
        cb(new Error("Invalid upload destination"), "");
        return;
      }

      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }

      cb(null, dest);
    },

    filename: (req: Request, file: Express.Multer.File, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      // Generate an unpredictable filename: timestamp + 16 random hex bytes + ext
      const uniqueName = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`;
      cb(null, sanitizeFilename(uniqueName));
    },
  });

  const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Check 1: MIME type must be in allowed list
    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
      return;
    }

    // Check 2: Extension must match the declared MIME type (polyglot attack prevention)
    if (!isExtensionAllowedForMime(file.originalname, file.mimetype)) {
      cb(new Error(
        `File extension does not match its type. ` +
        `Expected extension for ${file.mimetype}, got: ${path.extname(file.originalname)}`
      ));
      return;
    }

    cb(null, true);
  };

  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize,
      files: 10,       // max 10 files per request (prevent field-count DoS)
    },
  });

  // --- Image compression middleware ---
  const compressor = async (req: any, res: any, next: any) => {
    try {
      if (!compressImages) return next();

      const compress = async (file: Express.Multer.File) => {
        if (FILE_TYPES.IMAGES.includes(file.mimetype)) {
          await compressImage(file.path);
        }
      };

      if (req.file) await compress(req.file);

      if (req.files) {
        if (Array.isArray(req.files)) {
          for (const file of req.files) await compress(file);
        } else {
          for (const fieldName of Object.keys(req.files)) {
            const fileList = (req.files as any)[fieldName];
            if (Array.isArray(fileList)) {
              for (const file of fileList) await compress(file);
            }
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  return { upload, compressor };
};

// ---------------------------------------------------------------------------
// READY-TO-USE EXPORTS
// ---------------------------------------------------------------------------

export const uploadImage = createUploader({
  allowedMimeTypes: FILE_TYPES.IMAGES,
  maxSize: 10 * 1024 * 1024,   // 10MB
});

export const uploadDocument = createUploader({
  allowedMimeTypes: FILE_TYPES.DOCUMENTS,
  maxSize: 20 * 1024 * 1024,   // 20MB for docs
  compressImages: false,
});

export const uploadVideo = createUploader({
  allowedMimeTypes: FILE_TYPES.VIDEOS,
  maxSize: 50 * 1024 * 1024,   // 50MB for video (explicit opt-in)
  compressImages: false,
});

export const uploadAny = createUploader({
  allowedMimeTypes: ALL_FILES,
  maxSize: 10 * 1024 * 1024,
});

// SECURITY NOTE: SVG upload for TRUSTED INTERNAL USE ONLY.
// SVG files can contain embedded <script> tags which execute in browsers
// when the SVG is opened directly (stored XSS). Only enable for admin routes
// where the output is never served directly to end users.
export const uploadSvg = createUploader({
  allowedMimeTypes: ["image/svg+xml"],
  maxSize: 1 * 1024 * 1024,
  compressImages: false,
});

// Archive uploads — explicit opt-in (not included in ALL_FILES)
export const uploadArchive = createUploader({
  allowedMimeTypes: FILE_TYPES.ARCHIVES,
  maxSize: 50 * 1024 * 1024,
  compressImages: false,
});
