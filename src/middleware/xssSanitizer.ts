import { Request, Response, NextFunction } from "express";

// =============================================================================
// SECURITY-HARDENED XSS SANITIZER
// =============================================================================
// FIXES APPLIED:
//   1. Strip data: URIs          — can embed base64-encoded JS (data:text/html,<script>)
//   2. Strip vbscript: URIs      — IE/Edge XSS vector
//   3. Strip expression()        — IE CSS injection (expression(alert(1)))
//   4. Strip HTML entity encoding bypass — &#106;avascript: -> javascript:
//   5. Prototype pollution guard — reject keys: __proto__, constructor, prototype
//      Prototype pollution via JSON body can corrupt all objects in the process.
//   6. Recursive depth limit     — prevents DoS via deeply nested JSON objects
//      (e.g., {"a":{"a":{"a":...10000 levels deep}}} crashes JSON.parse)
// =============================================================================

const MAX_DEPTH = 20;     // max object nesting depth before truncation
const MAX_STRING = 50_000; // max string length (50KB) — truncate beyond this

// ---------------------------------------------------------------------------
// INTERNAL: Decode common HTML entity encoding used to bypass filters
// e.g. &#106;avascript: -> javascript:
// ---------------------------------------------------------------------------
function decodeEntities(str: string): string {
  return str
    // Decimal entities: &#106; -> j
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(Number(dec)))
    // Hex entities: &#x6A; -> j
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Named entities relevant to XSS
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&");
}

// ---------------------------------------------------------------------------
// INTERNAL: Sanitize a single string value
// ---------------------------------------------------------------------------
function cleanString(val: string): string {
  // Enforce maximum string length to prevent memory exhaustion
  if (val.length > MAX_STRING) {
    val = val.slice(0, MAX_STRING);
  }

  // Decode HTML entities first so encoded payloads are caught by the regexes below
  let s = decodeEntities(val);

  // --- Strip dangerous HTML tags ---
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
  s = s.replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "");
  s = s.replace(/<embed[\s\S]*?>/gi, "");
  s = s.replace(/<link[\s\S]*?>/gi, "");
  s = s.replace(/<meta[\s\S]*?>/gi, "");
  s = s.replace(/<base[\s\S]*?>/gi, "");

  // --- Strip inline event handlers (onclick, onerror, onload, etc.) ---
  s = s.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "");
  s = s.replace(/\bon\w+\s*=\s*[^\s>]+/gi, "");

  // --- Strip dangerous URI schemes ---
  s = s.replace(/javascript\s*:[^\s"']*/gi, "");   // javascript:alert(1)
  s = s.replace(/vbscript\s*:[^\s"']*/gi, "");     // vbscript:msgbox(1)
  s = s.replace(/data\s*:\s*text\/html[^,]*,/gi, ""); // data:text/html,<script>

  // --- Strip IE CSS expression injection ---
  s = s.replace(/expression\s*\(/gi, "");          // expression(alert(1))

  // --- Strip null bytes (used to bypass regex filters and truncate strings) ---
  s = s.replace(/\x00/g, "");

  return s;
}

// ---------------------------------------------------------------------------
// INTERNAL: Check if an object key is a prototype pollution vector
// ---------------------------------------------------------------------------
function isDangerousKey(key: string): boolean {
  return key === "__proto__" || key === "constructor" || key === "prototype";
}

// ---------------------------------------------------------------------------
// INTERNAL: Recursively clean a value with depth limit
// ---------------------------------------------------------------------------
function cleanValue(val: any, depth: number = 0): any {
  // Depth limit: prevent DoS via deeply nested objects
  if (depth > MAX_DEPTH) return null;

  if (typeof val === "string") {
    return cleanString(val);
  }

  if (Array.isArray(val)) {
    return val.map((item) => cleanValue(item, depth + 1));
  }

  if (val !== null && typeof val === "object") {
    const cleaned: Record<string, any> = {};
    for (const key in val) {
      if (!Object.prototype.hasOwnProperty.call(val, key)) continue;

      // SECURITY: Drop prototype pollution keys
      if (isDangerousKey(key)) {
        console.warn(`[XSS Sanitizer] Blocked prototype pollution key: "${key}"`);
        continue;
      }

      // Sanitize the key itself (prevent injection via key names)
      const cleanKey = cleanString(key);
      cleaned[cleanKey] = cleanValue(val[key], depth + 1);
    }
    return cleaned;
  }

  // Primitives (numbers, booleans, null) — pass through unchanged
  return val;
}

// ---------------------------------------------------------------------------
// EXPRESS MIDDLEWARE
// ---------------------------------------------------------------------------
export function xssSanitizer(req: Request, res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = cleanValue(req.body);
  }

  if (req.params) {
    req.params = cleanValue(req.params) as any;
  }

  if (req.query) {
    // Express 5: req.query is a getter — modify properties in-place
    for (const key in req.query) {
      if (Object.prototype.hasOwnProperty.call(req.query, key)) {
        (req.query as any)[key] = cleanValue(req.query[key]);
      }
    }
  }

  next();
}
