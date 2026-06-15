import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import sharp from "sharp";
import { Request } from "express";

// =====================================================
// FILE TYPES
// =====================================================

export const FILE_TYPES = {
  IMAGES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/avif",
    "image/svg+xml",
  ],

  VIDEOS: [
    "video/mp4",
    "video/mpeg",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
  ],

  AUDIOS: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/flac",
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

export const ALL_FILES = [
  ...FILE_TYPES.IMAGES,
  ...FILE_TYPES.VIDEOS,
  ...FILE_TYPES.AUDIOS,
  ...FILE_TYPES.DOCUMENTS,
  ...FILE_TYPES.ARCHIVES,
];

// =====================================================
// TYPES
// =====================================================

interface UploadOptions {
  folder?: string;
  maxSize?: number;
  allowedMimeTypes?: string[];
  compressImages?: boolean;
}

// =====================================================
// HELPERS
// =====================================================

const sanitizeFilename = (filename: string): string => {
  const ext = path.extname(filename);
  const name = path
    .basename(filename, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  return `${name}${ext}`;
};

// =====================================================
// IMAGE COMPRESSOR
// =====================================================

export const compressImage = async (
  filePath: string
): Promise<void> => {
  try {
    const tempPath = `${filePath}.tmp`;

    await sharp(filePath)
      .rotate()
      .jpeg({
        quality: 80,
        mozjpeg: true,
      })
      .toFile(tempPath);

    fs.unlinkSync(filePath);

    fs.renameSync(tempPath, filePath);
  } catch (error) {
    console.error("Image compression failed:", error);
  }
};

// =====================================================
// MAIN FACTORY
// =====================================================

export const createUploader = (
  options: UploadOptions = {}
) => {
  const {
    folder = "uploads",
    maxSize = 50 * 1024 * 1024,
    allowedMimeTypes = ALL_FILES,
    compressImages = true,
  } = options;

  const uploadPath = path.join(process.cwd(), folder);

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (
      req: Request,
      file: Express.Multer.File,
      cb
    ) => {
      let subFolder = "";
      if (FILE_TYPES.IMAGES.includes(file.mimetype)) subFolder = "images";
      else if (FILE_TYPES.VIDEOS.includes(file.mimetype)) subFolder = "videos";
      else if (FILE_TYPES.AUDIOS.includes(file.mimetype)) subFolder = "audios";
      else if (FILE_TYPES.DOCUMENTS.includes(file.mimetype)) subFolder = "documents";

      const dest = subFolder
        ? path.join(uploadPath, subFolder)
        : uploadPath;

      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }

      cb(null, dest);
    },

    filename: (
      req: Request,
      file: Express.Multer.File,
      cb
    ) => {
      const ext = path.extname(file.originalname);

      const uniqueName =
        Date.now() +
        "-" +
        crypto.randomBytes(8).toString("hex") +
        ext;

      cb(null, sanitizeFilename(uniqueName));
    },
  });

  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File type not allowed: ${file.mimetype}`
        )
      );
    }
  };

  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize,
    },
  });

  // =====================================================
  // COMPRESS MIDDLEWARE
  // =====================================================

  const compressor = async (
    req: any,
    res: any,
    next: any
  ) => {
    try {
      if (!compressImages) {
        return next();
      }

      if (req.file) {
        if (
          FILE_TYPES.IMAGES.includes(
            req.file.mimetype
          )
        ) {
          await compressImage(req.file.path);
        }
      }

      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          if (
            FILE_TYPES.IMAGES.includes(
              file.mimetype
            )
          ) {
            await compressImage(file.path);
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  return {
    upload,
    compressor,
  };
};

// =====================================================
// READY TO USE EXPORTS
// =====================================================

export const uploadImage = createUploader({
  allowedMimeTypes: FILE_TYPES.IMAGES,
  maxSize: 10 * 1024 * 1024,
});

export const uploadDocument = createUploader({
  allowedMimeTypes: FILE_TYPES.DOCUMENTS,
});

export const uploadVideo = createUploader({
  allowedMimeTypes: FILE_TYPES.VIDEOS,
  maxSize: 50 * 1024 * 1024,
  compressImages: false,
});

export const uploadAny = createUploader({
  allowedMimeTypes: ALL_FILES,
});