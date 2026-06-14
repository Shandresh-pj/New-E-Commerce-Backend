import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

export interface IsFileOptions {
  mime?: string[];
  maxSize?: number;
  required?: boolean;
}

export const FILE_TYPES: Record<string, string[]> = {
  IMAGES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
    "image/avif",
  ],

  VIDEOS: [
    "video/mp4",
    "video/mpeg",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/3gpp",
    "video/ogg",
  ],

  AUDIOS: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/flac",
    "audio/x-wav",
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
    "application/x-zip-compressed",
  ],
};

export function IsFile(
  options: IsFileOptions = {},
  validationOptions?: ValidationOptions
) {
  return function (
    object: object,
    propertyName: string
  ): void {
    registerDecorator({
      name: "IsFile",
      target: object.constructor,
      propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any): boolean {
          // Optional file
          if (!value) {
            return !options.required;
          }

          // Multer file validation
          if (
            typeof value !== "object" ||
            !value.mimetype
          ) {
            return false;
          }

          // MIME validation
          if (
            options.mime &&
            options.mime.length > 0 &&
            !options.mime.includes(value.mimetype)
          ) {
            return false;
          }

          // File size validation
          if (
            options.maxSize &&
            value.size > options.maxSize
          ) {
            return false;
          }

          return true;
        },

        defaultMessage(
          args: ValidationArguments
        ): string {
          const maxSizeMb = options.maxSize
            ? `${(
                options.maxSize /
                (1024 * 1024)
              ).toFixed(2)} MB`
            : "unlimited";

          return `${args.property} is not a valid file. Maximum size allowed: ${maxSizeMb}`;
        },
      },
    });
  };
}