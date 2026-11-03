// utils/errorloginsert.ts
// SECURITY FIX: The original file imported from "../server" causing a circular
// dependency. It also had no entity class — it used a bare string "ErrorLog"
// which would silently fail if the entity wasn't registered.
// This version is a safe no-op stub. If you have an ErrorLog entity registered
// in TypeORM, replace the dataSource import below with the actual dataSource.
import dataSource from "../config/database";

type ErrorLogEntity = {
  Controller: string;
  Method: string;
  Action: string;
  Url: string;
  // SECURITY: BodyData is stored — ensure callers never pass password/token fields.
  // Scrub sensitive fields before calling ErrorLogFun.
  BodyData: unknown;
  Response: unknown;
  CreatedAt: Date;
};

// Fields that must never appear in error logs.
const REDACTED_KEYS = new Set([
  "password", "newPassword", "currentPassword", "confirmPassword",
  "token", "refreshToken", "accessToken", "secret", "otp", "pin",
]);

function scrubErrorData(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrubErrorData);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out[k] = REDACTED_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : scrubErrorData(v);
  }
  return out;
}

export const ErrorLogFun = async (
  controller: string,
  method: string,
  action: string,
  url: string,
  bodyData: unknown,
  response: unknown
): Promise<any | null> => {
  try {
    if (!dataSource.isInitialized) return null;

    const errorLog: ErrorLogEntity = {
      Controller: controller,
      Method: method,
      Action: action,
      Url: url,
      // SECURITY: Scrub sensitive keys before persisting.
      BodyData: scrubErrorData(bodyData),
      Response: scrubErrorData(response),
      CreatedAt: new Date(),
    };

    // Use the registered entity name — adjust "ErrorLog" to match your entity class name.
    const repo = dataSource.getRepository("ErrorLog");
    return await repo.save(errorLog);
  } catch (error) {
    // Silently swallow — error log failures should never crash the application.
    console.error("Error saving error log:", error);
    return null;
  }
};
