import * as crypto from "crypto";

/* ==========================================
   OTP GENERATOR (6 DIGITS ONLY)
========================================== */

export const generateOTP = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* ==========================================
   RANDOM STRING
========================================== */

export const generateRandomString = (length = 16): string => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
};

/* ==========================================
   SECURE TOKEN
========================================== */

export const generateToken = (length = 32): string =>
  crypto.randomBytes(length).toString("hex");

/* ==========================================
   PASSWORD GENERATOR
========================================== */

export const generatePassword = (
  length = 12,
  includeSpecial = true
): string => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+-=[]{}";

  let chars = lowercase + uppercase + numbers;

  if (includeSpecial) {
    chars += special;
  }

  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
};

/* ==========================================
   DATE FORMATTER
========================================== */

export const formatDate = (
  date: Date | string | number = new Date(),
  locale = "en-IN",
  timezone = "Asia/Kolkata"
): string => {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
};

/* ==========================================
   DATETIME FORMATTER
========================================== */

export const formatDateTime = (
  date: Date | string | number = new Date(),
  locale = "en-IN",
  timezone = "Asia/Kolkata"
): string => {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
};

/* ==========================================
   FILE SIZE CONVERTER
========================================== */

export const formatFileSize = (bytes = 0): string => {
  if (!bytes || bytes === 0) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
};

/* ==========================================
   PAGINATION HELPER
========================================== */

export const getPagination = (
  page = 1,
  limit = 10
): { page: number; limit: number; offset: number } => {
  page = Number(page);
  limit = Number(limit);

  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
};

export interface PaginationResponse<T = any> {
  data: T;
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const paginationResponse = <T = any>(
  data: T,
  total: number,
  page: number,
  limit: number
): PaginationResponse<T> => {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      totalRecords: total,
      totalPages,
      currentPage: Number(page),
      limit: Number(limit),
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/* ==========================================
   CAPITALIZE
========================================== */

export const capitalize = (text = ""): string => {
  if (!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
};

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T | null;
  errors?: any;
}

export const successResponse = <T = any>(
  message: string,
  data: T | null = null
): ApiResponse<T> => ({
  success: true,
  message,
  data,
});

export const errorResponse = (
  message: string,
  errors: any = null
): ApiResponse<null> => ({
  success: false,
  message,
  errors,
});

export function FirstLetterCapitalize(Name: string): string {
  const lower = Name.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function canBeNumber(value: any): boolean {
  return !isNaN(Number(value));
}
