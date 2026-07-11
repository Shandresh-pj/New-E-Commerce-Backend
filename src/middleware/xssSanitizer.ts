import { Request, Response, NextFunction } from "express";

function cleanValue(val: any): any {
  if (typeof val === "string") {
    // Escapes common HTML tags and strips dangerous script tags/JS URIs
    return val
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
      .replace(/javascript:[^\s"']*/gi, "")
      .replace(/<[^>]*>/g, ""); // Strip other raw HTML tags
  }
  if (Array.isArray(val)) {
    return val.map(cleanValue);
  }
  if (val !== null && typeof val === "object") {
    const cleaned: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        cleaned[key] = cleanValue(val[key]);
      }
    }
    return cleaned;
  }
  return val;
}

export function xssSanitizer(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = cleanValue(req.body);
  }
  if (req.params) {
    req.params = cleanValue(req.params);
  }
  if (req.query) {
    // In Express 5, req.query is a getter. Modify properties in-place to avoid re-assignment error.
    for (const key in req.query) {
      if (Object.prototype.hasOwnProperty.call(req.query, key)) {
        req.query[key] = cleanValue(req.query[key]);
      }
    }
  }
  next();
}
